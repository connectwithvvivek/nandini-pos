import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { OwnerLayout, EmployeeLayout } from '../components/layout/Layout'
import { PageLoader } from '../components/ui/Spinner'

import LoginPage from '../pages/auth/LoginPage'
import DashboardPage from '../pages/owner/DashboardPage'
import CustomersPage from '../pages/owner/CustomersPage'
import CustomerDetailPage from '../pages/owner/CustomerDetailPage'
import ProductsPage from '../pages/owner/ProductsPage'
import InventoryPage from '../pages/owner/InventoryPage'
import SalesPage from '../pages/owner/SalesPage'
import SaleDetailPage from '../pages/owner/SaleDetailPage'
import ShiftsPage from '../pages/owner/ShiftsPage'
import EmployeesPage from '../pages/owner/EmployeesPage'
import ReportsPage from '../pages/owner/ReportsPage'
import CreditPage from '../pages/owner/CreditPage'
import PendingBillsPage from '../pages/owner/PendingBillsPage'
import POSHomePage from '../pages/pos/POSHomePage'
import CustomerPOSPage from '../pages/pos/CustomerPOSPage'
import BillPage from '../pages/pos/BillPage'
import MyShiftPage from '../pages/pos/MyShiftPage'
import EmployeeDashboardPage from '../pages/pos/EmployeeDashboardPage'
import SettingsPage from '../pages/owner/SettingsPage'

export default function AppRoutes() {
  const { user, loading } = useAuth()

  if (loading) return <PageLoader />

  // Unauthenticated routes
  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    )
  }

  // Authenticated Owner routes
  if (user.role === 'OWNER') {
    return (
      <OwnerLayout>
        <Routes>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/pos" element={<POSHomePage />} />
          <Route path="/pos/customer/:customerId" element={<CustomerPOSPage />} />
          <Route path="/pos/bill" element={<BillPage />} />
          <Route path="/customers" element={<CustomersPage />} />
          <Route path="/customers/:id" element={<CustomerDetailPage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/inventory" element={<InventoryPage />} />
          <Route path="/sales" element={<SalesPage />} />
          <Route path="/sales/:id" element={<SaleDetailPage />} />
          <Route path="/credit" element={<CreditPage />} />
          <Route path="/pending-bills" element={<PendingBillsPage />} />
          <Route path="/shifts" element={<ShiftsPage />} />
          <Route path="/shift" element={<MyShiftPage />} />
          <Route path="/my-shift" element={<MyShiftPage />} />
          <Route path="/employees" element={<EmployeesPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/login" element={<Navigate to="/dashboard" replace />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </OwnerLayout>
    )
  }

  // Authenticated Employee routes
  return (
    <EmployeeLayout>
      <Routes>
        <Route path="/dashboard" element={<EmployeeDashboardPage />} />
        <Route path="/pos" element={<POSHomePage />} />
        <Route path="/pos/customer/:customerId" element={<CustomerPOSPage />} />
        <Route path="/pos/bill" element={<BillPage />} />
        <Route path="/customers" element={<CustomersPage />} />
        <Route path="/customers/:id" element={<CustomerDetailPage />} />
        <Route path="/pending-bills" element={<PendingBillsPage />} />
        <Route path="/sales" element={<SalesPage />} />
        <Route path="/sales/:id" element={<SaleDetailPage />} />
        <Route path="/shift" element={<MyShiftPage />} />
        <Route path="/my-shift" element={<MyShiftPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/login" element={<Navigate to="/dashboard" replace />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </EmployeeLayout>
  )
}
