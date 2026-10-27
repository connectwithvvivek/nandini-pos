from rest_framework import serializers
from .models import Customer


class CustomerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = [
            'id', 'customer_code', 'name', 'phone', 'address',
            'customer_type', 'notes', 'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'customer_code', 'created_at', 'updated_at']


class CustomerListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = ['id', 'customer_code', 'name', 'phone', 'customer_type', 'is_active']
