import os
import uuid
from django.conf import settings
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django.db.models import Q
from .models import Product, Category
from .serializers import ProductSerializer, ProductListSerializer, CategorySerializer
from accounts.permissions import IsOwner, IsOwnerOrEmployee


class CategoryListView(generics.ListCreateAPIView):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsOwner()]
        return [IsOwnerOrEmployee()]


class ProductListCreateView(generics.ListCreateAPIView):
    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsOwner()]
        return [IsOwnerOrEmployee()]

    def get_queryset(self):
        queryset = Product.objects.select_related('category')
        search = self.request.query_params.get('search', '')
        category = self.request.query_params.get('category', '')
        is_active = self.request.query_params.get('is_active', None)

        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) |
                Q(sku__icontains=search) |
                Q(pack_size__icontains=search)
            )
        if category:
            queryset = queryset.filter(category__name__icontains=category)
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')
        elif not self.request.user.is_owner:
            queryset = queryset.filter(is_active=True)

        return queryset.order_by('name')

    def get_serializer_class(self):
        if self.request.method == 'GET':
            return ProductListSerializer
        return ProductSerializer


class ProductDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Product.objects.select_related('category')
    serializer_class = ProductSerializer

    def get_permissions(self):
        if self.request.method in ('PUT', 'PATCH', 'DELETE'):
            return [IsOwner()]
        return [IsOwnerOrEmployee()]

    def destroy(self, request, *args, **kwargs):
        product = self.get_object()
        product.is_active = False
        product.save()
        return Response({'detail': 'Product deactivated.'})


from .supabase_storage import upload_file_to_supabase


class ProductImageUploadView(APIView):
    permission_classes = [IsOwner]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, pk):
        product = generics.get_object_or_404(Product, pk=pk)
        image_file = request.FILES.get('image')
        if not image_file:
            return Response({'detail': 'No image provided.'}, status=status.HTTP_400_BAD_REQUEST)

        image_url = upload_file_to_supabase(image_file, folder='products')
        product.image_url = image_url
        product.save(update_fields=['image_url'])
        return Response({'image_url': image_url})
