from django.db import models
from customers.models import Customer
from products.models import Product
from accounts.models import User


class CustomerProductPrice(models.Model):
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='custom_prices')
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='custom_prices')
    price = models.DecimalField(max_digits=10, decimal_places=2)
    updated_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='price_updates')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'customer_product_prices'
        unique_together = [('customer', 'product')]
        indexes = [
            models.Index(fields=['customer', 'product']),
        ]

    def __str__(self):
        return f"{self.customer.name} - {self.product.name}: ₹{self.price}"


class PriceHistory(models.Model):
    PRICE_TYPE_CHOICES = [
        ('DEFAULT', 'Default Product Price'),
        ('CUSTOMER', 'Customer-Specific Price'),
    ]

    price_type = models.CharField(max_length=10, choices=PRICE_TYPE_CHOICES)
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='price_history')
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, null=True, blank=True, related_name='price_history')
    old_price = models.DecimalField(max_digits=10, decimal_places=2)
    new_price = models.DecimalField(max_digits=10, decimal_places=2)
    changed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    changed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'price_history'
        ordering = ['-changed_at']
        indexes = [models.Index(fields=['product', 'customer'])]
