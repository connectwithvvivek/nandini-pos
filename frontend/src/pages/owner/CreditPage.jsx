import { useState, useEffect, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  CreditCard, Banknote, Smartphone, Users, Receipt, Clock,
  Search, Filter, RefreshCw, AlertCircle, CheckCircle, ArrowUpRight,
  UserCheck, Calendar, ChevronRight, ChevronDown, ChevronUp, X
} from 'lucide-react'
import { creditApi, authApi } from '../../api'
import { SettleCreditModal } from '../../components/credit/SettleCreditModal'
import { formatCurrency, formatDateTime, formatDate } from '../../lib/utils'

export default function CreditPage() {
  const [activeTab, setActiveTab] = useState('customers') // 'customers' | 'pending' | 'by_employee' | 'settlements'
  const [loading, setLoading] = useState(true)
  const [showAllKpis, setShowAllKpis] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [summary, setSummary] = useState(null)
  const [customers, setCustomers] = useState([])
  const [pendingBills, setPendingBills] = useState([])
  const [allCreditBills, setAllCreditBills] = useState([])
  const [settlements, setSettlements] = useState([])
  const [employeesList, setEmployeesList] = useState([])
  const [search, setSearch] = useState('')
  const [selectedEmployee, setSelectedEmployee] = useState('ALL')
  const [datePreset, setDatePreset] = useState('ALL') // 'ALL' | 'TODAY' | 'YESTERDAY' | 'THIS_WEEK' | 'CUSTOM'
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [selectedBillForSettlement, setSelectedBillForSettlement] = useState(null)

  const getDateRange = useCallback(() => {
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
  }, [datePreset, dateFrom, dateTo])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const range = getDateRange()
      const params = {
        ...range,
        employee: selectedEmployee !== 'ALL' ? selectedEmployee : undefined,
      }
      const [sumRes, custRes, pendRes, allBillsRes, settRes, empRes] = await Promise.all([
        creditApi.summary(params).catch(() => ({ data: null })),
        creditApi.outstandingCustomers().catch(() => ({ data: [] })),
        creditApi.bills({ status: 'PENDING', ...params }).catch(() => ({ data: [] })),
        creditApi.bills(params).catch(() => ({ data: [] })),
        creditApi.payments(params).catch(() => ({ data: [] })),
        authApi.employees().catch(() => ({ data: [] })),
      ])
      setSummary(sumRes.data)
      setCustomers(Array.isArray(custRes.data) ? custRes.data : (custRes.data?.results || []))
      setPendingBills(Array.isArray(pendRes.data) ? pendRes.data : (pendRes.data?.results || []))
      setAllCreditBills(Array.isArray(allBillsRes.data) ? allBillsRes.data : (allBillsRes.data?.results || []))
      setSettlements(Array.isArray(settRes.data) ? settRes.data : (settRes.data?.results || []))
      setEmployeesList(Array.isArray(empRes.data) ? empRes.data : (empRes.data?.results || []))
    } catch (err) {
      console.error('Failed to load credit dashboard data:', err)
    } finally {
      setLoading(false)
    }
  }, [getDateRange, selectedEmployee])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const safeCustomers = Array.isArray(customers) ? customers : []
  const safePendingBills = Array.isArray(pendingBills) ? pendingBills : []
  const safeAllBills = Array.isArray(allCreditBills) ? allCreditBills : []
  const safeSettlements = Array.isArray(settlements) ? settlements : []

  // Date and Employee filter helpers
  const isDateInRange = (itemDate) => {
    if (!itemDate) return true
    const d = itemDate.split('T')[0]
    const range = getDateRange()
    if (range.date_from && d < range.date_from) return false
    if (range.date_to && d > range.date_to) return false
    return true
  }

  const isEmployeeMatch = (itemEmpId, itemEmpName) => {
    if (selectedEmployee === 'ALL') return true
    return String(itemEmpId) === String(selectedEmployee) || itemEmpName?.toLowerCase() === selectedEmployee.toLowerCase()
  }

  // Filtered lists based on search, date, and employee
  const filteredCustomers = safeCustomers.filter(c =>
    c.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.customer_phone?.includes(search) ||
    c.customer_code?.toLowerCase().includes(search.toLowerCase())
  )

  const filteredPendingBills = safePendingBills.filter(b => {
    const matchSearch = !search ||
      b.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
      b.bill_number?.toLowerCase().includes(search.toLowerCase()) ||
      b.customer_phone?.includes(search) ||
      b.employee_name?.toLowerCase().includes(search.toLowerCase())
    const matchDate = isDateInRange(b.created_at)
    const matchEmp = isEmployeeMatch(b.employee, b.employee_name)
    return matchSearch && matchDate && matchEmp
  })

  const filteredBillsByEmployee = safeAllBills.filter(b => {
    const matchSearch = !search ||
      b.employee_name?.toLowerCase().includes(search.toLowerCase()) ||
      b.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
      b.bill_number?.toLowerCase().includes(search.toLowerCase())
    const matchDate = isDateInRange(b.created_at)
    const matchEmp = isEmployeeMatch(b.employee, b.employee_name)
    return matchSearch && matchDate && matchEmp
  })

  const filteredSettlements = safeSettlements.filter(s => {
    const matchSearch = !search ||
      s.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
      s.bill_number?.toLowerCase().includes(search.toLowerCase()) ||
      s.employee_name?.toLowerCase().includes(search.toLowerCase())
    const matchDate = isDateInRange(s.created_at)
    const matchEmp = isEmployeeMatch(s.employee, s.employee_name)
    return matchSearch && matchDate && matchEmp
  })

  const hasActiveFilters = selectedEmployee !== 'ALL' || datePreset !== 'ALL' || search.trim() !== ''

  const handleResetFilters = () => {
    setSelectedEmployee('ALL')
    setDatePreset('ALL')
    setDateFrom('')
    setDateTo('')
    setSearch('')
  }

  return (
    <div className="p-3 sm:p-5 lg:p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-amber-50 text-amber-700 rounded-xl">
              <CreditCard className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">Credit Management</h1>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Real receivable tracking, outstanding balances & employee credit audit
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <Link
            to="/pending-bills"
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-green-700 hover:bg-green-800 rounded-xl transition shadow-xs"
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>All Pending Bills</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards Header with Show More toggle for mobile */}
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Credit Overview</h2>
        <button
          type="button"
          onClick={() => setShowAllKpis(s => !s)}
          className="sm:hidden inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white border border-gray-200 text-xs font-bold text-gray-700 shadow-2xs hover:bg-gray-50 active:scale-95 transition"
        >
          <span>{showAllKpis ? 'Show Less' : 'Show More'}</span>
          {showAllKpis ? <ChevronUp className="w-3.5 h-3.5 text-gray-600" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-600" />}
        </button>
      </div>

      {/* KPI Cards Grid (Mobile shows 4 by default, 5th toggles with Show More) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Total Outstanding */}
        <div className="bg-red-50/70 border border-red-100 p-3.5 sm:p-4 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-red-700 uppercase tracking-wider">Total Outstanding</span>
            <span className="p-1.5 bg-red-100 text-red-700 rounded-lg">
              <CreditCard className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="mt-2 text-lg sm:text-xl font-black text-red-900">
            {formatCurrency(summary?.total_outstanding || 0)}
          </div>
          <p className="text-[10px] text-red-600 mt-0.5 font-medium">Unsettled credit receivables</p>
        </div>

        {/* Credit Given Today */}
        <div className="bg-amber-50/70 border border-amber-100 p-3.5 sm:p-4 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">Credit Given Today</span>
            <span className="p-1.5 bg-amber-100 text-amber-700 rounded-lg">
              <ArrowUpRight className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="mt-2 text-lg sm:text-xl font-black text-amber-900">
            {formatCurrency(summary?.credit_given_today || 0)}
          </div>
          <p className="text-[10px] text-amber-600 mt-0.5 font-medium">New credit recorded today</p>
        </div>

        {/* Collected Today */}
        <div className="bg-emerald-50/70 border border-emerald-100 p-3.5 sm:p-4 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Collected Today</span>
            <span className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg">
              <CheckCircle className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="mt-2 text-lg sm:text-xl font-black text-emerald-900">
            {formatCurrency(summary?.credit_collected_today || 0)}
          </div>
          <p className="text-[10px] text-emerald-600 mt-0.5 font-medium">Settlements collected today</p>
        </div>

        {/* Pending Bills */}
        <div className="bg-orange-50/70 border border-orange-100 p-3.5 sm:p-4 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-orange-700 uppercase tracking-wider">Pending Bills</span>
            <span className="p-1.5 bg-orange-100 text-orange-700 rounded-lg">
              <Receipt className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="mt-2 text-lg sm:text-xl font-black text-orange-900">
            {summary?.pending_bills_count ?? pendingBills.length}
          </div>
          <p className="text-[10px] text-orange-600 mt-0.5 font-medium">Bills pending settlement</p>
        </div>

        {/* Outstanding Customers (Hidden on mobile unless Show More toggled) */}
        <div className={`bg-blue-50/70 border border-blue-100 p-3.5 sm:p-4 rounded-2xl col-span-2 sm:col-span-1 ${
          !showAllKpis ? 'hidden sm:block' : 'block'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">Due Customers</span>
            <span className="p-1.5 bg-blue-100 text-blue-700 rounded-lg">
              <Users className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="mt-2 text-lg sm:text-xl font-black text-blue-900">
            {summary?.outstanding_customers_count ?? customers.length}
          </div>
          <p className="text-[10px] text-blue-600 mt-0.5 font-medium">Customers with dues</p>
        </div>
      </div>

      {/* Tabs and Search Bar */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
          {/* Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setActiveTab('customers')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                activeTab === 'customers'
                  ? 'bg-green-700 text-white shadow-xs'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Outstanding Customers ({customers.length})
            </button>
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                activeTab === 'pending'
                  ? 'bg-green-700 text-white shadow-xs'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Pending Bills ({pendingBills.length})
            </button>
            <button
              onClick={() => setActiveTab('by_employee')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                activeTab === 'by_employee'
                  ? 'bg-green-700 text-white shadow-xs'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Credit Given by Employee ({allCreditBills.length})
            </button>
            <button
              onClick={() => setActiveTab('settlements')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                activeTab === 'settlements'
                  ? 'bg-green-700 text-white shadow-xs'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Recent Settlements ({settlements.length})
            </button>
          </div>

          {/* Right Toolbar: Filter Toggle + Search Input */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setShowFilters(s => !s)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition shadow-2xs border shrink-0 ${
                showFilters || (selectedEmployee !== 'ALL' || datePreset !== 'ALL')
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
              }`}
            >
              <Filter className="w-3.5 h-3.5 text-emerald-700" />
              <span>Filter</span>
              {(selectedEmployee !== 'ALL' || datePreset !== 'ALL') && (
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
              )}
              {showFilters ? <ChevronUp className="w-3.5 h-3.5 text-gray-500 ml-0.5" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-500 ml-0.5" />}
            </button>

            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search customer, bill, employee..."
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-gray-200 focus:outline-hidden focus:border-green-600"
              />
            </div>
          </div>
        </div>

        {/* Collapsible Date and Employee Filter Section */}
        {showFilters && (
          <div className="bg-gray-50/90 rounded-2xl p-3.5 border border-gray-200/80 space-y-3 text-xs animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <span className="font-bold text-gray-800 flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-emerald-700" />
                <span>Filter Records by Employee & Date</span>
              </span>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-red-600 hover:bg-red-50 border border-red-200 transition"
                  title="Reset all filters"
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
                  Employee:
                </span>
                <select
                  value={selectedEmployee}
                  onChange={(e) => setSelectedEmployee(e.target.value)}
                  className="bg-white border border-gray-200 text-gray-800 rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="ALL">All Staff / Cashiers</option>
                  {employeesList.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.full_name || emp.username}</option>
                  ))}
                </select>
              </div>

              {/* Date Filter Presets */}
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

              {/* Custom Date Pickers */}
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

        {/* Filter Summary Pill when collapsed but filters active */}
        {!showFilters && (selectedEmployee !== 'ALL' || datePreset !== 'ALL') && (
          <div className="flex items-center justify-between bg-emerald-50/70 border border-emerald-200/80 px-3 py-1.5 rounded-xl text-xs text-emerald-900">
            <span className="font-semibold flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-emerald-700" />
              Active Filters: {selectedEmployee !== 'ALL' ? `Staff (${employeesList.find(e => String(e.id) === String(selectedEmployee))?.full_name || selectedEmployee})` : ''} {datePreset !== 'ALL' ? `· Date (${datePreset})` : ''}
            </span>
            <button
              onClick={handleResetFilters}
              className="text-[11px] font-bold text-red-600 hover:underline"
            >
              Reset
            </button>
          </div>
        )}

        {/* TAB 1: Outstanding Customers */}
        {activeTab === 'customers' && (
          <div>
            {filteredCustomers.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <CheckCircle className="w-10 h-10 mx-auto text-emerald-400 mb-2" />
                <p className="text-sm font-bold text-gray-700">No Customers With Outstanding Balance</p>
                <p className="text-xs text-gray-400 mt-0.5">All customer credit accounts are fully settled!</p>
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-gray-100 text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                        <th className="py-2.5 px-3">Customer</th>
                        <th className="py-2.5 px-3">Phone</th>
                        <th className="py-2.5 px-3 text-center">Pending Bills</th>
                        <th className="py-2.5 px-3 text-right">Total Outstanding</th>
                        <th className="py-2.5 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filteredCustomers.map((cust) => (
                        <tr key={cust.customer_id} className="hover:bg-gray-50/70 transition">
                          <td className="py-3 px-3">
                            <div className="font-bold text-gray-900">{cust.customer_name}</div>
                            <span className="text-[10px] text-gray-400">{cust.customer_code || 'No code'}</span>
                          </td>
                          <td className="py-3 px-3 text-gray-600 font-medium">{cust.customer_phone}</td>
                          <td className="py-3 px-3 text-center">
                            <span className="px-2 py-0.5 bg-orange-100 text-orange-800 rounded-full font-bold text-[11px]">
                              {cust.pending_bills_count} bills
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right font-black text-red-700 text-sm">
                            {formatCurrency(cust.total_outstanding)}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <Link
                              to={`/customers/${cust.customer_code || cust.customer_id}`}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-xl text-xs transition"
                            >
                              <span>View Ledger</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden space-y-2.5">
                  {filteredCustomers.map((cust) => (
                    <div key={cust.customer_id} className="bg-gray-50/70 border border-gray-200/70 rounded-xl p-3.5 space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-bold text-gray-900 text-sm">{cust.customer_name}</p>
                          <p className="text-xs text-gray-500">{cust.customer_phone}</p>
                        </div>
                        <span className="px-2 py-0.5 bg-orange-100 text-orange-800 rounded-full font-bold text-[10px]">
                          {cust.pending_bills_count} bills
                        </span>
                      </div>
                      <div className="flex items-center justify-between pt-1 border-t border-gray-100">
                        <div>
                          <span className="text-[10px] text-gray-400 uppercase font-semibold">Outstanding Due:</span>
                          <p className="text-sm font-black text-red-700">{formatCurrency(cust.total_outstanding)}</p>
                        </div>
                        <Link
                          to={`/customers/${cust.customer_code || cust.customer_id}`}
                          className="px-3 py-1.5 bg-green-700 hover:bg-green-800 text-white font-bold rounded-xl text-xs flex items-center gap-1 shadow-xs"
                        >
                          <span>Open Ledger</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* TAB 2: Pending Bills */}
        {activeTab === 'pending' && (
          <div>
            {filteredPendingBills.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <CheckCircle className="w-10 h-10 mx-auto text-emerald-400 mb-2" />
                <p className="text-sm font-bold text-gray-700">No Pending Bills</p>
                <p className="text-xs text-gray-400 mt-0.5">All customer credit bills have been settled.</p>
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-gray-100 text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                        <th className="py-2.5 px-3">Bill #</th>
                        <th className="py-2.5 px-3">Customer</th>
                        <th className="py-2.5 px-3">Credit Given By & Shift</th>
                        <th className="py-2.5 px-3 text-right">Original</th>
                        <th className="py-2.5 px-3 text-right">Paid</th>
                        <th className="py-2.5 px-3 text-right">Outstanding</th>
                        <th className="py-2.5 px-3">Collections Audit</th>
                        <th className="py-2.5 px-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filteredPendingBills.map((bill) => (
                        <tr key={bill.id} className="hover:bg-gray-50/70 transition">
                          <td className="py-3 px-3 font-mono font-bold text-gray-900">
                            {bill.bill_number}
                            <div className="text-[10px] text-gray-400 font-normal">{formatDateTime(bill.created_at)}</div>
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-bold text-gray-900">{bill.customer_name}</div>
                            <span className="text-[10px] text-gray-400">{bill.customer_phone}</span>
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-bold text-gray-900">{bill.employee_name || 'Staff'}</div>
                            <div className="text-[11px] text-emerald-800 font-medium flex items-center gap-1 mt-0.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              {bill.shift_name ? `Shift: ${bill.shift_name}` : 'General'}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-right font-medium text-gray-700">{formatCurrency(bill.original_amount)}</td>
                          <td className="py-3 px-3 text-right font-medium text-emerald-700">{formatCurrency(bill.amount_paid)}</td>
                          <td className="py-3 px-3 text-right font-black text-red-700 text-sm">
                            {formatCurrency(bill.outstanding_amount)}
                          </td>
                          <td className="py-3 px-3 min-w-[170px]">
                            {bill.payments && bill.payments.length > 0 ? (
                              <div className="space-y-1">
                                {bill.payments.map((p, pIdx) => (
                                  <div key={p.id || pIdx} className="text-[11px] leading-tight">
                                    <span className="font-bold text-gray-800">{p.employee_name || 'Staff'}</span>
                                    <span className="text-emerald-700 font-semibold ml-1">({p.payment_method})</span>
                                    <div className="text-[10px] text-gray-400">{p.shift_name} · {formatDateTime(p.created_at)}</div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-[11px] text-gray-400 italic">Awaiting collection</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <button
                              onClick={() => setSelectedBillForSettlement(bill)}
                              className="px-3 py-1.5 bg-green-700 hover:bg-green-800 text-white font-bold rounded-xl text-xs transition shadow-xs"
                            >
                              Settle
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden space-y-2.5">
                  {filteredPendingBills.map((bill) => (
                    <div key={bill.id} className="bg-gray-50/70 border border-gray-200/70 rounded-xl p-3.5 space-y-2.5">
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="font-mono text-xs font-bold text-gray-800">{bill.bill_number}</span>
                          <p className="font-bold text-gray-900 text-sm">{bill.customer_name}</p>
                          <p className="text-xs text-gray-500">{bill.customer_phone}</p>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                          bill.status === 'PARTIALLY_PAID'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {bill.status === 'PARTIALLY_PAID' ? 'Partial' : 'Pending'}
                        </span>
                      </div>

                      {/* Audit: Credit Given By */}
                      <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-100 text-xs space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-amber-900">Credit Given By:</span>
                          <span className="text-amber-800 font-semibold">{bill.shift_name ? `Shift: ${bill.shift_name}` : 'General'}</span>
                        </div>
                        <div className="flex items-center justify-between text-gray-700">
                          <span className="font-bold text-gray-900">{bill.employee_name || 'Staff'}</span>
                          <span className="text-[11px] text-gray-500">{formatDateTime(bill.created_at)}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-1 pt-1.5 border-t border-gray-100 text-center">
                        <div className="bg-white p-1.5 rounded-lg border border-gray-100">
                          <span className="text-[9px] text-gray-400 block font-semibold">ORIGINAL</span>
                          <span className="text-xs font-bold text-gray-700">{formatCurrency(bill.original_amount)}</span>
                        </div>
                        <div className="bg-white p-1.5 rounded-lg border border-gray-100">
                          <span className="text-[9px] text-gray-400 block font-semibold">PAID</span>
                          <span className="text-xs font-bold text-emerald-700">{formatCurrency(bill.amount_paid)}</span>
                        </div>
                        <div className="bg-red-50 p-1.5 rounded-lg border border-red-100">
                          <span className="text-[9px] text-red-600 block font-bold">DUE</span>
                          <span className="text-xs font-black text-red-800">{formatCurrency(bill.outstanding_amount)}</span>
                        </div>
                      </div>

                      {/* Audit: Payments Collected */}
                      {bill.payments && bill.payments.length > 0 && (
                        <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-100 text-xs space-y-1">
                          <span className="font-bold text-emerald-900 block text-[11px]">Collected By:</span>
                          {bill.payments.map((p, pIdx) => (
                            <div key={p.id || pIdx} className="flex items-center justify-between text-[11px] text-gray-700 border-t border-emerald-100/60 pt-1 first:border-0 first:pt-0">
                              <div>
                                <span className="font-bold text-gray-900">{p.employee_name || 'Staff'}</span>
                                <span className="text-emerald-700 ml-1 font-medium">({p.shift_name} · {p.payment_method})</span>
                              </div>
                              <span className="font-bold text-emerald-800">{formatCurrency(p.amount)}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="pt-1 flex items-center justify-end">
                        <button
                          onClick={() => setSelectedBillForSettlement(bill)}
                          className="px-4 py-2 bg-green-700 hover:bg-green-800 text-white font-bold rounded-xl text-xs shadow-xs"
                        >
                          Record Payment
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* TAB 3: Credit Given by Employee */}
        {activeTab === 'by_employee' && (
          <div>
            <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl mb-3 text-xs text-blue-900 font-medium">
              Audit log answering: <span className="font-bold">Who gave credit, to which customer, for which bill, when, and how much?</span>
            </div>

            {filteredBillsByEmployee.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <p className="text-sm font-bold text-gray-700">No Credit Records Found</p>
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-gray-100 text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                        <th className="py-2.5 px-3">Given By Employee</th>
                        <th className="py-2.5 px-3">Customer</th>
                        <th className="py-2.5 px-3">Bill #</th>
                        <th className="py-2.5 px-3">Date & Time</th>
                        <th className="py-2.5 px-3">Shift</th>
                        <th className="py-2.5 px-3 text-right">Credit Amount</th>
                        <th className="py-2.5 px-3">Collected By & Shift</th>
                        <th className="py-2.5 px-3 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filteredBillsByEmployee.map((bill) => (
                        <tr key={bill.id} className="hover:bg-gray-50/70 transition">
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2">
                              <span className="w-6 h-6 bg-green-100 text-green-800 font-bold rounded-full flex items-center justify-center text-[10px]">
                                {bill.employee_name?.[0]?.toUpperCase() || 'E'}
                              </span>
                              <span className="font-bold text-gray-900">{bill.employee_name || 'Staff'}</span>
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-bold text-gray-900">{bill.customer_name}</div>
                            <span className="text-[10px] text-gray-400">{bill.customer_phone}</span>
                          </td>
                          <td className="py-3 px-3 font-mono font-bold text-gray-800">{bill.bill_number}</td>
                          <td className="py-3 px-3 text-gray-500">{formatDateTime(bill.created_at)}</td>
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded-md font-medium text-[11px]">
                              {bill.shift_name || 'Shift'}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right font-black text-amber-800 text-sm">
                            {formatCurrency(bill.original_amount)}
                          </td>
                          <td className="py-3 px-3 min-w-[170px]">
                            {bill.payments && bill.payments.length > 0 ? (
                              <div className="space-y-1">
                                {bill.payments.map((p, pIdx) => (
                                  <div key={p.id || pIdx} className="text-[11px] leading-tight">
                                    <span className="font-bold text-gray-800">{p.employee_name || 'Staff'}</span>
                                    <span className="text-emerald-700 ml-1 font-semibold">({p.payment_method})</span>
                                    <div className="text-[10px] text-gray-400">{p.shift_name} · {formatDateTime(p.created_at)}</div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-[11px] text-gray-400 italic">Not yet collected</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                              bill.status === 'PAID'
                                ? 'bg-emerald-100 text-emerald-800'
                                : bill.status === 'PARTIALLY_PAID'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {bill.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden space-y-2.5">
                  {filteredBillsByEmployee.map((bill) => (
                    <div key={bill.id} className="bg-gray-50/70 border border-gray-200/70 rounded-xl p-3.5 space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="w-5 h-5 bg-green-100 text-green-800 font-bold rounded-full flex items-center justify-center text-[9px]">
                              {bill.employee_name?.[0]?.toUpperCase() || 'E'}
                            </span>
                            <span className="font-bold text-gray-900 text-xs">{bill.employee_name || 'Staff'}</span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">Given to: <span className="font-bold text-gray-800">{bill.customer_name}</span></p>
                        </div>
                        <span className="text-xs font-black text-amber-800">{formatCurrency(bill.original_amount)}</span>
                      </div>
                      {bill.payments && bill.payments.length > 0 && (
                        <div className="p-2 bg-emerald-50/70 border border-emerald-100 rounded-lg text-[10px] space-y-1">
                          <span className="font-bold text-emerald-900 block">Collected By:</span>
                          {bill.payments.map((p, pIdx) => (
                            <div key={p.id || pIdx} className="flex items-center justify-between text-gray-700">
                              <span>{p.employee_name || 'Staff'} ({p.shift_name} · {p.payment_method})</span>
                              <span className="font-bold text-emerald-800">{formatCurrency(p.amount)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="flex items-center justify-between pt-1 border-t border-gray-100 text-[10px] text-gray-500">
                        <span>Bill: {bill.bill_number} · {bill.shift_name}</span>
                        <span>{formatDateTime(bill.created_at)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* TAB 4: Recent Settlements */}
        {activeTab === 'settlements' && (
          <div>
            {filteredSettlements.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Receipt className="w-10 h-10 mx-auto text-gray-300 mb-2" />
                <p className="text-sm font-bold text-gray-700">No Settlement History</p>
                <p className="text-xs text-gray-400 mt-0.5">Recorded payments against credit bills will appear here.</p>
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-gray-100 text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                        <th className="py-2.5 px-3">Date & Time</th>
                        <th className="py-2.5 px-3">Customer</th>
                        <th className="py-2.5 px-3">Bill #</th>
                        <th className="py-2.5 px-3">Payment Method</th>
                        <th className="py-2.5 px-3">Collected By</th>
                        <th className="py-2.5 px-3">Shift</th>
                        <th className="py-2.5 px-3 text-right">Amount Received</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filteredSettlements.map((st) => (
                        <tr key={st.id} className="hover:bg-gray-50/70 transition">
                          <td className="py-3 px-3 text-gray-500">{formatDateTime(st.created_at)}</td>
                          <td className="py-3 px-3 font-bold text-gray-900">{st.customer_name}</td>
                          <td className="py-3 px-3 font-mono font-bold text-gray-700">{st.bill_number}</td>
                          <td className="py-3 px-3">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold text-[10px] ${
                              st.payment_method === 'CASH'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                              {st.payment_method === 'CASH' ? (
                                <><Banknote className="w-3 h-3" /> Cash</>
                              ) : (
                                <><Smartphone className="w-3 h-3" /> Online</>
                              )}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-medium text-gray-700">{st.employee_name || 'Staff'}</td>
                          <td className="py-3 px-3 text-gray-500">{st.shift_name || '-'}</td>
                          <td className="py-3 px-3 text-right font-black text-emerald-700 text-sm">
                            {formatCurrency(st.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden space-y-2.5">
                  {filteredSettlements.map((st) => (
                    <div key={st.id} className="bg-gray-50/70 border border-gray-200/70 rounded-xl p-3.5 space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-bold text-gray-900 text-sm">{st.customer_name}</p>
                          <p className="text-xs text-gray-500">Bill: {st.bill_number}</p>
                        </div>
                        <span className="text-sm font-black text-emerald-700">{formatCurrency(st.amount)}</span>
                      </div>
                      <div className="flex items-center justify-between pt-1 border-t border-gray-100 text-xs">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold text-[10px] ${
                          st.payment_method === 'CASH'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {st.payment_method === 'CASH' ? 'Cash' : 'Online'}
                        </span>
                        <span className="text-[10px] text-gray-400">
                          {formatDateTime(st.created_at)} · {st.employee_name}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Settlement Modal */}
      {selectedBillForSettlement && (
        <SettleCreditModal
          open={true}
          bill={selectedBillForSettlement}
          onClose={() => setSelectedBillForSettlement(null)}
          onSuccess={() => {
            setSelectedBillForSettlement(null)
            fetchData()
          }}
        />
      )}
    </div>
  )
}

