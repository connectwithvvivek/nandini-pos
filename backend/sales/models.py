from django.db import models
from customers.models import Customer
from accounts.models import User
from shifts.models import Shift, EmployeeShift
from products.models import Product


class Sale(models.Model):
    PAYMENT_METHOD_CHOICES = [
        ('CASH', 'Cash'),
        ('ONLINE', 'Online'),
        ('CREDIT', 'Credit'),
        ('UPI', 'UPI (Online)'),
    ]

    STATUS_CHOICES = [
        ('COMPLETED', 'Completed'),
        ('CANCELLED', 'Cancelled'),
        ('REFUNDED', 'Refunded'),
    ]

    bill_number = models.CharField(max_length=30, unique=True, editable=False)
    customer = models.ForeignKey(Customer, on_delete=models.PROTECT, related_name='sales')
    employee = models.ForeignKey(User, on_delete=models.PROTECT, related_name='sales')
    shift = models.ForeignKey(Shift, on_delete=models.PROTECT, related_name='sales')
    employee_shift = models.ForeignKey(EmployeeShift, on_delete=models.SET_NULL, null=True, blank=True)
    subtotal = models.DecimalField(max_digits=12, decimal_places=2)
    discount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=12, decimal_places=2)
    payment_method = models.CharField(max_length=10, choices=PAYMENT_METHOD_CHOICES, default='CASH')
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='COMPLETED')
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'sales'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['bill_number']),
            models.Index(fields=['customer', 'created_at']),
            models.Index(fields=['employee', 'created_at']),
            models.Index(fields=['shift', 'created_at']),
            models.Index(fields=['created_at']),
        ]

    def save(self, *args, **kwargs):
        if not self.bill_number:
            from django.utils import timezone
            year = timezone.now().year
            last = Sale.objects.filter(bill_number__startswith=f'INV-{year}-').order_by('-id').first()
            if last:
                last_num = int(last.bill_number.split('-')[-1])
                next_num = last_num + 1
            else:
                next_num = 1
            self.bill_number = f'INV-{year}-{next_num:06d}'
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.bill_number} - {self.customer.name}"


class SaleItem(models.Model):
    sale = models.ForeignKey(Sale, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.PROTECT, related_name='sale_items')
    quantity = models.DecimalField(max_digits=10, decimal_places=2)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)  # price snapshot
    line_total = models.DecimalField(max_digits=12, decimal_places=2)

    class Meta:
        db_table = 'sale_items'
        indexes = [models.Index(fields=['sale']), models.Index(fields=['product'])]

    def save(self, *args, **kwargs):
        self.line_total = self.quantity * self.unit_price
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.sale.bill_number} - {self.product.name} x{self.quantity}"


class CreditBill(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('PARTIALLY_PAID', 'Partially Paid'),
        ('PAID', 'Paid'),
        ('CANCELLED', 'Cancelled'),
    ]

    sale = models.OneToOneField(Sale, on_delete=models.CASCADE, related_name='credit_record')
    customer = models.ForeignKey(Customer, on_delete=models.PROTECT, related_name='credit_bills')
    employee = models.ForeignKey(User, on_delete=models.PROTECT, related_name='credits_given')
    shift = models.ForeignKey(Shift, on_delete=models.PROTECT, related_name='credit_bills')
    employee_shift = models.ForeignKey(EmployeeShift, on_delete=models.SET_NULL, null=True, blank=True, related_name='credit_bills')

    original_amount = models.DecimalField(max_digits=12, decimal_places=2)
    amount_paid = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    outstanding_amount = models.DecimalField(max_digits=12, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')

    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    settled_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'credit_bills'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['customer', 'status']),
            models.Index(fields=['status']),
            models.Index(fields=['created_at']),
            models.Index(fields=['employee', 'created_at']),
            models.Index(fields=['shift', 'created_at']),
        ]

    def __str__(self):
        return f"{self.sale.bill_number} - {self.customer.name} (Due: {self.outstanding_amount})"


class CreditPayment(models.Model):
    PAYMENT_METHOD_CHOICES = [
        ('CASH', 'Cash'),
        ('ONLINE', 'Online'),
    ]

    credit_bill = models.ForeignKey(CreditBill, on_delete=models.CASCADE, related_name='payments')
    customer = models.ForeignKey(Customer, on_delete=models.PROTECT, related_name='credit_payments')
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    payment_method = models.CharField(max_length=10, choices=PAYMENT_METHOD_CHOICES)
    employee = models.ForeignKey(User, on_delete=models.PROTECT, related_name='credit_payments_collected')
    shift = models.ForeignKey(Shift, on_delete=models.PROTECT, related_name='credit_payments')
    employee_shift = models.ForeignKey(EmployeeShift, on_delete=models.SET_NULL, null=True, blank=True, related_name='credit_payments')
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'credit_payments'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['credit_bill', 'created_at']),
            models.Index(fields=['customer', 'created_at']),
            models.Index(fields=['employee', 'created_at']),
            models.Index(fields=['shift', 'created_at']),
        ]

    def __str__(self):
        return f"Payment {self.amount} for {self.credit_bill.sale.bill_number} via {self.payment_method}"

