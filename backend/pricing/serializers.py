from rest_framework import serializers
from .models import CustomerProductPrice, PriceHistory
from products.serializers import ProductListSerializer


class CustomerProductPriceSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_pack_size = serializers.CharField(source='product.pack_size', read_only=True)
    default_price = serializers.DecimalField(source='product.default_price', max_digits=10, decimal_places=2, read_only=True)
    product_image_url = serializers.CharField(source='product.image_url', read_only=True)

    class Meta:
        model = CustomerProductPrice
        fields = [
            'id', 'customer', 'product', 'product_name', 'product_pack_size',
            'default_price', 'product_image_url', 'price', 'updated_at'
        ]
        read_only_fields = ['id', 'updated_at']


class PriceHistorySerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    customer_name = serializers.CharField(source='customer.name', read_only=True)
    changed_by_name = serializers.CharField(source='changed_by.full_name', read_only=True)

    class Meta:
        model = PriceHistory
        fields = [
            'id', 'price_type', 'product', 'product_name', 'customer', 'customer_name',
            'old_price', 'new_price', 'changed_by_name', 'changed_at'
        ]


class ProductWithCustomerPriceSerializer(serializers.Serializer):
    """Returns all products with customer-specific price if available."""
    id = serializers.IntegerField()
    name = serializers.CharField()
    pack_size = serializers.CharField()
    sku = serializers.CharField()
    category_name = serializers.CharField()
    default_price = serializers.DecimalField(max_digits=10, decimal_places=2)
    customer_price = serializers.DecimalField(max_digits=10, decimal_places=2, allow_null=True)
    effective_price = serializers.DecimalField(max_digits=10, decimal_places=2)
    stock_quantity = serializers.DecimalField(max_digits=10, decimal_places=2)
    minimum_stock = serializers.DecimalField(max_digits=10, decimal_places=2)
    unit = serializers.CharField()
    image_url = serializers.CharField()
    is_active = serializers.BooleanField()
    is_low_stock = serializers.BooleanField()
