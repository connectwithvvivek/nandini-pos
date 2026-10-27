from django.db.models import Q
import django_filters
from .models import Customer


class CustomerFilter(django_filters.FilterSet):
    search = django_filters.CharFilter(method='filter_search')
    customer_type = django_filters.ChoiceFilter(choices=Customer.CUSTOMER_TYPE_CHOICES)
    is_active = django_filters.BooleanFilter()

    class Meta:
        model = Customer
        fields = ['customer_type', 'is_active']

    def filter_search(self, queryset, name, value):
        return queryset.filter(
            Q(name__icontains=value) |
            Q(customer_code__icontains=value) |
            Q(phone__icontains=value)
        )
