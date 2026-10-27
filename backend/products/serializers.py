from rest_framework import serializers
from .models import Product, Category


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name']


class ProductSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    is_low_stock = serializers.BooleanField(read_only=True)
    category = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(), required=False, allow_null=True
    )

    class Meta:
        model = Product
        fields = [
            'id', 'name', 'category', 'category_name', 'pack_size', 'sku',
            'default_price', 'stock_quantity', 'minimum_stock', 'unit',
            'image_url', 'description', 'is_active', 'is_low_stock',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'sku', 'created_at', 'updated_at']


class ProductListSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    is_low_stock = serializers.BooleanField(read_only=True)

    class Meta:
        model = Product
        fields = [
            'id', 'name', 'category', 'category_name', 'pack_size', 'sku',
            'default_price', 'stock_quantity', 'minimum_stock',
            'unit', 'image_url', 'description', 'is_active', 'is_low_stock'
        ]
