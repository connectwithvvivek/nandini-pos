from django.contrib import admin
from .models import Sale, SaleItem

class SaleItemInline(admin.TabularInline):
    model = SaleItem
    extra = 0
    readonly_fields = ['line_total']

@admin.register(Sale)
class SaleAdmin(admin.ModelAdmin):
    list_display = ['bill_number', 'customer', 'employee', 'shift', 'total', 'payment_method', 'status', 'created_at']
    list_filter = ['shift', 'payment_method', 'status', 'created_at']
    search_fields = ['bill_number', 'customer__name']
    readonly_fields = ['bill_number', 'created_at']
    inlines = [SaleItemInline]
