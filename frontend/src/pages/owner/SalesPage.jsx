import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  Search, Filter, Banknote, Smartphone, CreditCard,
  Calendar, CheckCircle, XCircle, Clock, ChevronRight,
  Receipt, ArrowUpRight, RefreshCw, QrCode
} from 'lucide-react'
import { salesApi } from '../../api'
import { formatCurrency, formatDateTime } from '../../lib/utils'
import { PageLoader } from '../../components/ui/Spinner'

export default function SalesPage() {
  const [filters, setFilters] = useState({
    date_from: '',
    date_to: '',
    payment_method: '',
    status: '',
    bill_number: '',
    search: '',
  })
  const [showFilters, setShowFilters] = useState(false)

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['sales', filters],
    queryFn: () => salesApi.list({ ...filters, page_size: 100 }).then(r => r.data),
  })

  const sales = data?.results || []

  // Aggregate stats from fetched sales
  const stats = useMemo(() => {
    let totalRevenue = 0
    let cashVolume = 0
    let onlineVolume = 0
    let creditVolume = 0

    sales.forEach(s => {
      if (s.status === 'COMPLETED') {
        const amt = parseFloat(s.total) || 0
        totalRevenue += amt
        if (s.payment_method === 'CASH') cashVolume += amt
        else if (s.payment_method === 'ONLINE' || s.payment_method === 'UPI') onlineVolume += amt
        else if (s.payment_method === 'CREDIT') creditVolume += amt
      }
    })

    return {
      count: sales.length,
      totalRevenue,
      cashVolume,
      onlineVolume,
      creditVolume,
    }
  }, [sales])

  const setFilter = (key, val) => setFilters(prev => ({ ...prev, [key]: val }))
  const resetFilters = () => setFilters({
    date_from: '',
    date_to: '',
    payment_method: '',
    status: '',
    bill_number: '',
    search: '',
  })

  const hasActiveFilters = Boolean(
    filters.date_from || filters.date_to || filters.payment_method || filters.status || filters.bill_number || filters.search
  )

  // Payment badge renderer
  const renderPaymentBadge = (sale) => {
    const method = sale.payment_method
    if (method === 'CREDIT') {
      const creditStatus = sale.credit_status || 'PENDING'
      if (creditStatus === 'PAID') {
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CreditCard className="w-3 h-3" />
            Credit · Paid
          </span>
        )
      }
      if (creditStatus === 'PARTIALLY_PAID') {
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <CreditCard className="w-3 h-3" />
            Credit · Partial
          </span>
        )
      }
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-50 text-red-700 border border-red-200">
          <CreditCard className="w-3 h-3" />
          Credit · Pending
        </span>
      )
    }

    if (method === 'ONLINE' || method === 'UPI') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
          <QrCode className="w-3 h-3" />
          Online · Paid
        </span>
      )
    }

    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
        <Banknote className="w-3 h-3" />
        Cash · Paid
      </span>
    )
  }

  return (
    <div className="p-3 sm:p-5 lg:p-6 max-w-7xl mx-auto space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-green-50 text-green-700 rounded-xl">
              <Receipt className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">Sales History</h1>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Complete transaction history with Cash, Online & Credit payment tracking
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => setShowFilters(s => !s)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition shadow-xs border ${
              showFilters || hasActiveFilters
                ? 'bg-green-700 text-white border-green-700'
                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Filters {hasActiveFilters && '(Active)'}</span>
          </button>
        </div>
      </div>

      {/* KPI Volume Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Total Revenue */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-gray-100 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Total Sales</span>
            <span className="p-1.5 bg-gray-100 text-gray-600 rounded-lg">
              <Receipt className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="mt-2 text-lg sm:text-xl font-black text-gray-900">
            {formatCurrency(stats.totalRevenue)}
          </div>
          <p className="text-[10px] text-gray-400 mt-0.5">{stats.count} bills recorded</p>
        </div>

        {/* Cash Volume */}
        <div className="bg-emerald-50/70 p-3.5 sm:p-4 rounded-2xl border border-emerald-100 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Cash Sales</span>
            <span className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg">
              <Banknote className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="mt-2 text-lg sm:text-xl font-black text-emerald-900">
            {formatCurrency(stats.cashVolume)}
          </div>
          <p className="text-[10px] text-emerald-600 mt-0.5 font-medium">Cash in counter</p>
        </div>

        {/* Online Volume */}
        <div className="bg-blue-50/70 p-3.5 sm:p-4 rounded-2xl border border-blue-100 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">Online / UPI</span>
            <span className="p-1.5 bg-blue-100 text-blue-700 rounded-lg">
              <QrCode className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="mt-2 text-lg sm:text-xl font-black text-blue-900">
            {formatCurrency(stats.onlineVolume)}
          </div>
          <p className="text-[10px] text-blue-600 mt-0.5 font-medium">Direct bank credits</p>
        </div>

        {/* Credit Volume */}
        <div className="bg-amber-50/70 p-3.5 sm:p-4 rounded-2xl border border-amber-100 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">Credit Given</span>
            <span className="p-1.5 bg-amber-100 text-amber-700 rounded-lg">
              <CreditCard className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="mt-2 text-lg sm:text-xl font-black text-amber-900">
            {formatCurrency(stats.creditVolume)}
          </div>
          <p className="text-[10px] text-amber-600 mt-0.5 font-medium">Receivable credit sales</p>
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 shadow-xs space-y-4 animate-in fade-in duration-150">
          <div className="flex items-center justify-between border-b border-gray-100 pb-2">
            <span className="text-xs font-bold text-gray-800 uppercase tracking-wider">Search & Filters</span>
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="text-xs font-bold text-red-600 hover:text-red-700"
              >
                Clear all filters
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">From Date</label>
              <input
                type="date"
                value={filters.date_from}
                onChange={e => setFilter('date_from', e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-hidden focus:border-green-600"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">To Date</label>
              <input
                type="date"
                value={filters.date_to}
                onChange={e => setFilter('date_to', e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-hidden focus:border-green-600"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">Payment Method</label>
              <select
                value={filters.payment_method}
                onChange={e => setFilter('payment_method', e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-hidden focus:border-green-600"
              >
                <option value="">All Methods (Cash, Online, Credit)</option>
                <option value="CASH">Cash</option>
                <option value="ONLINE">Online / UPI</option>
                <option value="CREDIT">Credit</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">Status</label>
              <select
                value={filters.status}
                onChange={e => setFilter('status', e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-hidden focus:border-green-600"
              >
                <option value="">All Statuses</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">Bill Number / Customer</label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
              <input
                type="text"
                value={filters.bill_number}
                onChange={e => setFilter('bill_number', e.target.value)}
                placeholder="Search by bill # (e.g. INV-2026-...) or customer name"
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-hidden focus:border-green-600"
              />
            </div>
          </div>
        </div>
      )}

      {/* Sales List */}
      {isLoading ? (
        <PageLoader />
      ) : sales.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center shadow-xs">
          <Receipt className="w-12 h-12 text-gray-300 mx-auto mb-2" />
          <h3 className="text-base font-bold text-gray-800">No Sales Transactions Found</h3>
          <p className="text-xs text-gray-400 mt-1">Try clearing filters or record new sales at the POS counter.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50 text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Bill #</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Cashier</th>
                  <th className="py-3 px-4">Shift</th>
                  <th className="py-3 px-4">Payment & Status</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sales.map(s => (
                  <tr key={s.id} className="hover:bg-gray-50/80 transition group">
                    <td className="py-3.5 px-4 font-mono font-bold text-gray-900">
                      <Link to={`/sales/${s.id}`} className="hover:text-green-700 underline decoration-gray-300">
                        {s.bill_number}
                      </Link>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-gray-800">
                      {s.customer_name || 'Walk-in Customer'}
                    </td>
                    <td className="py-3.5 px-4 text-gray-500 font-medium">
                      {formatDateTime(s.created_at)}
                    </td>
                    <td className="py-3.5 px-4 text-gray-700">
                      {s.employee_name || 'Cashier'}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded-md font-medium text-[11px]">
                        {s.shift_name || '-'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {renderPaymentBadge(s)}
                        {s.status === 'CANCELLED' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800">
                            Cancelled
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <span className="text-sm font-black text-gray-900">
                        {formatCurrency(s.total)}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Link
                        to={`/sales/${s.id}`}
                        className="inline-flex items-center gap-1 p-1 text-gray-400 group-hover:text-green-700 transition"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile & Tablet Card View */}
          <div className="md:hidden divide-y divide-gray-100">
            {sales.map(s => (
              <Link
                key={s.id}
                to={`/sales/${s.id}`}
                className="block p-3.5 sm:p-4 hover:bg-gray-50/80 transition space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className="font-mono text-xs font-bold text-gray-900 block truncate">
                      {s.bill_number}
                    </span>
                    <p className="text-xs font-bold text-gray-700 truncate mt-0.5">
                      {s.customer_name || 'Walk-in Customer'}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-base font-black text-gray-900 block">
                      {formatCurrency(s.total)}
                    </span>
                    {s.status === 'CANCELLED' && (
                      <span className="text-[10px] font-bold text-red-600 block">Cancelled</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-gray-100/70 text-xs">
                  <div>{renderPaymentBadge(s)}</div>
                  <div className="text-right text-[11px] text-gray-400">
                    <span>{formatDateTime(s.created_at)}</span>
                    <span className="mx-1">·</span>
                    <span>{s.employee_name || 'Staff'}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
