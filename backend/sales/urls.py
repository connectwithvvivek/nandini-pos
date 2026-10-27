from django.urls import path
from .views import (
    SaleListView, SaleCreateView, SaleDetailView, SaleCancelView, CustomerSalesView,
    CreditSummaryView, CreditBillListView, CreditBillDetailView, CreditBillPaymentView,
    CustomerCreditLedgerView, OutstandingCustomersView, CreditPaymentListView
)

urlpatterns = [
    path('', SaleListView.as_view(), name='sale-list'),
    path('create/', SaleCreateView.as_view(), name='sale-create'),
    path('<int:pk>/', SaleDetailView.as_view(), name='sale-detail'),
    path('<int:pk>/cancel/', SaleCancelView.as_view(), name='sale-cancel'),
    path('customer/<int:customer_id>/', CustomerSalesView.as_view(), name='customer-sales'),

    # Credit & Receivables
    path('credit/summary/', CreditSummaryView.as_view(), name='credit-summary'),
    path('credit/bills/', CreditBillListView.as_view(), name='credit-bills-list'),
    path('credit/bills/<int:pk>/', CreditBillDetailView.as_view(), name='credit-bill-detail'),
    path('credit/bills/<int:pk>/pay/', CreditBillPaymentView.as_view(), name='credit-bill-pay'),
    path('credit/customer/<int:customer_id>/', CustomerCreditLedgerView.as_view(), name='customer-credit-ledger'),
    path('credit/customers/', OutstandingCustomersView.as_view(), name='outstanding-customers'),
    path('credit/payments/', CreditPaymentListView.as_view(), name='credit-payments-list'),
]
