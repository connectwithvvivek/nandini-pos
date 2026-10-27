from django.db import models
from accounts.models import User


class Shift(models.Model):
    name = models.CharField(max_length=100)
    start_time = models.TimeField()
    end_time = models.TimeField()
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'shifts'
        ordering = ['start_time']

    def __str__(self):
        return self.name


class EmployeeShift(models.Model):
    STATUS_CHOICES = [
        ('OPEN', 'Open'),
        ('CLOSED', 'Closed'),
    ]

    employee = models.ForeignKey(User, on_delete=models.CASCADE, related_name='employee_shifts')
    shift = models.ForeignKey(Shift, on_delete=models.CASCADE, related_name='employee_shifts')
    date = models.DateField()
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='OPEN')
    opened_at = models.DateTimeField(auto_now_add=True)
    closed_at = models.DateTimeField(null=True, blank=True)
    opening_cash = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    closing_cash = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        db_table = 'employee_shifts'
        ordering = ['-date', '-opened_at']
        indexes = [
            models.Index(fields=['employee', 'date']),
            models.Index(fields=['shift', 'date']),
            models.Index(fields=['status']),
        ]

    def __str__(self):
        return f"{self.employee.full_name} - {self.shift.name} - {self.date}"
