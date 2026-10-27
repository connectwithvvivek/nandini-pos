from django.urls import path
from .views import CustomerPricesView, CustomerProductsWithPricesView, PriceHistoryView

urlpatterns = [
    path('customers/<int:customer_id>/prices/', CustomerPricesView.as_view(), name='customer-prices'),
    path('customers/<int:customer_id>/products/', CustomerProductsWithPricesView.as_view(), name='customer-products'),
    path('history/', PriceHistoryView.as_view(), name='price-history'),
]
