from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.utils import timezone
from .models import Shift, EmployeeShift
from .serializers import ShiftSerializer, EmployeeShiftSerializer
from accounts.permissions import IsOwner, IsOwnerOrEmployee


class ShiftListView(generics.ListCreateAPIView):
    queryset = Shift.objects.filter(is_active=True)
    serializer_class = ShiftSerializer
    permission_classes = [IsOwnerOrEmployee]


class ShiftDetailView(generics.RetrieveUpdateAPIView):
    queryset = Shift.objects.all()
    serializer_class = ShiftSerializer
    permission_classes = [IsOwnerOrEmployee]


class OpenShiftView(APIView):
    permission_classes = [IsOwnerOrEmployee]

    def post(self, request):
        shift_id = request.data.get('shift')
        opening_cash = request.data.get('opening_cash', 0)

        if not shift_id:
            return Response({'detail': 'shift is required.'}, status=status.HTTP_400_BAD_REQUEST)

        today = timezone.localdate()
        existing = EmployeeShift.objects.filter(
            employee=request.user, date=today, status='OPEN'
        ).first()

        if existing:
            serializer = EmployeeShiftSerializer(existing)
            return Response(serializer.data)

        shift = generics.get_object_or_404(Shift, pk=shift_id)
        employee_shift = EmployeeShift.objects.create(
            employee=request.user,
            shift=shift,
            date=today,
            opening_cash=opening_cash,
            status='OPEN'
        )
        serializer = EmployeeShiftSerializer(employee_shift)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class CloseShiftView(APIView):
    permission_classes = [IsOwnerOrEmployee]

    def post(self, request):
        closing_cash = request.data.get('closing_cash', 0)
        notes = request.data.get('notes', '')
        today = timezone.localdate()

        employee_shift = EmployeeShift.objects.filter(
            employee=request.user, date=today, status='OPEN'
        ).first()

        if not employee_shift:
            return Response({'detail': 'No open shift found.'}, status=status.HTTP_404_NOT_FOUND)

        employee_shift.status = 'CLOSED'
        employee_shift.closed_at = timezone.now()
        employee_shift.closing_cash = closing_cash
        employee_shift.notes = notes
        employee_shift.save()

        serializer = EmployeeShiftSerializer(employee_shift)
        return Response(serializer.data)


class CurrentShiftView(APIView):
    permission_classes = [IsOwnerOrEmployee]

    def get(self, request):
        today = timezone.localdate()
        employee_shift = EmployeeShift.objects.filter(
            employee=request.user, date=today, status='OPEN'
        ).select_related('shift').first()

        # If user is owner and doesn't have an open shift today, check if any open shift exists
        # or auto-activate owner shift with the first active shift so owner is never blocked
        if not employee_shift and request.user.is_owner:
            open_shift = EmployeeShift.objects.filter(
                date=today, status='OPEN'
            ).select_related('shift').first()
            if open_shift:
                serializer = EmployeeShiftSerializer(open_shift)
                return Response(serializer.data)

            active_shift = Shift.objects.filter(is_active=True).first()
            if active_shift:
                employee_shift = EmployeeShift.objects.filter(
                    employee=request.user, shift=active_shift, date=today
                ).first()
                if not employee_shift:
                    employee_shift = EmployeeShift.objects.create(
                        employee=request.user,
                        shift=active_shift,
                        date=today,
                        opening_cash=0,
                        status='OPEN'
                    )
                elif employee_shift.status != 'OPEN':
                    employee_shift.status = 'OPEN'
                    employee_shift.save(update_fields=['status'])
                serializer = EmployeeShiftSerializer(employee_shift)
                return Response(serializer.data)

        if not employee_shift:
            return Response({'detail': 'No active shift.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = EmployeeShiftSerializer(employee_shift)
        return Response(serializer.data)


class EmployeeShiftListView(generics.ListAPIView):
    serializer_class = EmployeeShiftSerializer
    permission_classes = [IsOwnerOrEmployee]

    def get_queryset(self):
        queryset = EmployeeShift.objects.select_related('employee', 'shift').order_by('-date', '-opened_at')
        user = self.request.user
        if not user.is_owner:
            queryset = queryset.filter(employee=user)

        date = self.request.query_params.get('date')
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')
        employee = self.request.query_params.get('employee')
        shift = self.request.query_params.get('shift')
        if date:
            queryset = queryset.filter(date=date)
        if date_from:
            queryset = queryset.filter(date__gte=date_from)
        if date_to:
            queryset = queryset.filter(date__lte=date_to)
        if employee and user.is_owner:
            queryset = queryset.filter(employee_id=employee)
        if shift:
            queryset = queryset.filter(shift_id=shift)
        return queryset
