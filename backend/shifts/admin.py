from django.contrib import admin
from .models import Shift, EmployeeShift

@admin.register(Shift)
class ShiftAdmin(admin.ModelAdmin):
    list_display = ['name', 'start_time', 'end_time', 'is_active']

@admin.register(EmployeeShift)
class EmployeeShiftAdmin(admin.ModelAdmin):
    list_display = ['employee', 'shift', 'date', 'status', 'opened_at', 'closed_at']
    list_filter = ['shift', 'status', 'date']
    search_fields = ['employee__full_name']
