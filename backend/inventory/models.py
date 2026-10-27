from django.db import models
from products.models import Product
from accounts.models import User
from shifts.models import Shift, EmployeeShift


class InventoryTransaction(models.Model):
    TRANSACTION_TYPE_CHOICES = [
        ('PURCHASE', 'Purchase'),
        ('SALE', 'Sale'),
        ('ADJUSTMENT', 'Adjustment'),
        ('DAMAGE', 'Damage'),
        ('RETURN', 'Return'),
        ('CORRECTION', 'Correction'),
    ]

    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='inventory_transactions')
    transaction_type = models.CharField(max_length=20, choices=TRANSACTION_TYPE_CHOICES)
    quantity = models.DecimalField(max_digits=10, decimal_places=2)
    previous_stock = models.DecimalField(max_digits=10, decimal_places=2)
    new_stock = models.DecimalField(max_digits=10, decimal_places=2)
    reference_sale = models.CharField(max_length=50, blank=True)
    reason = models.TextField(blank=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='inventory_adjustments')
    shift = models.ForeignKey(Shift, on_delete=models.SET_NULL, null=True, blank=True, related_name='inventory_transactions')
    employee_shift = models.ForeignKey(EmployeeShift, on_delete=models.SET_NULL, null=True, blank=True, related_name='inventory_transactions')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'inventory_transactions'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['product', 'created_at']),
            models.Index(fields=['transaction_type']),
            models.Index(fields=['created_by', 'created_at']),
            models.Index(fields=['shift', 'created_at']),
        ]

    def __str__(self):
        return f"{self.product.name} {self.transaction_type} {self.quantity}"
