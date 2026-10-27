import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  TrendingUp, Banknote, CreditCard, Receipt, Users,
  AlertTriangle, Clock, ArrowUpRight, ArrowDownRight, CheckCircle, ChevronRight,
  RefreshCw, ShoppingCart, ChevronDown, ChevronUp, QrCode,
  Package, DollarSign, Store, ArrowRight, Sparkles
} from '../../components/ui/icons'
import { dashboardApi } from '../../api'
import { formatCurrency, formatTime, formatDateTime } from '../../lib/utils'
import { useAuth } from '../../hooks/useAuth'
import { PageLoader } from '../../components/ui/Spinner'
import { Badge } from '../../components/ui/Badge'

export default function DashboardPage() {
  const { user } = useAuth()
  const [showAllRecentSales, setShowAllRecentSales] = useState(false)
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => dashboardApi.today().then(r => r.data),
    refetchInterval: 30000,
  })

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening'

  if (isLoading) return <PageLoader />

  const activeShift = data?.active_shift
  const totalSales = Number(data?.total_sales || 0)
  const cashSales = Number(data?.cash_received_today || 0)
  const onlineSales = Number(data?.online_received_today || 0)
  const totalOutstanding = Number(data?.total_outstanding || 0)
  const creditGiven = Number(data?.credit_given_today || 0)
  const creditCollected = Number(data?.credit_collected_today || 0)
  const pendingBillsCount = Number(data?.pending_bills_count ?? 0)

  // Percentages for the 4 KPI cards
  const cashShare = totalSales > 0 ? Math.round((cashSales / totalSales) * 100) : 0
  const onlineShare = totalSales > 0 ? Math.round((onlineSales / totalSales) * 100) : 0
  const dueRatio = (totalSales + totalOutstanding) > 0
    ? Math.round((totalOutstanding / (totalSales + totalOutstanding)) * 100)
    : 0

  return (
    <div className="space-y-4 sm:space-y-5 max-w-7xl mx-auto px-3 sm:px-4 md:px-6 py-3 sm:py-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 sm:p-4 rounded-2xl border border-gray-100 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h1 className="text-lg sm:text-xl font-black text-gray-900 tracking-tight">
              {greeting}, {user?.full_name?.split(' ')[0]}
            </h1>
            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-full">
              Store Owner
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} · Nandini Dairy Parlour
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition cursor-pointer"
            title="Refresh Data"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
          <Link
            to="/shift"
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition cursor-pointer"
          >
            <Clock className="w-3.5 h-3.5 text-emerald-700" />
            <span>My Shift</span>
          </Link>
          <Link
            to="/pos"
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-green-700 hover:bg-green-800 rounded-xl transition shadow-xs cursor-pointer"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>Open POS</span>
          </Link>
        </div>
      </div>

      {/* 4 Simple KPI Cards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-black text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-700" />
            <span>Today's Overview</span>
          </h2>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* 1. Today's Sales */}
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Today's Sales</span>
              <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100">
                <ArrowUpRight className="w-3 h-3 text-emerald-600" />
                <span>100%</span>
              </span>
            </div>
            <div className="mt-2.5">
              <p className="text-lg sm:text-2xl font-black text-gray-900 truncate">
                {formatCurrency(totalSales)}
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5 font-medium">{data?.bill_count || 0} bills completed</p>
            </div>
          </div>

          {/* 2. Cash Received */}
          <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-100 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Cash Received</span>
              <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-emerald-800 bg-white/90 px-2 py-0.5 rounded-lg border border-emerald-200">
                <ArrowUpRight className="w-3 h-3 text-emerald-600" />
                <span>{cashShare}%</span>
              </span>
            </div>
            <div className="mt-2.5">
              <p className="text-lg sm:text-2xl font-black text-emerald-950 truncate">
                {formatCurrency(cashSales)}
              </p>
              <p className="text-[10px] text-emerald-700 mt-0.5 font-medium">Cash in counter drawer</p>
            </div>
          </div>

          {/* 3. Online Received */}
          <div className="bg-blue-50/60 p-4 rounded-2xl border border-blue-100 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wider">Online / UPI</span>
              <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-blue-800 bg-white/90 px-2 py-0.5 rounded-lg border border-blue-200">
                <ArrowUpRight className="w-3 h-3 text-blue-600" />
                <span>{onlineShare}%</span>
              </span>
            </div>
            <div className="mt-2.5">
              <p className="text-lg sm:text-2xl font-black text-blue-950 truncate">
                {formatCurrency(onlineSales)}
              </p>
              <p className="text-[10px] text-blue-700 mt-0.5 font-medium">Direct Bank QR payments</p>
            </div>
          </div>

          {/* 4. Total Outstanding Due */}
          <div className="bg-red-50/60 p-4 rounded-2xl border border-red-100 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-red-800 uppercase tracking-wider">Total Due</span>
              <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-red-800 bg-white/90 px-2 py-0.5 rounded-lg border border-red-200">
                <ArrowDownRight className="w-3 h-3 text-red-600" />
                <span>{dueRatio}%</span>
              </span>
            </div>
            <div className="mt-2.5">
              <p className="text-lg sm:text-2xl font-black text-red-950 truncate">
                {formatCurrency(totalOutstanding)}
              </p>
              <p className="text-[10px] text-red-700 mt-0.5 font-medium">Customer credit balance</p>
            </div>
          </div>
        </div>

        {/* Today's Glance (Informative strip below the 4 KPI cards without heavy card borders) */}
        <div className="bg-white rounded-2xl border border-gray-100 p-3.5 sm:p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold text-gray-800 uppercase tracking-wider">Today's Glance</span>
            </div>
            <span className="text-[11px] text-gray-400 font-medium">Operational Summary</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs divide-y sm:divide-y-0 sm:divide-x divide-gray-100">
            <div className="pt-2 sm:pt-0 sm:pr-3">
              <span className="text-gray-400 text-[10px] font-bold uppercase block">Credit Given Today</span>
              <span className="text-sm sm:text-base font-black text-amber-900 mt-0.5 block">{formatCurrency(creditGiven)}</span>
              <span className="text-[10px] text-amber-700 font-medium">New dues today</span>
            </div>

            <div className="pt-2 sm:pt-0 sm:px-3">
              <span className="text-gray-400 text-[10px] font-bold uppercase block">Credit Collected</span>
              <span className="text-sm sm:text-base font-black text-purple-900 mt-0.5 block">{formatCurrency(creditCollected)}</span>
              <span className="text-[10px] text-purple-700 font-medium">Settled today</span>
            </div>

            <div className="pt-2 sm:pt-0 sm:px-3">
              <span className="text-gray-400 text-[10px] font-bold uppercase block">Pending Bills</span>
              <span className="text-sm sm:text-base font-black text-orange-900 mt-0.5 block">{pendingBillsCount}</span>
              <Link to="/pending-bills" className="text-[10px] text-orange-700 font-bold hover:underline">View pending →</Link>
            </div>

            <div className="pt-2 sm:pt-0 sm:pl-3">
              <span className="text-gray-400 text-[10px] font-bold uppercase block">Active Counter Shift</span>
              <span className="text-sm font-bold text-gray-900 mt-0.5 block truncate">
                {activeShift ? activeShift.shift_name : 'No Shift Open'}
              </span>
              <span className="text-[10px] text-emerald-700 font-medium truncate block">
                {activeShift ? `Staff: ${activeShift.employee_name}` : 'Tap to start shift'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Shift & Working Status Banner (Light, Simple & Professional) */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                  Shift Operations
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              {activeShift ? (
                <p className="text-sm sm:text-base font-bold text-gray-900 mt-0.5">
                  Current Open Shift: <span className="text-emerald-700">{activeShift.shift_name}</span> · Staff: <span className="text-gray-700">{activeShift.employee_name}</span>
                </p>
              ) : (
                <p className="text-sm font-semibold text-gray-700 mt-0.5">
                  No active shift currently open · Start your shift to begin billing
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
            {activeShift && (
              <div className="text-right text-xs text-gray-500 hidden md:block mr-2">
                <span>Float:</span>
                <strong className="block text-gray-900 text-sm">{formatCurrency(activeShift.opening_cash)}</strong>
              </div>
            )}
            <Link
              to="/shift"
              className="px-3.5 py-2 bg-emerald-50 text-emerald-800 font-bold rounded-xl text-xs hover:bg-emerald-100 transition border border-emerald-200/80 flex items-center gap-1.5 shadow-2xs"
            >
              <Clock className="w-3.5 h-3.5 text-emerald-700" />
              <span>My Shift (Owner)</span>
            </Link>
            <Link
              to="/shifts"
              className="px-3 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 font-bold rounded-xl text-xs transition border border-gray-200"
            >
              All Shifts Audit
            </Link>
          </div>
        </div>
      </div>

      {/* Main Grid: Shift Performance + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
        {/* Shift Performance Breakdown (3 Daily Shifts) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-xs p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs sm:text-sm font-bold text-gray-900 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-emerald-700" />
              <span>Today's 3 Shifts Performance</span>
            </h2>
            <Link to="/shifts" className="text-xs text-emerald-700 font-bold hover:underline">
              View Audit Log →
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
            {data?.shifts?.map(shift => (
              <div key={shift.id} className="bg-gray-50/80 rounded-2xl p-3 border border-gray-100 space-y-1.5 hover:bg-gray-50 transition">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-800">{shift.name}</span>
                  <span className="text-[10px] font-semibold text-gray-500">{shift.bill_count} bills</span>
                </div>
                <p className="text-base sm:text-lg font-black text-gray-900">{formatCurrency(shift.total)}</p>
                <div className="flex items-center justify-between text-[11px] text-gray-500 pt-1.5 border-t border-gray-200/60">
                  <span>Cash: <strong className="text-emerald-700">{formatCurrency(shift.cash_sales || 0)}</strong></span>
                  <span>UPI: <strong className="text-blue-700">{formatCurrency(shift.online_sales || 0)}</strong></span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Operations & Credit Access */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-xs p-4 sm:p-5 space-y-2.5">
          <h2 className="text-xs sm:text-sm font-bold text-gray-900">Quick Actions</h2>
          <div className="space-y-2">
            <Link
              to="/pending-bills"
              className="flex items-center justify-between p-3 rounded-xl bg-orange-50/70 border border-orange-100 hover:bg-orange-100/70 transition"
            >
              <div>
                <p className="text-xs font-bold text-orange-950">Pending Bills Register</p>
                <p className="text-[10px] text-orange-700">Collect dues ({data?.pending_bills_count || 0} pending)</p>
              </div>
              <ChevronRight className="w-4 h-4 text-orange-700" />
            </Link>

            <Link
              to="/credit"
              className="flex items-center justify-between p-3 rounded-xl bg-amber-50/70 border border-amber-100 hover:bg-amber-100/70 transition"
            >
              <div>
                <p className="text-xs font-bold text-amber-950">Credit Audit & Customers</p>
                <p className="text-[10px] text-amber-700">Track who gave credit & settlements</p>
              </div>
              <ChevronRight className="w-4 h-4 text-amber-700" />
            </Link>

            <Link
              to="/inventory"
              className="flex items-center justify-between p-3 rounded-xl bg-purple-50/70 border border-purple-100 hover:bg-purple-100/70 transition"
            >
              <div>
                <p className="text-xs font-bold text-purple-950">Stock Adjust & Counter Inventory</p>
                <p className="text-[10px] text-purple-700">Update milk, curd and parlour items</p>
              </div>
              <ChevronRight className="w-4 h-4 text-purple-700" />
            </Link>

            <Link
              to="/reports"
              className="flex items-center justify-between p-3 rounded-xl bg-green-50/70 border border-green-100 hover:bg-green-100/70 transition"
            >
              <div>
                <p className="text-xs font-bold text-green-950">Daily Sales & Reconciliation</p>
                <p className="text-[10px] text-green-700">Download end of day register</p>
              </div>
              <ChevronRight className="w-4 h-4 text-green-700" />
            </Link>
          </div>
        </div>
      </div>

      {/* Bottom Row: Recent Sales & Low Stock Inventory */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
        {/* Recent Sales Transactions (Shows 6 by default with Show More button) */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-xs p-4 sm:p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs sm:text-sm font-bold text-gray-900 flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-emerald-700" />
                <span>Recent Invoices & Bills</span>
              </h2>
              <Link to="/sales" className="text-xs text-emerald-700 font-bold hover:underline">View all bills →</Link>
            </div>

            <div className="space-y-1.5">
              {(!data?.recent_sales || data.recent_sales.length === 0) && (
                <p className="text-xs text-gray-400 text-center py-6">No sales recorded today yet</p>
              )}
              {(showAllRecentSales ? (data?.recent_sales || []) : (data?.recent_sales || []).slice(0, 6)).map(sale => (
                <Link
                  key={sale.id}
                  to={`/sales/${sale.id}`}
                  className="flex items-center justify-between py-2 px-2.5 rounded-xl hover:bg-gray-50 border border-transparent hover:border-gray-100 transition cursor-pointer"
                >
                  <div className="min-w-0 pr-2">
                    <p className="text-xs font-bold text-gray-900 truncate">{sale.customer_name}</p>
                    <p className="text-[10px] text-gray-400 truncate">
                      {sale.bill_number} · {formatTime(sale.created_at)} · {sale.shift_name}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-black text-gray-900">{formatCurrency(sale.total)}</p>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                      sale.payment_method === 'CREDIT'
                        ? 'bg-amber-100 text-amber-800'
                        : sale.payment_method === 'CASH'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {sale.payment_method === 'CREDIT' ? (sale.credit_status || 'Credit') : sale.payment_method}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {(data?.recent_sales || []).length > 6 && (
            <div className="pt-2.5 mt-2 flex items-center justify-between border-t border-gray-100 text-xs">
              <span className="text-gray-400 text-[11px]">
                Showing {showAllRecentSales ? data.recent_sales.length : 6} of {data.recent_sales.length} bills
              </span>
              <button
                type="button"
                onClick={() => setShowAllRecentSales(s => !s)}
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-800 font-bold rounded-xl transition cursor-pointer"
              >
                <span>{showAllRecentSales ? 'Show Less' : `Show More (${data.recent_sales.length - 6} more)`}</span>
                {showAllRecentSales ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>
          )}
        </div>

        {/* Low Stock Alerts */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-xs p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs sm:text-sm font-bold text-gray-900 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <span>Low Stock Alerts</span>
            </h2>
            <Link to="/inventory" className="text-xs text-emerald-700 font-bold hover:underline">Manage Stock →</Link>
          </div>

          <div className="space-y-1.5">
            {(!data?.low_stock_products || data.low_stock_products.length === 0) && (
              <div className="py-6 text-center space-y-1">
                <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto" />
                <p className="text-xs text-gray-500 font-medium">All counter inventory levels are healthy</p>
              </div>
            )}
            {data?.low_stock_products?.map(p => (
              <div key={p.id} className="flex items-center justify-between py-2 px-3 rounded-xl bg-red-50/70 border border-red-100">
                <div className="min-w-0 pr-2">
                  <p className="text-xs font-bold text-gray-900 truncate">{p.name}</p>
                  <p className="text-[10px] text-gray-500">{p.pack_size}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-black text-red-700">{p.stock_quantity} {p.unit}</p>
                  <p className="text-[10px] text-gray-400">Min: {p.minimum_stock}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
