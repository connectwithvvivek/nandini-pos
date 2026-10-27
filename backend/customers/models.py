from django.db import models


class Customer(models.Model):
    CUSTOMER_TYPE_CHOICES = [
        ('REGULAR', 'Regular'),
        ('RETAILER', 'Retailer'),
        ('HOTEL', 'Hotel'),
        ('RESTAURANT', 'Restaurant'),
        ('INSTITUTION', 'Institution'),
        ('OTHER', 'Other'),
    ]

    customer_code = models.CharField(max_length=20, unique=True, editable=False)
    name = models.CharField(max_length=255)
    phone = models.CharField(max_length=20, blank=True)
    address = models.TextField(blank=True)
    customer_type = models.CharField(max_length=20, choices=CUSTOMER_TYPE_CHOICES, default='REGULAR')
    notes = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'customers'
        ordering = ['name']
        indexes = [
            models.Index(fields=['customer_code']),
            models.Index(fields=['name']),
            models.Index(fields=['phone']),
            models.Index(fields=['is_active']),
        ]

    def save(self, *args, **kwargs):
        if not self.customer_code:
            last = Customer.objects.order_by('-id').first()
            next_id = (last.id + 1) if last else 1
            self.customer_code = f'CUS-{next_id:04d}'
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.customer_code} - {self.name}"
