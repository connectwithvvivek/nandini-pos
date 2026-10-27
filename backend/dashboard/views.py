from django.db import models as django_models
from rest_framework.views import APIView
from rest_framework.response import Response
from django.utils import timezone
from django.conf import settings
import json
import os
from django.db.models import Sum, Count, Avg, F, Q
from django.db.models.functions import TruncDate
from sales.models import Sale, SaleItem, CreditBill, CreditPayment
from products.models import Product
from customers.models import Customer
from shifts.models import Shift, EmployeeShift
from accounts.permissions import IsOwner, IsOwnerOrEmployee


from rest_framework.parsers import MultiPartParser, FormParser
from products.supabase_storage import upload_file_to_supabase


class StoreInfoView(APIView):
    permission_classes = [IsOwnerOrEmployee]

    def _get_path(self):
        return os.path.join(settings.BASE_DIR, 'store_info.json')

    def get(self, request):
        path = self._get_path()
        if os.path.exists(path):
            try:
                with open(path, 'r', encoding='utf-8') as f:
                    return Response(json.load(f))
            except Exception:
                pass
        return Response({
            'parlourName': 'NANDINI MILK PARLOUR',
            'subBranch': 'Karnataka Milk Federation (KMF)',
            'address': 'Shop #12, Commercial Complex, Main Road, Bangalore',
            'phone': '+91 98765 43210',
            'receiptFooter': 'Goods once sold cannot be returned. Thank you! Visit again!',
            'shopLogo': '',
        })

    def post(self, request):
        if not request.user.is_owner:
            return Response({'detail': 'Only the owner can update store information.'}, status=403)
        path = self._get_path()
        data = request.data
        try:
            with open(path, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            return Response(data)
        except Exception as e:
            return Response({'detail': str(e)}, status=500)


class LogoUploadView(APIView):
    permission_classes = [IsOwner]
    parser_classes = [MultiPartParser, FormParser]

    def _get_path(self):
        return os.path.join(settings.BASE_DIR, 'store_info.json')

    def post(self, request):
        logo_file = request.FILES.get('logo') or request.FILES.get('image')
        if not logo_file:
            return Response({'detail': 'No logo image provided.'}, status=400)

        logo_url = upload_file_to_supabase(logo_file, folder='logos')

        path = self._get_path()
        store_data = {}
        if os.path.exists(path):
            try:
                with open(path, 'r', encoding='utf-8') as f:
                    store_data = json.load(f)
            except Exception:
                pass
        store_data['shopLogo'] = logo_url
        try:
            with open(path, 'w', encoding='utf-8') as f:
                json.dump(store_data, f, ensure_ascii=False, indent=2)
        except Exception:
            pass

        return Response({'shopLogo': logo_url, 'store_info': store_data})


class DashboardTodayView(APIView):
    permission_classes = [IsOwner]

    def get(self, request):
        today = timezone.localdate()
        today_sales = Sale.objects.filter(created_at__date=today, status='COMPLETED')

        total_sales = today_sales.aggregate(total=Sum('total'))['total'] or 0
        bill_count = today_sales.count()
        avg_bill = today_sales.aggregate(avg=Avg('total'))['avg'] or 0
        customer_count = Customer.objects.filter(is_active=True).count()
        low_stock_count = Product.objects.filter(
            is_active=True,
            stock_quantity__lte=F('minimum_stock')
        ).count()

        # Payment methods breakdown today
        cash_sales_today = today_sales.filter(payment_method='CASH').aggregate(s=Sum('total'))['s'] or 0
        online_sales_today = today_sales.filter(payment_method__in=['ONLINE', 'UPI']).aggregate(s=Sum('total'))['s'] or 0
        credit_given_today = today_sales.filter(payment_method='CREDIT').aggregate(s=Sum('total'))['s'] or 0

        # Credit payments collected today
        today_credit_payments = CreditPayment.objects.filter(created_at__date=today)
        cash_credit_today = today_credit_payments.filter(payment_method='CASH').aggregate(s=Sum('amount'))['s'] or 0
        online_credit_today = today_credit_payments.filter(payment_method='ONLINE').aggregate(s=Sum('amount'))['s'] or 0
        credit_collected_today = today_credit_payments.aggregate(s=Sum('amount'))['s'] or 0

        cash_received_today = cash_sales_today + cash_credit_today
        online_received_today = online_sales_today + online_credit_today

        # Overall parlour credit outstanding
        active_credit_bills = CreditBill.objects.exclude(status__in=['PAID', 'CANCELLED'])
        total_outstanding = active_credit_bills.aggregate(s=Sum('outstanding_amount'))['s'] or 0
        pending_bills_count = active_credit_bills.count()

        # Active employee shift if any
        active_shift_obj = EmployeeShift.objects.filter(date=today, status='OPEN').select_related('shift', 'employee').first()
        active_shift_data = None
        if active_shift_obj:
            active_shift_data = {
                'id': active_shift_obj.id,
                'shift_name': active_shift_obj.shift.name,
                'employee_name': active_shift_obj.employee.full_name or active_shift_obj.employee.username,
                'opened_at': active_shift_obj.opened_at,
                'opening_cash': float(active_shift_obj.opening_cash),
            }

        shifts = Shift.objects.filter(is_active=True)
        shift_data = []
        for shift in shifts:
            shift_sales = today_sales.filter(shift=shift)
            shift_data.append({
                'id': shift.id,
                'name': shift.name,
                'total': shift_sales.aggregate(total=Sum('total'))['total'] or 0,
                'cash_sales': shift_sales.filter(payment_method='CASH').aggregate(s=Sum('total'))['s'] or 0,
                'online_sales': shift_sales.filter(payment_method__in=['ONLINE', 'UPI']).aggregate(s=Sum('total'))['s'] or 0,
                'credit_sales': shift_sales.filter(payment_method='CREDIT').aggregate(s=Sum('total'))['s'] or 0,
                'bill_count': shift_sales.count(),
            })

        recent_sales = Sale.objects.filter(
            created_at__date=today, status='COMPLETED'
        ).select_related('customer', 'shift', 'credit_record').order_by('-created_at')[:10]

        recent_data = [{
            'id': s.id,
            'bill_number': s.bill_number,
            'customer_name': s.customer.name,
            'customer_code': s.customer.customer_code,
            'total': s.total,
            'payment_method': s.payment_method,
            'credit_status': s.credit_record.status if s.payment_method == 'CREDIT' and hasattr(s, 'credit_record') else None,
            'shift_name': s.shift.name,
            'created_at': s.created_at,
        } for s in recent_sales]

        low_stock_products = Product.objects.filter(
            is_active=True,
            stock_quantity__lte=F('minimum_stock')
        ).order_by('stock_quantity')[:10]

        low_stock_data = [{
            'id': p.id,
            'name': p.name,
            'pack_size': p.pack_size,
            'stock_quantity': p.stock_quantity,
            'minimum_stock': p.minimum_stock,
            'unit': p.unit,
        } for p in low_stock_products]

        return Response({
            'today': str(today),
            'total_sales': float(total_sales),
            'cash_sales_today': float(cash_sales_today),
            'online_sales_today': float(online_sales_today),
            'cash_received_today': float(cash_received_today),
            'online_received_today': float(online_received_today),
            'credit_given_today': float(credit_given_today),
            'credit_collected_today': float(credit_collected_today),
            'total_outstanding': float(total_outstanding),
            'pending_bills_count': pending_bills_count,
            'active_shift': active_shift_data,
            'bill_count': bill_count,
            'avg_bill': round(float(avg_bill), 2),
            'customer_count': customer_count,
            'low_stock_count': low_stock_count,
            'shifts': shift_data,
            'recent_sales': recent_data,
            'low_stock_products': low_stock_data,
        })


class DashboardReportsView(APIView):
    permission_classes = [IsOwner]

    def get(self, request):
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')
        report_type = request.query_params.get('type', 'daily')

        queryset = Sale.objects.filter(status='COMPLETED')
        if date_from:
            queryset = queryset.filter(created_at__date__gte=date_from)
        if date_to:
            queryset = queryset.filter(created_at__date__lte=date_to)

        if report_type == 'product':
            items = SaleItem.objects.filter(
                sale__in=queryset
            ).values('product__id', 'product__name', 'product__pack_size').annotate(
                total_qty=Sum('quantity'),
                total_revenue=Sum('line_total')
            ).order_by('-total_revenue')
            return Response(list(items))

        elif report_type == 'customer':
            data = queryset.values(
                'customer__id', 'customer__name', 'customer__customer_code', 'customer__phone'
            ).annotate(
                purchase_count=Count('id'),
                total_amount=Sum('total')
            ).order_by('-total_amount')
            
            # Enrich with customer credit outstanding
            res = []
            for c in data:
                cid = c['customer__id']
                out = CreditBill.objects.filter(customer_id=cid).exclude(status__in=['PAID', 'CANCELLED']).aggregate(Sum('outstanding_amount'))['outstanding_amount__sum'] or 0
                res.append({
                    **c,
                    'outstanding_amount': float(out)
                })
            return Response(res)

        elif report_type == 'shift':
            shifts = Shift.objects.filter(is_active=True)
            res = []
            for s in shifts:
                shift_sales = queryset.filter(shift=s)
                res.append({
                    'shift__id': s.id,
                    'shift__name': s.name,
                    'bill_count': shift_sales.count(),
                    'total_amount': shift_sales.aggregate(t=Sum('total'))['t'] or 0,
                    'cash_amount': shift_sales.filter(payment_method='CASH').aggregate(t=Sum('total'))['t'] or 0,
                    'online_amount': shift_sales.filter(payment_method__in=['ONLINE', 'UPI']).aggregate(t=Sum('total'))['t'] or 0,
                    'credit_amount': shift_sales.filter(payment_method='CREDIT').aggregate(t=Sum('total'))['t'] or 0,
                })
            return Response(res)

        else:
            # Daily report
            days = queryset.annotate(
                date=TruncDate('created_at')
            ).values('date').distinct().order_by('-date')

            res = []
            for d in days:
                day_date = d['date']
                day_sales = queryset.filter(created_at__date=day_date)
                day_payments = CreditPayment.objects.filter(created_at__date=day_date)
                
                tot = day_sales.aggregate(t=Sum('total'))['t'] or 0
                cnt = day_sales.count()
                avg = day_sales.aggregate(a=Avg('total'))['a'] or 0
                cash = day_sales.filter(payment_method='CASH').aggregate(t=Sum('total'))['t'] or 0
                online = day_sales.filter(payment_method__in=['ONLINE', 'UPI']).aggregate(t=Sum('total'))['t'] or 0
                credit_given = day_sales.filter(payment_method='CREDIT').aggregate(t=Sum('total'))['t'] or 0
                credit_collected = day_payments.aggregate(t=Sum('amount'))['t'] or 0

                res.append({
                    'date': day_date,
                    'bill_count': cnt,
                    'total_amount': float(tot),
                    'avg_bill': round(float(avg), 2),
                    'cash_amount': float(cash),
                    'online_amount': float(online),
                    'credit_amount': float(credit_given),
                    'credit_collected': float(credit_collected),
                })

            return Response(res)
