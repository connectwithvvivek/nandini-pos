from decimal import Decimal
from rest_framework import serializers
from .models import Sale, SaleItem, CreditBill, CreditPayment
from customers.serializers import CustomerListSerializer
from accounts.serializers import UserSerializer


class SaleItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_pack_size = serializers.CharField(source='product.pack_size', read_only=True)

    class Meta:
        model = SaleItem
        fields = ['id', 'product', 'product_name', 'product_pack_size', 'quantity', 'unit_price', 'line_total']
        read_only_fields = ['id', 'line_total']


class SaleItemCreateSerializer(serializers.Serializer):
    product = serializers.IntegerField()
    quantity = serializers.DecimalField(max_digits=10, decimal_places=2)
    unit_price = serializers.DecimalField(max_digits=10, decimal_places=2)


class SaleCreateSerializer(serializers.Serializer):
    customer = serializers.IntegerField()
    shift = serializers.IntegerField(required=False, allow_null=True)
    employee_shift = serializers.IntegerField(required=False, allow_null=True)
    payment_method = serializers.ChoiceField(choices=['CASH', 'ONLINE', 'CREDIT', 'UPI'], default='CASH')
    discount = serializers.DecimalField(max_digits=10, decimal_places=2, default=0)
    notes = serializers.CharField(required=False, allow_blank=True)
    items = SaleItemCreateSerializer(many=True)

    def validate_payment_method(self, value):
        val = value.upper()
        if val in ('CARD', 'PAYTM', 'OTHER'):
            raise serializers.ValidationError('This payment method is not accepted. Only Cash, Online, and Credit are supported.')
        if val == 'UPI':
            return 'ONLINE'
        return val


class CreditPaymentSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    shift_name = serializers.CharField(source='shift.name', read_only=True)
    bill_number = serializers.CharField(source='credit_bill.sale.bill_number', read_only=True)
    customer_name = serializers.CharField(source='customer.name', read_only=True)

    class Meta:
        model = CreditPayment
        fields = [
            'id', 'credit_bill', 'bill_number', 'customer', 'customer_name',
            'amount', 'payment_method', 'employee', 'employee_name',
            'shift', 'shift_name', 'employee_shift', 'notes', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class CreditPaymentCreateSerializer(serializers.Serializer):
    amount = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=Decimal('0.01'))
    payment_method = serializers.ChoiceField(choices=['CASH', 'ONLINE'])
    shift = serializers.IntegerField(required=False, allow_null=True)
    employee_shift = serializers.IntegerField(required=False, allow_null=True)
    notes = serializers.CharField(required=False, allow_blank=True, default='')


class CreditBillListSerializer(serializers.ModelSerializer):
    bill_number = serializers.CharField(source='sale.bill_number', read_only=True)
    sale_id = serializers.IntegerField(source='sale.id', read_only=True)
    customer_name = serializers.CharField(source='customer.name', read_only=True)
    customer_code = serializers.CharField(source='customer.customer_code', read_only=True)
    customer_phone = serializers.CharField(source='customer.phone', read_only=True)
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    shift_name = serializers.CharField(source='shift.name', read_only=True)
    payments = CreditPaymentSerializer(many=True, read_only=True)

    class Meta:
        model = CreditBill
        fields = [
            'id', 'sale', 'sale_id', 'bill_number', 'customer', 'customer_name',
            'customer_code', 'customer_phone', 'employee_name', 'shift_name',
            'original_amount', 'amount_paid', 'outstanding_amount', 'status',
            'notes', 'created_at', 'settled_at', 'payments'
        ]


class CreditBillDetailSerializer(serializers.ModelSerializer):
    bill_number = serializers.CharField(source='sale.bill_number', read_only=True)
    sale_id = serializers.IntegerField(source='sale.id', read_only=True)
    customer_name = serializers.CharField(source='customer.name', read_only=True)
    customer_code = serializers.CharField(source='customer.customer_code', read_only=True)
    customer_phone = serializers.CharField(source='customer.phone', read_only=True)
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    shift_name = serializers.CharField(source='shift.name', read_only=True)
    payments = CreditPaymentSerializer(many=True, read_only=True)

    class Meta:
        model = CreditBill
        fields = [
            'id', 'sale', 'sale_id', 'bill_number', 'customer', 'customer_name',
            'customer_code', 'customer_phone', 'employee_name', 'shift_name',
            'original_amount', 'amount_paid', 'outstanding_amount', 'status',
            'notes', 'created_at', 'settled_at', 'payments'
        ]


class SaleSerializer(serializers.ModelSerializer):
    items = SaleItemSerializer(many=True, read_only=True)
    customer_name = serializers.CharField(source='customer.name', read_only=True)
    customer_code = serializers.CharField(source='customer.customer_code', read_only=True)
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    shift_name = serializers.CharField(source='shift.name', read_only=True)
    credit_record = CreditBillDetailSerializer(read_only=True)
    credit_status = serializers.SerializerMethodField()
    credit_outstanding = serializers.SerializerMethodField()
    credit_paid = serializers.SerializerMethodField()

    class Meta:
        model = Sale
        fields = [
            'id', 'bill_number', 'customer', 'customer_name', 'customer_code',
            'employee', 'employee_name', 'shift', 'shift_name',
            'subtotal', 'discount', 'total', 'payment_method', 'status',
            'notes', 'created_at', 'items', 'credit_status', 'credit_outstanding',
            'credit_paid', 'credit_record'
        ]
        read_only_fields = ['id', 'bill_number', 'created_at']

    def get_credit_status(self, obj):
        if obj.payment_method == 'CREDIT' and hasattr(obj, 'credit_record'):
            return obj.credit_record.status
        return None

    def get_credit_outstanding(self, obj):
        if obj.payment_method == 'CREDIT' and hasattr(obj, 'credit_record'):
            return float(obj.credit_record.outstanding_amount)
        return 0.0

    def get_credit_paid(self, obj):
        if obj.payment_method == 'CREDIT' and hasattr(obj, 'credit_record'):
            return float(obj.credit_record.amount_paid)
        return float(obj.total) if obj.status == 'COMPLETED' else 0.0


class SaleListSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source='customer.name', read_only=True)
    customer_code = serializers.CharField(source='customer.customer_code', read_only=True)
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    shift_name = serializers.CharField(source='shift.name', read_only=True)
    items = SaleItemSerializer(many=True, read_only=True)
    credit_status = serializers.SerializerMethodField()
    credit_outstanding = serializers.SerializerMethodField()

    class Meta:
        model = Sale
        fields = [
            'id', 'bill_number', 'customer_name', 'customer_code',
            'employee_name', 'shift_name', 'total', 'payment_method',
            'status', 'created_at', 'items', 'credit_status', 'credit_outstanding'
        ]

    def get_credit_status(self, obj):
        if obj.payment_method == 'CREDIT' and hasattr(obj, 'credit_record'):
            return obj.credit_record.status
        return None

    def get_credit_outstanding(self, obj):
        if obj.payment_method == 'CREDIT' and hasattr(obj, 'credit_record'):
            return float(obj.credit_record.outstanding_amount)
        return 0.0
