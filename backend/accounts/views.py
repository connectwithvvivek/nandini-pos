from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken
from .models import User
from .serializers import CustomTokenObtainPairSerializer, UserSerializer, UserCreateSerializer
from .permissions import IsOwner


class LoginView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data.get('refresh')
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response({'detail': 'Logged out successfully.'})
        except Exception:
            return Response({'detail': 'Invalid token.'}, status=status.HTTP_400_BAD_REQUEST)


class MeView(generics.RetrieveUpdateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = UserSerializer

    def get_object(self):
        return self.request.user

    def patch(self, request, *args, **kwargs):
        user = self.get_object()
        new_password = request.data.get('new_password')
        current_password = request.data.get('current_password')

        if new_password:
            if current_password and not user.check_password(current_password):
                return Response({'detail': 'Current password does not match.'}, status=status.HTTP_400_BAD_REQUEST)
            if len(new_password) < 6:
                return Response({'detail': 'New password must be at least 6 characters.'}, status=status.HTTP_400_BAD_REQUEST)
            user.set_password(new_password)
            user.save()

        return super().patch(request, *args, **kwargs)


class EmployeeListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsOwner]
    queryset = User.objects.filter(role='EMPLOYEE').order_by('full_name')

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return UserCreateSerializer
        return UserSerializer


class EmployeeDetailView(generics.RetrieveUpdateAPIView):
    permission_classes = [IsOwner]
    queryset = User.objects.filter(role='EMPLOYEE')

    def get_serializer_class(self):
        if self.request.method in ('PUT', 'PATCH'):
            return UserCreateSerializer
        return UserSerializer
