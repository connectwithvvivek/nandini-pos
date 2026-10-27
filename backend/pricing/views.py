from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from customers.models import Customer
from products.models import Product
from .models import CustomerProductPrice, PriceHistory
from .serializers import CustomerProductPriceSerializer, PriceHistorySerializer, ProductWithCustomerPriceSerializer
from accounts.permissions import IsOwner, IsOwnerOrEmployee


class CustomerPricesView(APIView):
    """GET all prices for a customer, PATCH to update/create a price."""

    def get_permissions(self):
        if self.request.method == 'PATCH':
            return [IsOwner()]
        return [IsOwnerOrEmployee()]

    def get(self, request, customer_id):
        customer = get_object_or_404(Customer, pk=customer_id)
        prices = CustomerProductPrice.objects.filter(customer=customer).select_related('product', 'product__category')
        serializer = CustomerProductPriceSerializer(prices, many=True)
        return Response(serializer.data)

    def patch(self, request, customer_id):
        customer = get_object_or_404(Customer, pk=customer_id)
        product_id = request.data.get('product')
        new_price = request.data.get('price')

        if not product_id or new_price is None:
            return Response({'detail': 'product and price are required.'}, status=status.HTTP_400_BAD_REQUEST)

        product = get_object_or_404(Product, pk=product_id)
        existing, created = CustomerProductPrice.objects.get_or_create(
            customer=customer, product=product,
            defaults={'price': new_price, 'updated_by': request.user}
        )

        if not created:
            PriceHistory.objects.create(
                price_type='CUSTOMER',
                product=product,
                customer=customer,
                old_price=existing.price,
                new_price=new_price,
                changed_by=request.user
            )
            existing.price = new_price
            existing.updated_by = request.user
            existing.save()

        serializer = CustomerProductPriceSerializer(existing)
        return Response(serializer.data)


class CustomerProductsWithPricesView(APIView):
    """Returns all active products with effective price for a customer (for POS)."""
    permission_classes = [IsOwnerOrEmployee]

    def get(self, request, customer_id):
        customer = get_object_or_404(Customer, pk=customer_id)
        products = Product.objects.filter(is_active=True).select_related('category')
        custom_prices = {
            cp.product_id: cp.price
            for cp in CustomerProductPrice.objects.filter(customer=customer)
        }

        result = []
        for product in products:
            customer_price = custom_prices.get(product.id)
            effective_price = customer_price if customer_price is not None else product.default_price
            result.append({
                'id': product.id,
                'name': product.name,
                'pack_size': product.pack_size,
                'sku': product.sku,
                'category_name': product.category.name if product.category else '',
                'default_price': product.default_price,
                'customer_price': customer_price,
                'effective_price': effective_price,
                'stock_quantity': product.stock_quantity,
                'minimum_stock': product.minimum_stock,
                'unit': product.unit,
                'image_url': product.image_url,
                'is_active': product.is_active,
                'is_low_stock': product.is_low_stock,
            })

        serializer = ProductWithCustomerPriceSerializer(result, many=True)
        return Response(serializer.data)


class PriceHistoryView(generics.ListAPIView):
    permission_classes = [IsOwner]
    serializer_class = PriceHistorySerializer

    def get_queryset(self):
        queryset = PriceHistory.objects.select_related('product', 'customer', 'changed_by')
        product_id = self.request.query_params.get('product')
        customer_id = self.request.query_params.get('customer')
        if product_id:
            queryset = queryset.filter(product_id=product_id)
        if customer_id:
            queryset = queryset.filter(customer_id=customer_id)
        return queryset
