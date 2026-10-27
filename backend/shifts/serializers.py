from rest_framework import serializers
from .models import Shift, EmployeeShift
from accounts.serializers import UserSerializer


class ShiftSerializer(serializers.ModelSerializer):
    class Meta:
        model = Shift
        fields = ['id', 'name', 'start_time', 'end_time', 'is_active']


class EmployeeShiftSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    shift_name = serializers.CharField(source='shift.name', read_only=True)
    shift_start_time = serializers.TimeField(source='shift.start_time', read_only=True)
    shift_end_time = serializers.TimeField(source='shift.end_time', read_only=True)
    total_sales = serializers.SerializerMethodField()
    sales_count = serializers.SerializerMethodField()
    cash_sales = serializers.SerializerMethodField()
    online_sales = serializers.SerializerMethodField()
    upi_sales = serializers.SerializerMethodField()
    credit_sales = serializers.SerializerMethodField()
    credit_collected = serializers.SerializerMethodField()
    cash_credit_collected = serializers.SerializerMethodField()
    online_credit_collected = serializers.SerializerMethodField()
    expected_cash = serializers.SerializerMethodField()
    cash_difference = serializers.SerializerMethodField()

    class Meta:
        model = EmployeeShift
        fields = [
            'id', 'employee', 'employee_name', 'shift', 'shift_name',
            'shift_start_time', 'shift_end_time', 'date', 'status',
            'opened_at', 'closed_at', 'opening_cash', 'closing_cash', 'notes',
            'total_sales', 'sales_count', 'cash_sales', 'online_sales', 'upi_sales',
            'credit_sales', 'credit_collected', 'cash_credit_collected', 'online_credit_collected',
            'expected_cash', 'cash_difference'
        ]
        read_only_fields = ['id', 'opened_at']

    def _get_completed_sales(self, obj):
        if not hasattr(obj, '_cached_sales'):
            from sales.models import Sale
            obj._cached_sales = list(Sale.objects.filter(employee_shift=obj, status='COMPLETED'))
        return obj._cached_sales

    def _get_credit_payments(self, obj):
        if not hasattr(obj, '_cached_credit_payments'):
            from sales.models import CreditPayment
            obj._cached_credit_payments = list(CreditPayment.objects.filter(employee_shift=obj))
        return obj._cached_credit_payments

    def get_total_sales(self, obj):
        sales = self._get_completed_sales(obj)
        return float(sum(s.total for s in sales))

    def get_sales_count(self, obj):
        sales = self._get_completed_sales(obj)
        return len(sales)

    def get_cash_sales(self, obj):
        sales = self._get_completed_sales(obj)
        return float(sum(s.total for s in sales if s.payment_method == 'CASH'))

    def get_online_sales(self, obj):
        sales = self._get_completed_sales(obj)
        return float(sum(s.total for s in sales if s.payment_method in ('ONLINE', 'UPI')))

    def get_upi_sales(self, obj):
        return self.get_online_sales(obj)

    def get_credit_sales(self, obj):
        sales = self._get_completed_sales(obj)
        return float(sum(s.total for s in sales if s.payment_method == 'CREDIT'))

    def get_credit_collected(self, obj):
        payments = self._get_credit_payments(obj)
        return float(sum(p.amount for p in payments))

    def get_cash_credit_collected(self, obj):
        payments = self._get_credit_payments(obj)
        return float(sum(p.amount for p in payments if p.payment_method == 'CASH'))

    def get_online_credit_collected(self, obj):
        payments = self._get_credit_payments(obj)
        return float(sum(p.amount for p in payments if p.payment_method == 'ONLINE'))

    def get_expected_cash(self, obj):
        opening = float(obj.opening_cash or 0)
        cash_sales = self.get_cash_sales(obj)
        cash_credit = self.get_cash_credit_collected(obj)
        return round(opening + cash_sales + cash_credit, 2)

    def get_cash_difference(self, obj):
        if obj.closing_cash is None:
            return None
        expected = self.get_expected_cash(obj)
        closing = float(obj.closing_cash)
        return round(closing - expected, 2)
