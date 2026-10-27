from django.urls import path
from .views import DashboardTodayView, DashboardReportsView, StoreInfoView, LogoUploadView

urlpatterns = [
    path('', DashboardTodayView.as_view(), name='dashboard'),
    path('today/', DashboardTodayView.as_view(), name='dashboard-today'),
    path('reports/', DashboardReportsView.as_view(), name='dashboard-reports'),
    path('store-info/', StoreInfoView.as_view(), name='dashboard-store-info'),
    path('store-info/logo/', LogoUploadView.as_view(), name='dashboard-logo-upload'),
]
