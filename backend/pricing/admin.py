from django.contrib import admin
from .models import CustomerProductPrice, PriceHistory

@admin.register(CustomerProductPrice)
class CustomerProductPriceAdmin(admin.ModelAdmin):
    list_display = ['customer', 'product', 'price', 'updated_by', 'updated_at']
    list_filter = ['customer', 'product']
    search_fields = ['customer__name', 'product__name']

@admin.register(PriceHistory)
class PriceHistoryAdmin(admin.ModelAdmin):
    list_display = ['price_type', 'product', 'customer', 'old_price', 'new_price', 'changed_by', 'changed_at']
    list_filter = ['price_type']
    readonly_fields = ['changed_at']
