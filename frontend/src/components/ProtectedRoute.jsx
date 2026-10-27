import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { PageLoader } from './ui/Spinner'

export function ProtectedRoute({ allowedRoles }) {
  const { user, loading } = useAuth()
  if (loading) return <PageLoader />
  if (!user) return <Navigate to="/login" replace />
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={user.role === 'OWNER' ? '/dashboard' : '/pos'} replace />
  }
  return <Outlet />
}
