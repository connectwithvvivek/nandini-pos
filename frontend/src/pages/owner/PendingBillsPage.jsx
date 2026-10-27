import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { creditApi, authApi } from '../../api'
import { formatCurrency, formatDateTime } from '../../lib/utils'
import {
  Search, Receipt, Clock, CheckCircle2, AlertTriangle, ArrowRight,
  Filter, Calendar, UserCheck, ChevronDown, ChevronUp, X
} from 'lucide-react'
import { PageLoader } from '../../components/ui/Spinner'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import SettleCreditModal from '../../components/credit/SettleCreditModal'

export default function PendingBillsPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL') // ALL | PENDING | PARTIALLY_PAID
  const [selectedBill, setSelectedBill] = useState(null)
  const [showFilters, setShowFilters] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState('ALL')
  const [datePreset, setDatePreset] = useState('ALL') // ALL | TODAY | YESTERDAY | THIS_WEEK | CUSTOM
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const qc = useQueryClient()

  // Query employees for staff filter
  const { data: employeesList = [] } = useQuery({
    queryKey: ['employees-list'],
    queryFn: () => authApi.employees().then(r => Array.isArray(r.data) ? r.data : (r.data?.results || [])),
  })

  // Date Range calculation
  const getDateRange = () => {
    const today = new Date()
    const formatDateStr = (d) => {
      const year = d.getFullYear()
      const month = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }

    if (datePreset === 'TODAY') {
      const d = formatDateStr(today)
      return { date_from: d, date_to: d }
    }
    if (datePreset === 'YESTERDAY') {
      const y = new Date(today)
      y.setDate(y.getDate() - 1)
      const d = formatDateStr(y)
      return { date_from: d, date_to: d }
    }
    if (datePreset === 'THIS_WEEK') {
      const start = new Date(today)
      start.setDate(today.getDate() - 7)
      return { date_from: formatDateStr(start), date_to: formatDateStr(today) }
    }
    if (datePreset === 'CUSTOM') {
      return {
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      }
    }
    return {}
  }

  const range = getDateRange()

  const { data: bills = [], isLoading } = useQuery({
    queryKey: ['pending-bills', statusFilter, selectedEmployee, datePreset, dateFrom, dateTo],
    queryFn: () => creditApi.bills({
      status: statusFilter === 'ALL' ? undefined : statusFilter,
      employee: selectedEmployee !== 'ALL' ? selectedEmployee : undefined,
      ...range
    }).then(r => Array.isArray(r.data) ? r.data : (r.data?.results || [])),
  })

  // Filter bills by search & in-memory safety
  const filteredBills = useMemo(() => {
    return bills.filter(b => {
      if (b.status === 'PAID') return false
      const q = search.toLowerCase()
      const matchesSearch = !search ||
        (b.customer_name && b.customer_name.toLowerCase().includes(q)) ||
        (b.customer_code && b.customer_code.toLowerCase().includes(q)) ||
        (b.customer_phone && b.customer_phone.includes(q)) ||
        (b.bill_number && b.bill_number.toLowerCase().includes(q)) ||
        (b.employee_name && b.employee_name.toLowerCase().includes(q))

      return matchesSearch
    })
  }, [bills, search])

  // Summary counts
  const stats = useMemo(() => {
    let totalOutstanding = 0
    let totalOriginal = 0
    let pendingCount = 0
    let partialCount = 0

    bills.forEach(b => {
      if (b.status !== 'PAID') {
        totalOutstanding += Number(b.outstanding_amount || 0)
        totalOriginal += Number(b.original_amount || 0)
        if (b.status === 'PARTIALLY_PAID') partialCount++
        else pendingCount++
      }
    })

    return { totalOutstanding, totalOriginal, pendingCount, partialCount, totalBills: pendingCount + partialCount }
  }, [bills])

  const hasActiveFilters = statusFilter !== 'ALL' || selectedEmployee !== 'ALL' || datePreset !== 'ALL' || search.trim() !== ''

  const handleResetFilters = () => {
    setStatusFilter('ALL')
    setSelectedEmployee('ALL')
    setDatePreset('ALL')
    setDateFrom('')
    setDateTo('')
    setSearch('')
  }

  return (
    <div className="max-w-6xl mx-auto space-y-4 sm:space-y-5 px-3 sm:px-6 py-4 sm:py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 sm:p-4 rounded-2xl border border-gray-100 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-orange-50 text-orange-700 rounded-xl">
              <Receipt className="w-5 h-5" />
            </span>
            <h1 className="text-lg sm:text-2xl font-black text-gray-900 tracking-tight">Pending Credit Bills</h1>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">Track and collect outstanding credit payments from customers</p>
        </div>
        <Link to="/credit" className="text-xs sm:text-sm font-semibold text-green-700 hover:text-green-800 flex items-center gap-1 self-start sm:self-auto">
          <span>Open Credit Audit</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* KPI Summary Cards on the VERY TOP */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
        <div className="bg-amber-50/70 rounded-2xl border border-amber-100 p-3 sm:p-4 shadow-xs">
          <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">Total Outstanding</span>
          <p className="text-lg sm:text-2xl font-black text-amber-700 mt-1">{formatCurrency(stats.totalOutstanding)}</p>
          <p className="text-[10px] text-amber-600 mt-0.5 font-medium">{stats.totalBills} pending bills</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-3 sm:p-4 shadow-xs">
          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Unsettled Bills</span>
          <p className="text-lg sm:text-2xl font-black text-gray-900 mt-1">{stats.pendingCount}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">Zero payment received</p>
        </div>

        <div className="bg-blue-50/70 rounded-2xl border border-blue-100 p-3 sm:p-4 shadow-xs">
          <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">Partially Paid</span>
          <p className="text-lg sm:text-2xl font-black text-blue-700 mt-1">{stats.partialCount}</p>
          <p className="text-[10px] text-blue-600 mt-0.5 font-medium">Partial balance due</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-3 sm:p-4 shadow-xs">
          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Original Volume</span>
          <p className="text-lg sm:text-2xl font-black text-gray-800 mt-1">{formatCurrency(stats.totalOriginal)}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">Total credit value</p>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white rounded-2xl border border-gray-100 p-3 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-2.5 sm:items-center justify-between">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search customer, phone, bill number (INV-...)"
              className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          {/* Filter Toggle Button & Status Pills */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowFilters(s => !s)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition shadow-2xs border shrink-0 ${
                showFilters || (statusFilter !== 'ALL' || selectedEmployee !== 'ALL' || datePreset !== 'ALL')
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
              }`}
            >
              <Filter className="w-3.5 h-3.5 text-emerald-700" />
              <span>Filter</span>
              {(statusFilter !== 'ALL' || selectedEmployee !== 'ALL' || datePreset !== 'ALL') && (
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
              )}
              {showFilters ? <ChevronUp className="w-3.5 h-3.5 text-gray-500 ml-0.5" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-500 ml-0.5" />}
            </button>

            {/* Quick Status Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
              {[
                { id: 'ALL', label: `All (${stats.totalBills})` },
                { id: 'PENDING', label: `Unpaid (${stats.pendingCount})` },
                { id: 'PARTIALLY_PAID', label: `Partial (${stats.partialCount})` },
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setStatusFilter(f.id)}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
                    statusFilter === f.id
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Collapsible Filter Section for Mobile and Desktop */}
        {showFilters && (
          <div className="bg-gray-50/90 rounded-2xl p-3.5 border border-gray-200/80 space-y-3 text-xs animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <span className="font-bold text-gray-800 flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-emerald-700" />
                <span>Filter Pending Bills by Date & Staff</span>
              </span>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-red-600 hover:bg-red-50 border border-red-200 transition"
                >
                  <X className="w-3 h-3" />
                  <span>Reset All</span>
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-gray-200/60">
              {/* Employee Filter */}
              <div className="flex items-center gap-2">
                <span className="font-bold text-gray-700 flex items-center gap-1.5 shrink-0">
                  <UserCheck className="w-3.5 h-3.5 text-emerald-700" />
                  Staff:
                </span>
                <select
                  value={selectedEmployee}
                  onChange={(e) => setSelectedEmployee(e.target.value)}
                  className="bg-white border border-gray-200 text-gray-800 rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="ALL">All Staff</option>
                  {employeesList.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.full_name || emp.username}</option>
                  ))}
                </select>
              </div>

              {/* Date Presets */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-bold text-gray-700 flex items-center gap-1.5 shrink-0 mr-1">
                  <Calendar className="w-3.5 h-3.5 text-emerald-700" />
                  Date:
                </span>
                {[
                  { id: 'ALL', label: 'All Time' },
                  { id: 'TODAY', label: 'Today' },
                  { id: 'YESTERDAY', label: 'Yesterday' },
                  { id: 'THIS_WEEK', label: 'Last 7 Days' },
                  { id: 'CUSTOM', label: 'Custom Range' },
                ].map(dp => (
                  <button
                    key={dp.id}
                    type="button"
                    onClick={() => setDatePreset(dp.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                      datePreset === dp.id
                        ? 'bg-emerald-700 text-white shadow-2xs'
                        : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {dp.label}
                  </button>
                ))}
              </div>

              {/* Custom Date Inputs */}
              {datePreset === 'CUSTOM' && (
                <div className="flex items-center gap-2 w-full sm:w-auto pt-1 sm:pt-0">
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] text-gray-500 font-medium">From:</span>
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="bg-white border border-gray-200 text-gray-800 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] text-gray-500 font-medium">To:</span>
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="bg-white border border-gray-200 text-gray-800 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Active Filters Summary Pill when Collapsed */}
        {!showFilters && (statusFilter !== 'ALL' || selectedEmployee !== 'ALL' || datePreset !== 'ALL') && (
          <div className="flex items-center justify-between bg-emerald-50/70 border border-emerald-200/80 px-3 py-1.5 rounded-xl text-xs text-emerald-900">
            <span className="font-semibold flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-emerald-700" />
              Active Filters: {statusFilter !== 'ALL' ? `Status (${statusFilter})` : ''} {selectedEmployee !== 'ALL' ? `· Staff (${employeesList.find(e => String(e.id) === String(selectedEmployee))?.full_name || selectedEmployee})` : ''} {datePreset !== 'ALL' ? `· Date (${datePreset})` : ''}
            </span>
            <button
              onClick={handleResetFilters}
              className="text-[11px] font-bold text-red-600 hover:underline"
            >
              Reset
            </button>
          </div>
        )}
      </div>

      {/* Bills Content (Desktop Table & Mobile Responsive Cards) */}
      {isLoading ? (
        <PageLoader />
      ) : filteredBills.length === 0 ? (
        <div className="bg-white rounded-3xl border border-gray-100 p-12 text-center space-y-2">
          <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto" />
          <p className="text-base font-bold text-gray-900">No Pending Bills Found</p>
          <p className="text-xs text-gray-400">
            {search || statusFilter !== 'ALL' || selectedEmployee !== 'ALL' || datePreset !== 'ALL'
              ? 'Try adjusting your search query or clear active filters'
              : 'All credit bills are currently settled and up to date!'}
          </p>
          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              className="mt-2 text-xs font-bold text-emerald-700 hover:underline"
            >
              Clear all filters
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Mobile Card List (Hidden on sm screens and larger) */}
          <div className="sm:hidden space-y-2.5">
            {filteredBills.map(bill => (
              <div key={bill.id} className="bg-white rounded-2xl border border-gray-100 p-3.5 shadow-xs space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm leading-tight">{bill.customer_name}</h3>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      {bill.customer_phone ? `${bill.customer_phone} · ` : ''}{bill.customer_code}
                    </p>
                  </div>
                  <Badge variant={bill.status === 'PARTIALLY_PAID' ? 'info' : 'warning'}>
                    {bill.status === 'PARTIALLY_PAID' ? 'Partial' : 'Unpaid'}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs bg-gray-50/70 p-2.5 rounded-xl border border-gray-100/80">
                  <div>
                    <span className="text-gray-400 block text-[10px] uppercase font-bold">Bill Number</span>
                    <span className="font-bold text-gray-800">{bill.bill_number}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-gray-400 block text-[10px] uppercase font-bold">Credit Date</span>
                    <span className="text-gray-700">{formatDateTime(bill.created_at)}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[10px] uppercase font-bold">Bill Total</span>
                    <span className="font-bold text-gray-700">{formatCurrency(bill.original_amount)}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-gray-400 block text-[10px] uppercase font-bold">Outstanding Due</span>
                    <span className="font-black text-amber-700 text-sm">{formatCurrency(bill.outstanding_amount)}</span>
                  </div>
                  {bill.employee_name && (
                    <div className="col-span-2 pt-1 border-t border-gray-200/50 text-[11px] text-gray-500">
                      Biller: <span className="font-medium text-gray-800">{bill.employee_name}</span> {bill.shift_name ? `(${bill.shift_name})` : ''}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <Button
                    size="sm"
                    className="flex-1 font-bold py-2"
                    onClick={() => setSelectedBill(bill)}
                  >
                    Record Payment
                  </Button>
                  <Link
                    to={`/sales/${bill.sale}`}
                    className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs transition"
                  >
                    Bill
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table View (Hidden on mobile) */}
          <div className="hidden sm:block bg-white rounded-3xl border border-gray-100 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/70 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Bill No</th>
                    <th className="py-3 px-4">Credit Date</th>
                    <th className="py-3 px-4">Billed By</th>
                    <th className="py-3 px-4 text-right">Original</th>
                    <th className="py-3 px-4 text-right">Paid</th>
                    <th className="py-3 px-4 text-right">Outstanding</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-xs">
                  {filteredBills.map(bill => (
                    <tr key={bill.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-3 px-4">
                        <Link to={`/customers/${bill.customer_code || bill.customer}`} className="font-bold text-gray-900 hover:text-green-700 transition">
                          {bill.customer_name}
                        </Link>
                        <p className="text-[10px] text-gray-400">{bill.customer_phone || bill.customer_code}</p>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-gray-700">
                        {bill.bill_number}
                      </td>
                      <td className="py-3 px-4 text-gray-500 whitespace-nowrap">
                        {formatDateTime(bill.created_at)}
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        <span>{bill.employee_name || '—'}</span>
                        {bill.shift_name && <span className="text-[10px] text-gray-400 block">{bill.shift_name}</span>}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-gray-600">
                        {formatCurrency(bill.original_amount)}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-green-700">
                        {formatCurrency(bill.paid_amount || 0)}
                      </td>
                      <td className="py-3 px-4 text-right font-black text-amber-700 text-sm">
                        {formatCurrency(bill.outstanding_amount)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge variant={bill.status === 'PARTIALLY_PAID' ? 'info' : 'warning'}>
                          {bill.status === 'PARTIALLY_PAID' ? 'Partial' : 'Unpaid'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <Button
                            size="sm"
                            className="font-bold text-xs"
                            onClick={() => setSelectedBill(bill)}
                          >
                            Collect
                          </Button>
                          <Link
                            to={`/sales/${bill.sale}`}
                            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"
                            title="View Original Bill"
                          >
                            <Receipt className="w-4 h-4" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Settle Credit Modal */}
      {selectedBill && (
        <SettleCreditModal
          open={true}
          bill={selectedBill}
          onClose={() => setSelectedBill(null)}
          onSuccess={() => {
            setSelectedBill(null)
            qc.invalidateQueries({ queryKey: ['pending-bills'] })
            qc.invalidateQueries({ queryKey: ['credit-summary'] })
            qc.invalidateQueries({ queryKey: ['credit-bills'] })
          }}
        />
      )}
    </div>
  )
}
