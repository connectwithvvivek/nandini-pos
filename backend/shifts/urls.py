from django.urls import path
from .views import ShiftListView, ShiftDetailView, OpenShiftView, CloseShiftView, CurrentShiftView, EmployeeShiftListView

urlpatterns = [
    path('', ShiftListView.as_view(), name='shift-list'),
    path('<int:pk>/', ShiftDetailView.as_view(), name='shift-detail'),
    path('open/', OpenShiftView.as_view(), name='shift-open'),
    path('close/', CloseShiftView.as_view(), name='shift-close'),
    path('current/', CurrentShiftView.as_view(), name='shift-current'),
    path('employee-shifts/', EmployeeShiftListView.as_view(), name='employee-shift-list'),
]
