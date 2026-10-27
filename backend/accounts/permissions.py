from rest_framework.permissions import BasePermission


class IsOwner(BasePermission):
    message = "You don't have permission to perform this action."

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_owner)


class IsOwnerOrEmployee(BasePermission):
    message = "Authentication required."

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role in ('OWNER', 'EMPLOYEE'))
