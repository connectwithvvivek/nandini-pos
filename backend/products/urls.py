from django.urls import path
from .views import ProductListCreateView, ProductDetailView, ProductImageUploadView, CategoryListView

urlpatterns = [
    path('', ProductListCreateView.as_view(), name='product-list'),
    path('<int:pk>/', ProductDetailView.as_view(), name='product-detail'),
    path('<int:pk>/upload-image/', ProductImageUploadView.as_view(), name='product-image-upload'),
    path('categories/', CategoryListView.as_view(), name='category-list'),
]
