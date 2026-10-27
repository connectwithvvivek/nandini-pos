from django.urls import path
from .views import InventoryListView, StockAdjustView, ProductInventoryHistoryView

urlpatterns = [
    path('', InventoryListView.as_view(), name='inventory-list'),
    path('adjust/', StockAdjustView.as_view(), name='stock-adjust'),
    path('products/<int:pk>/history/', ProductInventoryHistoryView.as_view(), name='product-inventory-history'),
]
