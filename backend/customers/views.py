from rest_framework import generics, filters
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q
from .models import Customer
from .serializers import CustomerSerializer, CustomerListSerializer
from accounts.permissions import IsOwner, IsOwnerOrEmployee


class CustomerListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsOwnerOrEmployee]

    def get_queryset(self):
        queryset = Customer.objects.all()
        search = self.request.query_params.get('search', '')
        is_active = self.request.query_params.get('is_active', None)
        customer_type = self.request.query_params.get('customer_type', None)

        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) |
                Q(customer_code__icontains=search) |
                Q(phone__icontains=search)
            )
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')
        if customer_type:
            queryset = queryset.filter(customer_type=customer_type)

        return queryset.order_by('name')

    def get_serializer_class(self):
        if self.request.method == 'GET':
            return CustomerListSerializer
        return CustomerSerializer

    def get_permissions(self):
        return [IsOwnerOrEmployee()]


class CustomerDetailView(generics.RetrieveUpdateAPIView):
    queryset = Customer.objects.all()
    serializer_class = CustomerSerializer

    def get_object(self):
        lookup = self.kwargs.get('pk_or_code') or self.kwargs.get('pk')
        if str(lookup).isdigit():
            obj = Customer.objects.filter(pk=int(lookup)).first()
            if obj:
                return obj
        obj = Customer.objects.filter(customer_code__iexact=str(lookup)).first()
        if not obj:
            obj = Customer.objects.filter(phone=str(lookup)).first()
        if not obj:
            from django.http import Http404
            raise Http404("Customer not found.")
        return obj

    def get_permissions(self):
        if self.request.method in ('PUT', 'PATCH'):
            return [IsOwner()]
        return [IsOwnerOrEmployee()]
