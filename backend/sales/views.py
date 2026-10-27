from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db import transaction
from django.db.models import Q, Sum, Count
from django.utils import timezone
from customers.models import Customer
from products.models import Product
from shifts.models import Shift, EmployeeShift
from inventory.models import InventoryTransaction
from .models import Sale, SaleItem, CreditBill, CreditPayment
from .serializers import (
    SaleSerializer, SaleListSerializer, SaleCreateSerializer,
    CreditBillListSerializer, CreditBillDetailSerializer,
    CreditPaymentSerializer, CreditPaymentCreateSerializer
)
from accounts.permissions import IsOwner, IsOwnerOrEmployee


class SaleListView(generics.ListAPIView):
    serializer_class = SaleListSerializer
    permission_classes = [IsOwnerOrEmployee]

    def get_queryset(self):
        queryset = Sale.objects.select_related('customer', 'employee', 'shift', 'credit_record').prefetch_related('items__product')
        user = self.request.user

        if not user.is_owner:
            queryset = queryset.filter(employee=user)

        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')
        customer_id = self.request.query_params.get('customer')
        shift_id = self.request.query_params.get('shift')
        employee_id = self.request.query_params.get('employee')
        payment_method = self.request.query_params.get('payment_method')
        bill_number = self.request.query_params.get('bill_number')
        status_filter = self.request.query_params.get('status')

        if date_from:
            queryset = queryset.filter(created_at__date__gte=date_from)
        if date_to:
            queryset = queryset.filter(created_at__date__lte=date_to)
        if customer_id:
            queryset = queryset.filter(customer_id=customer_id)
        if shift_id:
            queryset = queryset.filter(shift_id=shift_id)
        if employee_id and user.is_owner:
            queryset = queryset.filter(employee_id=employee_id)
        if payment_method:
            if payment_method == 'ONLINE':
                queryset = queryset.filter(payment_method__in=['ONLINE', 'UPI'])
            else:
                queryset = queryset.filter(payment_method=payment_method)
        if bill_number:
            queryset = queryset.filter(bill_number__icontains=bill_number)
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        return queryset.order_by('-created_at')


class SaleCreateView(APIView):
    permission_classes = [IsOwnerOrEmployee]

    @transaction.atomic
    def post(self, request):
        serializer = SaleCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        items_data = data['items']

        if not items_data:
            return Response({'detail': 'At least one item is required.'}, status=status.HTTP_400_BAD_REQUEST)

        customer = get_object_or_404(Customer, pk=data['customer'])

        employee_shift_id = data.get('employee_shift')
        employee_shift = None
        if employee_shift_id:
            employee_shift = EmployeeShift.objects.filter(pk=employee_shift_id).first()

        today = timezone.localdate()
        if not employee_shift:
            employee_shift = EmployeeShift.objects.filter(
                employee=request.user, date=today, status='OPEN'
            ).first() or EmployeeShift.objects.filter(
                date=today, status='OPEN'
            ).first()

        shift_id = data.get('shift')
        shift = None
        if shift_id:
            shift = Shift.objects.filter(pk=shift_id).first()
        if not shift:
            if employee_shift:
                shift = employee_shift.shift
            else:
                shift = Shift.objects.filter(is_active=True).first()
                if not shift:
                    shift = Shift.objects.create(name='General Shift', start_time='06:00:00', end_time='22:00:00')

        # Validate stock
        for item_data in items_data:
            product = get_object_or_404(Product, pk=item_data['product'])
            if product.stock_quantity < item_data['quantity']:
                return Response(
                    {'detail': f'Only {product.stock_quantity} units of {product.name} available.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        # Calculate totals
        subtotal = sum(item['quantity'] * item['unit_price'] for item in items_data)
        discount = data.get('discount', 0)
        total = subtotal - discount

        payment_method = data.get('payment_method', 'CASH')
        if payment_method == 'UPI':
            payment_method = 'ONLINE'

        sale = Sale.objects.create(
            customer=customer,
            employee=request.user,
            shift=shift,
            employee_shift=employee_shift,
            subtotal=subtotal,
            discount=discount,
            total=total,
            payment_method=payment_method,
            notes=data.get('notes', ''),
        )

        for item_data in items_data:
            product = Product.objects.get(pk=item_data['product'])
            SaleItem.objects.create(
                sale=sale,
                product=product,
                quantity=item_data['quantity'],
                unit_price=item_data['unit_price'],
            )
            # Reduce stock immediately
            previous_stock = product.stock_quantity
            new_stock = previous_stock - item_data['quantity']
            product.stock_quantity = new_stock
            product.save(update_fields=['stock_quantity'])

            InventoryTransaction.objects.create(
                product=product,
                transaction_type='SALE',
                quantity=-item_data['quantity'],
                previous_stock=previous_stock,
                new_stock=new_stock,
                reference_sale=sale.bill_number,
                reason=f'Sale {sale.bill_number}',
                created_by=request.user,
                shift=sale.shift,
                employee_shift=sale.employee_shift,
            )

        # If Credit, immediately create CreditBill receivable record
        if sale.payment_method == 'CREDIT':
            CreditBill.objects.create(
                sale=sale,
                customer=customer,
                employee=request.user,
                shift=shift,
                employee_shift=employee_shift,
                original_amount=total,
                amount_paid=0,
                outstanding_amount=total,
                status='PENDING',
                notes=data.get('notes', ''),
            )

        result_serializer = SaleSerializer(sale)
        return Response(result_serializer.data, status=status.HTTP_201_CREATED)


class SaleDetailView(generics.RetrieveAPIView):
    serializer_class = SaleSerializer
    permission_classes = [IsOwnerOrEmployee]

    def get_queryset(self):
        if self.request.user.is_owner:
            return Sale.objects.all()
        return Sale.objects.filter(employee=self.request.user)

    def get_object(self):
        queryset = self.get_queryset()
        return get_object_or_404(
            queryset.select_related('customer', 'employee', 'shift', 'credit_record').prefetch_related('items__product'),
            pk=self.kwargs['pk']
        )


class SaleCancelView(APIView):
    permission_classes = [IsOwner]

    @transaction.atomic
    def post(self, request, pk):
        sale = get_object_or_404(Sale, pk=pk)
        if sale.status != 'COMPLETED':
            return Response({'detail': 'Only completed sales can be cancelled.'}, status=status.HTTP_400_BAD_REQUEST)

        # Check credit bill if any
        if hasattr(sale, 'credit_record'):
            cr = sale.credit_record
            if cr.amount_paid > 0:
                return Response(
                    {'detail': 'Cannot cancel a credit sale that already has payments recorded.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            cr.status = 'CANCELLED'
            cr.outstanding_amount = 0
            cr.save(update_fields=['status', 'outstanding_amount'])

        sale.status = 'CANCELLED'
        sale.save(update_fields=['status'])

        # Restore stock
        for item in sale.items.select_related('product'):
            product = item.product
            previous_stock = product.stock_quantity
            new_stock = previous_stock + item.quantity
            product.stock_quantity = new_stock
            product.save(update_fields=['stock_quantity'])

            InventoryTransaction.objects.create(
                product=product,
                transaction_type='RETURN',
                quantity=item.quantity,
                previous_stock=previous_stock,
                new_stock=new_stock,
                reference_sale=sale.bill_number,
                reason=f'Cancellation of {sale.bill_number}',
                created_by=request.user
            )

        return Response({'detail': 'Sale cancelled and stock restored.'})


class CustomerSalesView(generics.ListAPIView):
    serializer_class = SaleListSerializer
    permission_classes = [IsOwnerOrEmployee]

    def get_queryset(self):
        customer_id = self.kwargs['customer_id']
        return Sale.objects.filter(
            customer_id=customer_id
        ).select_related('customer', 'employee', 'shift', 'credit_record').order_by('-created_at')


# ============================================================
# CREDIT & RECEIVABLES VIEWS
# ============================================================

class CreditSummaryView(APIView):
    permission_classes = [IsOwnerOrEmployee]

    def get(self, request):
        today = timezone.localdate()
        active_bills = CreditBill.objects.exclude(status__in=['PAID', 'CANCELLED'])

        employee_id = request.query_params.get('employee') or request.query_params.get('employee_id')
        date_param = request.query_params.get('date')
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')

        if employee_id:
            active_bills = active_bills.filter(employee_id=employee_id)

        total_outstanding = active_bills.aggregate(sum=Sum('outstanding_amount'))['sum'] or 0
        pending_bills_count = active_bills.count()
        customers_count = active_bills.values('customer').distinct().count()

        if date_param:
            today_credit = CreditBill.objects.filter(created_at__date=date_param).exclude(status='CANCELLED')
            today_payments = CreditPayment.objects.filter(created_at__date=date_param)
        elif date_from or date_to:
            today_credit = CreditBill.objects.exclude(status='CANCELLED')
            today_payments = CreditPayment.objects.all()
            if date_from:
                today_credit = today_credit.filter(created_at__date__gte=date_from)
                today_payments = today_payments.filter(created_at__date__gte=date_from)
            if date_to:
                today_credit = today_credit.filter(created_at__date__lte=date_to)
                today_payments = today_payments.filter(created_at__date__lte=date_to)
        else:
            today_credit = CreditBill.objects.filter(created_at__date=today).exclude(status='CANCELLED')
            today_payments = CreditPayment.objects.filter(created_at__date=today)

        if employee_id:
            today_credit = today_credit.filter(employee_id=employee_id)
            today_payments = today_payments.filter(employee_id=employee_id)

        credit_given_today = today_credit.aggregate(sum=Sum('original_amount'))['sum'] or 0
        collected_today = today_payments.aggregate(sum=Sum('amount'))['sum'] or 0

        # Detailed list answering: Who gave credit, to which customer, for which bill, when, and how much?
        emp_credits = CreditBill.objects.select_related('employee', 'customer', 'sale', 'shift').exclude(status='CANCELLED').order_by('-created_at')
        if employee_id:
            emp_credits = emp_credits.filter(employee_id=employee_id)
        if date_param:
            emp_credits = emp_credits.filter(created_at__date=date_param)
        elif date_from:
            emp_credits = emp_credits.filter(created_at__date__gte=date_from)
        if date_to:
            emp_credits = emp_credits.filter(created_at__date__lte=date_to)
        emp_credits = emp_credits[:40]
        emp_credits_data = [{
            'id': c.id,
            'employee_name': c.employee.full_name or c.employee.username,
            'customer_name': c.customer.name,
            'customer_code': c.customer.customer_code,
            'customer_phone': c.customer.phone,
            'bill_number': c.sale.bill_number,
            'sale_id': c.sale.id,
            'date': c.created_at,
            'original_amount': float(c.original_amount),
            'amount_paid': float(c.amount_paid),
            'outstanding_amount': float(c.outstanding_amount),
            'status': c.status,
            'shift_name': c.shift.name,
        } for c in emp_credits]

        return Response({
            'total_outstanding': float(total_outstanding),
            'credit_given_today': float(credit_given_today),
            'collected_today': float(collected_today),
            'pending_bills_count': pending_bills_count,
            'customers_with_outstanding_count': customers_count,
            'employee_credits': emp_credits_data,
        })


class CreditBillListView(generics.ListAPIView):
    serializer_class = CreditBillListSerializer
    permission_classes = [IsOwnerOrEmployee]
    pagination_class = None

    def get_queryset(self):
        queryset = CreditBill.objects.select_related('customer', 'employee', 'shift', 'sale').prefetch_related('payments__employee', 'payments__shift').exclude(status='CANCELLED')

        status_param = self.request.query_params.get('status')
        customer_id = self.request.query_params.get('customer')
        employee_id = self.request.query_params.get('employee') or self.request.query_params.get('employee_id')
        search = self.request.query_params.get('search')
        date_param = self.request.query_params.get('date')
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')

        if status_param and status_param != 'ALL':
            queryset = queryset.filter(status=status_param)
        if customer_id:
            queryset = queryset.filter(customer_id=customer_id)
        if employee_id:
            queryset = queryset.filter(employee_id=employee_id)
        if search:
            queryset = queryset.filter(
                Q(customer__name__icontains=search) |
                Q(customer__phone__icontains=search) |
                Q(customer__customer_code__icontains=search) |
                Q(sale__bill_number__icontains=search) |
                Q(employee__full_name__icontains=search)
            )
        if date_param:
            queryset = queryset.filter(created_at__date=date_param)
        if date_from:
            queryset = queryset.filter(created_at__date__gte=date_from)
        if date_to:
            queryset = queryset.filter(created_at__date__lte=date_to)

        return queryset.order_by('-created_at')


class CreditBillDetailView(generics.RetrieveAPIView):
    queryset = CreditBill.objects.select_related('customer', 'employee', 'shift', 'sale').prefetch_related('payments__employee', 'payments__shift')
    serializer_class = CreditBillDetailSerializer
    permission_classes = [IsOwnerOrEmployee]


class CreditBillPaymentView(APIView):
    permission_classes = [IsOwnerOrEmployee]

    @transaction.atomic
    def post(self, request, pk):
        credit_bill = get_object_or_404(CreditBill.objects.select_for_update(), pk=pk)
        if credit_bill.status in ('PAID', 'CANCELLED'):
            return Response({'detail': f'This bill is already {credit_bill.status.lower()}.'}, status=status.HTTP_400_BAD_REQUEST)

        serializer = CreditPaymentCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        amount = serializer.validated_data['amount']
        payment_method = serializer.validated_data['payment_method']
        notes = serializer.validated_data.get('notes', '')

        if payment_method not in ('CASH', 'ONLINE'):
            return Response({'detail': 'Payment method must be either Cash or Online.'}, status=status.HTTP_400_BAD_REQUEST)

        if amount > credit_bill.outstanding_amount:
            return Response(
                {'detail': f'Payment amount (₹{amount}) cannot exceed outstanding amount (₹{credit_bill.outstanding_amount}).'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Determine shift and employee_shift
        shift_id = serializer.validated_data.get('shift')
        employee_shift_id = serializer.validated_data.get('employee_shift')

        shift = None
        employee_shift = None

        if employee_shift_id:
            employee_shift = EmployeeShift.objects.filter(pk=employee_shift_id).first()
            if employee_shift:
                shift = employee_shift.shift

        if not employee_shift:
            today = timezone.localdate()
            employee_shift = EmployeeShift.objects.filter(employee=request.user, date=today, status='OPEN').first()
            if employee_shift:
                shift = employee_shift.shift

        if not shift and shift_id:
            shift = Shift.objects.filter(pk=shift_id).first()

        if not shift:
            shift = credit_bill.shift

        payment = CreditPayment.objects.create(
            credit_bill=credit_bill,
            customer=credit_bill.customer,
            amount=amount,
            payment_method=payment_method,
            employee=request.user,
            shift=shift,
            employee_shift=employee_shift,
            notes=notes,
        )

        credit_bill.amount_paid += amount
        credit_bill.outstanding_amount -= amount

        if credit_bill.outstanding_amount <= 0:
            credit_bill.outstanding_amount = 0
            credit_bill.status = 'PAID'
            credit_bill.settled_at = timezone.now()
        else:
            credit_bill.status = 'PARTIALLY_PAID'

        credit_bill.save(update_fields=['amount_paid', 'outstanding_amount', 'status', 'settled_at'])

        return Response(CreditPaymentSerializer(payment).data, status=status.HTTP_201_CREATED)


class CustomerCreditLedgerView(APIView):
    permission_classes = [IsOwnerOrEmployee]

    def get(self, request, customer_id):
        customer = get_object_or_404(Customer, pk=customer_id)

        completed_sales = Sale.objects.filter(customer=customer, status='COMPLETED')
        total_purchases = completed_sales.aggregate(sum=Sum('total'))['sum'] or 0

        credit_bills = CreditBill.objects.filter(customer=customer).select_related('customer', 'employee', 'shift', 'sale').prefetch_related('payments__employee', 'payments__shift').exclude(status='CANCELLED').order_by('-created_at')
        total_credit = credit_bills.aggregate(sum=Sum('original_amount'))['sum'] or 0
        total_paid = credit_bills.aggregate(sum=Sum('amount_paid'))['sum'] or 0
        outstanding_amount = credit_bills.exclude(status='PAID').aggregate(sum=Sum('outstanding_amount'))['sum'] or 0
        pending_count = credit_bills.exclude(status='PAID').count()

        ledger = CreditBillListSerializer(credit_bills, many=True).data

        return Response({
            'customer_id': customer.id,
            'customer_name': customer.name,
            'customer_code': customer.customer_code,
            'phone': customer.phone,
            'customer_type': customer.customer_type,
            'total_purchases': float(total_purchases),
            'total_credit': float(total_credit),
            'total_paid': float(total_paid),
            'outstanding_amount': float(outstanding_amount),
            'pending_bills_count': pending_count,
            'bills': ledger,
        })


class OutstandingCustomersView(APIView):
    permission_classes = [IsOwnerOrEmployee]

    def get(self, request):
        active_bills = CreditBill.objects.exclude(status__in=['PAID', 'CANCELLED']).select_related('customer')

        grouped = {}
        for b in active_bills:
            cid = b.customer_id
            if cid not in grouped:
                grouped[cid] = {
                    'customer_id': b.customer.id,
                    'customer_name': b.customer.name,
                    'customer_code': b.customer.customer_code,
                    'customer_phone': b.customer.phone,
                    'customer_type': b.customer.customer_type,
                    'pending_bills_count': 0,
                    'total_outstanding': 0.0,
                }
            grouped[cid]['pending_bills_count'] += 1
            grouped[cid]['total_outstanding'] += float(b.outstanding_amount)

        result = sorted(grouped.values(), key=lambda x: x['total_outstanding'], reverse=True)
        return Response(result)


class CreditPaymentListView(generics.ListAPIView):
    serializer_class = CreditPaymentSerializer
    permission_classes = [IsOwnerOrEmployee]
    pagination_class = None

    def get_queryset(self):
        queryset = CreditPayment.objects.select_related('credit_bill__sale', 'customer', 'employee', 'shift')
        customer_id = self.request.query_params.get('customer')
        employee_id = self.request.query_params.get('employee') or self.request.query_params.get('employee_id')
        date_param = self.request.query_params.get('date')
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')
        payment_method = self.request.query_params.get('payment_method')

        if customer_id:
            queryset = queryset.filter(customer_id=customer_id)
        if employee_id:
            queryset = queryset.filter(employee_id=employee_id)
        if date_param:
            queryset = queryset.filter(created_at__date=date_param)
        if date_from:
            queryset = queryset.filter(created_at__date__gte=date_from)
        if date_to:
            queryset = queryset.filter(created_at__date__lte=date_to)
        if payment_method:
            queryset = queryset.filter(payment_method=payment_method)

        return queryset.order_by('-created_at')
