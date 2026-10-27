from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.utils import timezone
from products.models import Product
from shifts.models import Shift, EmployeeShift
from .models import InventoryTransaction
from .serializers import InventoryTransactionSerializer, StockAdjustmentSerializer
from accounts.permissions import IsOwner, IsOwnerOrEmployee


class InventoryListView(generics.ListAPIView):
    serializer_class = InventoryTransactionSerializer
    permission_classes = [IsOwner]

    def get_queryset(self):
        queryset = InventoryTransaction.objects.select_related('product', 'created_by', 'shift', 'employee_shift')
        product_id = self.request.query_params.get('product')
        transaction_type = self.request.query_params.get('type')
        shift_id = self.request.query_params.get('shift')
        employee_id = self.request.query_params.get('employee')
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')

        if product_id:
            queryset = queryset.filter(product_id=product_id)
        if transaction_type:
            queryset = queryset.filter(transaction_type=transaction_type)
        if shift_id:
            queryset = queryset.filter(shift_id=shift_id)
        if employee_id:
            queryset = queryset.filter(created_by_id=employee_id)
        if date_from:
            queryset = queryset.filter(created_at__date__gte=date_from)
        if date_to:
            queryset = queryset.filter(created_at__date__lte=date_to)

        return queryset.order_by('-created_at')


class StockAdjustView(APIView):
    permission_classes = [IsOwnerOrEmployee]

    def post(self, request):
        if not getattr(request.user, 'is_owner', False):
            # Employees can record shift counts/adjustments (ADJUSTMENT, DAMAGE, CORRECTION) but not purchases
            if request.data.get('transaction_type') == 'PURCHASE':
                return Response({'detail': 'Only owners can record purchase stock-in.'}, status=status.HTTP_403_FORBIDDEN)

        serializer = StockAdjustmentSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        product = get_object_or_404(Product, pk=data['product'])
        quantity = data['quantity']
        transaction_type = data['transaction_type']

        previous_stock = product.stock_quantity

        if transaction_type in ('DAMAGE',):
            new_stock = previous_stock - abs(quantity)
        elif transaction_type == 'ADJUSTMENT':
            new_stock = quantity  # absolute value
        else:
            new_stock = previous_stock + abs(quantity)

        if new_stock < 0:
            new_stock = 0

        product.stock_quantity = new_stock
        product.save(update_fields=['stock_quantity'])

        # Resolve Shift & EmployeeShift for auditing
        shift_id = data.get('shift') or request.data.get('shift')
        shift = None
        if shift_id:
            shift = Shift.objects.filter(pk=shift_id).first()

        employee_shift_id = data.get('employee_shift') or request.data.get('employee_shift')
        employee_shift = None
        if employee_shift_id:
            employee_shift = EmployeeShift.objects.filter(pk=employee_shift_id).first()

        if not employee_shift:
            employee_shift = EmployeeShift.objects.filter(
                employee=request.user,
                status='OPEN'
            ).order_by('-opened_at').first()

        if not shift and employee_shift:
            shift = employee_shift.shift

        if not shift:
            # Fallback to current time-matching shift
            now_time = timezone.localtime().time()
            shift = Shift.objects.filter(
                start_time__lte=now_time,
                end_time__gte=now_time,
                is_active=True
            ).first() or Shift.objects.filter(is_active=True).first()

        inv_tx = InventoryTransaction.objects.create(
            product=product,
            transaction_type=transaction_type,
            quantity=quantity,
            previous_stock=previous_stock,
            new_stock=new_stock,
            reason=data.get('reason', ''),
            created_by=request.user,
            shift=shift,
            employee_shift=employee_shift,
        )

        return Response({
            'id': inv_tx.id,
            'product': product.id,
            'product_name': product.name,
            'previous_stock': previous_stock,
            'new_stock': new_stock,
            'transaction_type': transaction_type,
            'created_by_name': request.user.full_name,
            'shift_name': shift.name if shift else None,
            'created_at': inv_tx.created_at,
        })


class ProductInventoryHistoryView(generics.ListAPIView):
    serializer_class = InventoryTransactionSerializer
    permission_classes = [IsOwner]

    def get_queryset(self):
        product_id = self.kwargs['pk']
        return InventoryTransaction.objects.filter(
            product_id=product_id
        ).select_related('product', 'created_by', 'shift', 'employee_shift').order_by('-created_at')
