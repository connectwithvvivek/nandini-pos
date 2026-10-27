from rest_framework import serializers
from .models import InventoryTransaction


class InventoryTransactionSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_pack_size = serializers.CharField(source='product.pack_size', read_only=True)
    product_unit = serializers.CharField(source='product.unit', read_only=True)
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True)
    shift_name = serializers.CharField(source='shift.name', read_only=True)
    shift_id = serializers.IntegerField(source='shift.id', read_only=True)

    class Meta:
        model = InventoryTransaction
        fields = [
            'id', 'product', 'product_name', 'product_pack_size', 'product_unit',
            'transaction_type', 'quantity', 'previous_stock', 'new_stock',
            'reference_sale', 'reason', 'created_by_name', 'shift', 'shift_id',
            'shift_name', 'employee_shift', 'created_at'
        ]
        read_only_fields = ['id', 'previous_stock', 'new_stock', 'created_at']


class StockAdjustmentSerializer(serializers.Serializer):
    product = serializers.IntegerField()
    transaction_type = serializers.ChoiceField(choices=['PURCHASE', 'ADJUSTMENT', 'DAMAGE', 'RETURN', 'CORRECTION'])
    quantity = serializers.DecimalField(max_digits=10, decimal_places=2)
    reason = serializers.CharField(required=False, allow_blank=True, default='')
    shift = serializers.IntegerField(required=False, allow_null=True)
    employee_shift = serializers.IntegerField(required=False, allow_null=True)
