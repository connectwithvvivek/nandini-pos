import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  BarChart2, TrendingUp, Package, Users, Banknote,
  Smartphone, CreditCard, Calendar, ChevronRight, ChevronDown, ChevronUp,
  Filter, ArrowUpRight, CheckCircle, RefreshCw, Phone, Receipt
} from '../../components/ui/icons'
import { dashboardApi } from '../../api'
import { formatCurrency, formatDate } from '../../lib/utils'
import { PageLoader } from '../../components/ui/Spinner'

const TABS = [
  { key: 'daily', label: 'Daily Sales & Settlements', icon: TrendingUp },
  { key: 'shift', label: 'By Shift', icon: BarChart2 },
  { key: 'product', label: 'Product Performance', icon: Package },
  { key: 'customer', label: 'Customer Dues & Sales', icon: Users },
]

export default function ReportsPage() {
  const [tab, setTab] = useState('daily')
  const [showMobileFilter, setShowMobileFilter] = useState(false)
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 7)
    return d.toISOString().split('T')[0]
  })
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0])

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['reports', tab, dateFrom, dateTo],
    queryFn: () => dashboardApi.reports({ type: tab, date_from: dateFrom, date_to: dateTo }).then(r => r.data),
  })

  // Quick preset dates
  const setPreset = (type) => {
    const today = new Date().toISOString().split('T')[0]
    if (type === 'today') {
      setDateFrom(today)
      setDateTo(today)
    } else if (type === 'yesterday') {
      const y = new Date()
      y.setDate(y.getDate() - 1)
      const ys = y.toISOString().split('T')[0]
      setDateFrom(ys)
      setDateTo(ys)
    } else if (type === '7days') {
      const d = new Date()
      d.setDate(d.getDate() - 7)
      setDateFrom(d.toISOString().split('T')[0])
      setDateTo(today)
    } else if (type === 'month') {
      const d = new Date()
      d.setDate(1)
      setDateFrom(d.toISOString().split('T')[0])
      setDateTo(today)
    }
  }

  // Summary aggregation
  const aggregates = useMemo(() => {
    if (!data || !Array.isArray(data)) return null
    if (tab === 'daily') {
      let total = 0
      let cash = 0
      let online = 0
      let credit = 0
      let collected = 0
      let bills = 0
      data.forEach(r => {
        total += r.total_amount || 0
        cash += r.cash_amount || 0
        online += r.online_amount || 0
        credit += r.credit_amount || 0
        collected += r.credit_collected || 0
        bills += r.bill_count || 0
      })
      return { total, cash, online, credit, collected, bills }
    }
    return null
  }, [data, tab])

  return (
    <div className="p-3 sm:p-5 lg:p-6 max-w-7xl mx-auto space-y-4 sm:space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 sm:p-5 rounded-2xl border border-gray-100 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-green-50 text-green-700 rounded-xl">
              <BarChart2 className="w-5 h-5" />
            </span>
            <h1 className="text-lg sm:text-2xl font-black text-gray-900 tracking-tight">Business Reports</h1>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Cash, Online & Credit breakdown with customer dues & shift performance
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <button
            type="button"
            onClick={() => setShowMobileFilter(s => !s)}
            className="sm:hidden flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition cursor-pointer"
          >
            <Filter className="w-3.5 h-3.5 text-gray-600" />
            <span>Filter Period</span>
            {showMobileFilter ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          <button
            type="button"
            onClick={() => refetch()}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Date Range Selector & Presets (Collapsible on Mobile, Always on Desktop) */}
      <div className={`bg-white rounded-2xl border border-gray-100 p-3.5 sm:p-4 shadow-xs space-y-3 ${
        showMobileFilter ? 'block' : 'hidden sm:block'
      }`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-700" />
            <span className="text-xs font-bold text-gray-800 uppercase tracking-wider">Date Period Filter:</span>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {[
              { id: 'today', label: 'Today' },
              { id: 'yesterday', label: 'Yesterday' },
              { id: '7days', label: 'Last 7 Days' },
              { id: 'month', label: 'This Month' },
            ].map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPreset(p.id)}
                className="px-2.5 py-1 text-xs font-bold bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-700 rounded-lg transition cursor-pointer"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">From Date</label>
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:border-green-600 bg-white"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">To Date</label>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:border-green-600 bg-white"
            />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all shadow-xs cursor-pointer ${
              tab === key
                ? 'bg-green-700 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Icon className="w-4 h-4" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* Aggregates Card for Daily Tab */}
      {tab === 'daily' && aggregates && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          <div className="bg-white p-3 rounded-2xl border border-gray-100 shadow-xs">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Total Sales</span>
            <span className="text-base font-black text-gray-900 mt-0.5 block">{formatCurrency(aggregates.total)}</span>
            <span className="text-[10px] text-gray-400">{aggregates.bills} bills</span>
          </div>
          <div className="bg-emerald-50/70 p-3 rounded-2xl border border-emerald-100 shadow-xs">
            <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">Cash Sales</span>
            <span className="text-base font-black text-emerald-900 mt-0.5 block">{formatCurrency(aggregates.cash)}</span>
            <span className="text-[10px] text-emerald-600 font-medium">Immediate cash</span>
          </div>
          <div className="bg-blue-50/70 p-3 rounded-2xl border border-blue-100 shadow-xs">
            <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">Online Sales</span>
            <span className="text-base font-black text-blue-900 mt-0.5 block">{formatCurrency(aggregates.online)}</span>
            <span className="text-[10px] text-blue-600 font-medium">UPI / QR payments</span>
          </div>
          <div className="bg-amber-50/70 p-3 rounded-2xl border border-amber-100 shadow-xs">
            <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">Credit Given</span>
            <span className="text-base font-black text-amber-900 mt-0.5 block">{formatCurrency(aggregates.credit)}</span>
            <span className="text-[10px] text-amber-600 font-medium">Receivables</span>
          </div>
          <div className="bg-purple-50/70 p-3 rounded-2xl border border-purple-100 shadow-xs col-span-2 sm:col-span-1">
            <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider block">Credit Collected</span>
            <span className="text-base font-black text-purple-900 mt-0.5 block">{formatCurrency(aggregates.collected)}</span>
            <span className="text-[10px] text-purple-600 font-medium">Settlements</span>
          </div>
        </div>
      )}

      {/* Main Report Content */}
      {isLoading ? (
        <PageLoader />
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
          {/* ========================================================= */}
          {/* TAB 1: Daily Sales & Settlements */}
          {/* ========================================================= */}
          {tab === 'daily' && (
            <div>
              {/* Mobile View: Cards */}
              <div className="sm:hidden divide-y divide-gray-100">
                {(data || []).map((row, i) => (
                  <div key={i} className="p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-gray-900 text-sm">{formatDate(row.date)}</span>
                      <span className="px-2 py-0.5 bg-gray-100 rounded-md font-semibold text-gray-700 text-xs">
                        {row.bill_count} bills
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-emerald-50/60 p-2 rounded-xl">
                        <span className="text-[10px] text-emerald-700 uppercase font-bold block">Cash</span>
                        <span className="font-bold text-emerald-900">{formatCurrency(row.cash_amount)}</span>
                      </div>
                      <div className="bg-blue-50/60 p-2 rounded-xl">
                        <span className="text-[10px] text-blue-700 uppercase font-bold block">Online / UPI</span>
                        <span className="font-bold text-blue-900">{formatCurrency(row.online_amount)}</span>
                      </div>
                      <div className="bg-amber-50/60 p-2 rounded-xl">
                        <span className="text-[10px] text-amber-700 uppercase font-bold block">Credit Given</span>
                        <span className="font-bold text-amber-900">{formatCurrency(row.credit_amount)}</span>
                      </div>
                      <div className="bg-purple-50/60 p-2 rounded-xl">
                        <span className="text-[10px] text-purple-700 uppercase font-bold block">Credit Collected</span>
                        <span className="font-bold text-purple-900">{formatCurrency(row.credit_collected)}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-gray-50 text-xs font-bold">
                      <span className="text-gray-500">Total Revenue:</span>
                      <span className="text-base text-gray-900 font-black">{formatCurrency(row.total_amount)}</span>
                    </div>
                  </div>
                ))}
                {(!data || data.length === 0) && (
                  <div className="text-center py-10 text-gray-400 text-xs">
                    No sales data found for the selected period
                  </div>
                )}
              </div>

              {/* Desktop View: Full Table */}
              <div className="hidden sm:block overflow-x-auto w-full">
                <table className="w-full text-left text-xs min-w-[700px]">
                  <thead>
                    <tr className="bg-gray-50/70 border-b border-gray-100 text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-3 text-center">Bills</th>
                      <th className="py-3 px-3 text-right">Cash</th>
                      <th className="py-3 px-3 text-right">Online</th>
                      <th className="py-3 px-3 text-right">Credit Given</th>
                      <th className="py-3 px-3 text-right">Credit Collected</th>
                      <th className="py-3 px-4 text-right">Total Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(data || []).map((row, i) => (
                      <tr key={i} className="hover:bg-gray-50/80 transition">
                        <td className="py-3.5 px-4 font-bold text-gray-900">{formatDate(row.date)}</td>
                        <td className="py-3.5 px-3 text-center">
                          <span className="px-2 py-0.5 bg-gray-100 rounded-md font-semibold text-gray-700">
                            {row.bill_count}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-right font-medium text-emerald-700">
                          {formatCurrency(row.cash_amount)}
                        </td>
                        <td className="py-3.5 px-3 text-right font-medium text-blue-700">
                          {formatCurrency(row.online_amount)}
                        </td>
                        <td className="py-3.5 px-3 text-right font-medium text-amber-700">
                          {formatCurrency(row.credit_amount)}
                        </td>
                        <td className="py-3.5 px-3 text-right font-medium text-purple-700">
                          {formatCurrency(row.credit_collected)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-black text-gray-900 text-sm">
                          {formatCurrency(row.total_amount)}
                        </td>
                      </tr>
                    ))}
                    {(!data || data.length === 0) && (
                      <tr>
                        <td colSpan={7} className="text-center py-10 text-gray-400">
                          No sales data found for the selected period
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 2: Shift Performance */}
          {/* ========================================================= */}
          {tab === 'shift' && (
            <div>
              {/* Mobile View: Cards */}
              <div className="sm:hidden divide-y divide-gray-100">
                {(data || []).map((row, i) => (
                  <div key={i} className="p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-gray-900 text-sm">{row.shift__name}</span>
                      <span className="px-2 py-0.5 bg-gray-100 rounded-md font-semibold text-gray-700 text-xs">
                        {row.bill_count} bills
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="bg-emerald-50/60 p-2 rounded-xl">
                        <span className="text-[10px] text-emerald-700 uppercase font-bold block">Cash</span>
                        <span className="font-bold text-emerald-900">{formatCurrency(row.cash_amount)}</span>
                      </div>
                      <div className="bg-blue-50/60 p-2 rounded-xl">
                        <span className="text-[10px] text-blue-700 uppercase font-bold block">Online</span>
                        <span className="font-bold text-blue-900">{formatCurrency(row.online_amount)}</span>
                      </div>
                      <div className="bg-amber-50/60 p-2 rounded-xl">
                        <span className="text-[10px] text-amber-700 uppercase font-bold block">Credit</span>
                        <span className="font-bold text-amber-900">{formatCurrency(row.credit_amount)}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-gray-50 text-xs font-bold">
                      <span className="text-gray-500">Shift Sales Total:</span>
                      <span className="text-base text-gray-900 font-black">{formatCurrency(row.total_amount)}</span>
                    </div>
                  </div>
                ))}
                {(!data || data.length === 0) && (
                  <div className="text-center py-10 text-gray-400 text-xs">
                    No shift data for the selected period
                  </div>
                )}
              </div>

              {/* Desktop View: Table */}
              <div className="hidden sm:block overflow-x-auto w-full">
                <table className="w-full text-left text-xs min-w-[600px]">
                  <thead>
                    <tr className="bg-gray-50/70 border-b border-gray-100 text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-3 px-4">Shift</th>
                      <th className="py-3 px-3 text-center">Bills Count</th>
                      <th className="py-3 px-3 text-right">Cash</th>
                      <th className="py-3 px-3 text-right">Online</th>
                      <th className="py-3 px-3 text-right">Credit</th>
                      <th className="py-3 px-4 text-right">Total Shift Sales</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(data || []).map((row, i) => (
                      <tr key={i} className="hover:bg-gray-50/80 transition">
                        <td className="py-3.5 px-4 font-bold text-gray-900 text-sm">{row.shift__name}</td>
                        <td className="py-3.5 px-3 text-center">
                          <span className="px-2 py-0.5 bg-gray-100 rounded-md font-semibold text-gray-700">
                            {row.bill_count}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-right font-medium text-emerald-700">
                          {formatCurrency(row.cash_amount)}
                        </td>
                        <td className="py-3.5 px-3 text-right font-medium text-blue-700">
                          {formatCurrency(row.online_amount)}
                        </td>
                        <td className="py-3.5 px-3 text-right font-medium text-amber-700">
                          {formatCurrency(row.credit_amount)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-black text-gray-900 text-sm">
                          {formatCurrency(row.total_amount)}
                        </td>
                      </tr>
                    ))}
                    {(!data || data.length === 0) && (
                      <tr>
                        <td colSpan={6} className="text-center py-10 text-gray-400">
                          No shift data for the selected period
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 3: Product Performance */}
          {/* ========================================================= */}
          {tab === 'product' && (
            <div>
              {/* Mobile View: Cards */}
              <div className="sm:hidden divide-y divide-gray-100">
                {(data || []).map((row, i) => (
                  <div key={i} className="p-3.5 flex items-center justify-between gap-3 text-xs">
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-gray-900 text-sm truncate">{row.product__name}</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        {row.product__pack_size ? `${row.product__pack_size} · ` : ''}{row.total_qty} units sold
                      </p>
                    </div>
                    <span className="font-black text-gray-900 text-sm shrink-0">
                      {formatCurrency(row.total_revenue)}
                    </span>
                  </div>
                ))}
                {(!data || data.length === 0) && (
                  <div className="text-center py-10 text-gray-400 text-xs">
                    No product sales recorded in this period
                  </div>
                )}
              </div>

              {/* Desktop View: Table */}
              <div className="hidden sm:block overflow-x-auto w-full">
                <table className="w-full text-left text-xs min-w-[500px]">
                  <thead>
                    <tr className="bg-gray-50/70 border-b border-gray-100 text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-3 px-4">Product</th>
                      <th className="py-3 px-4">Pack Size</th>
                      <th className="py-3 px-4 text-center">Quantity Sold</th>
                      <th className="py-3 px-4 text-right">Total Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(data || []).map((row, i) => (
                      <tr key={i} className="hover:bg-gray-50/80 transition">
                        <td className="py-3.5 px-4 font-bold text-gray-900">{row.product__name}</td>
                        <td className="py-3.5 px-4 text-gray-500">{row.product__pack_size || '-'}</td>
                        <td className="py-3.5 px-4 text-center font-bold text-gray-800">
                          {row.total_qty} units
                        </td>
                        <td className="py-3.5 px-4 text-right font-black text-gray-900 text-sm">
                          {formatCurrency(row.total_revenue)}
                        </td>
                      </tr>
                    ))}
                    {(!data || data.length === 0) && (
                      <tr>
                        <td colSpan={4} className="text-center py-10 text-gray-400">
                          No product sales recorded in this period
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 4: Customer Dues & Sales */}
          {/* ========================================================= */}
          {tab === 'customer' && (
            <div>
              {/* Mobile View: Cards */}
              <div className="sm:hidden divide-y divide-gray-100">
                {(data || []).map((row, i) => (
                  <div key={i} className="p-3.5 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="font-bold text-gray-900 text-sm truncate">{row.customer__name}</h3>
                        <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-0.5">
                          <span>{row.customer__customer_code}</span>
                          {row.customer__phone && (
                            <span className="flex items-center gap-1 text-gray-400">
                              <Phone className="w-3 h-3" />
                              <span>{row.customer__phone}</span>
                            </span>
                          )}
                        </div>
                      </div>
                      <Link
                        to={`/customers/${row.customer__customer_code || row.customer__id}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-800 font-bold rounded-lg text-xs transition shrink-0 cursor-pointer"
                      >
                        <span>Ledger</span>
                        <ChevronRight className="w-3 h-3" />
                      </Link>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-gray-50">
                      <div>
                        <span className="text-[10px] text-gray-400 block font-semibold">Total Purchases</span>
                        <span className="font-bold text-gray-900">{formatCurrency(row.total_amount)} ({row.purchase_count} bills)</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-gray-400 block font-semibold">Outstanding Due</span>
                        <span className={`font-black text-sm ${row.outstanding_amount > 0 ? 'text-red-700' : 'text-emerald-700'}`}>
                          {row.outstanding_amount > 0 ? formatCurrency(row.outstanding_amount) : '₹0.00'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
                {(!data || data.length === 0) && (
                  <div className="text-center py-10 text-gray-400 text-xs">
                    No customer purchase data found
                  </div>
                )}
              </div>

              {/* Desktop View: Table */}
              <div className="hidden sm:block overflow-x-auto w-full">
                <table className="w-full text-left text-xs min-w-[600px]">
                  <thead>
                    <tr className="bg-gray-50/70 border-b border-gray-100 text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-3 px-4">Customer</th>
                      <th className="py-3 px-4">Phone</th>
                      <th className="py-3 px-4 text-center">Purchases</th>
                      <th className="py-3 px-4 text-right">Total Purchases</th>
                      <th className="py-3 px-4 text-right">Credit Outstanding</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(data || []).map((row, i) => (
                      <tr key={i} className="hover:bg-gray-50/80 transition">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-gray-900">{row.customer__name}</div>
                          <span className="text-[10px] text-gray-400">{row.customer__customer_code}</span>
                        </td>
                        <td className="py-3.5 px-4 text-gray-600 font-medium">
                          {row.customer__phone ? (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                              <span>{row.customer__phone}</span>
                            </span>
                          ) : '-'}
                        </td>
                        <td className="py-3.5 px-4 text-center font-semibold text-gray-700">
                          {row.purchase_count} bills
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-gray-900">
                          {formatCurrency(row.total_amount)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-black text-sm">
                          {row.outstanding_amount > 0 ? (
                            <span className="text-red-700">{formatCurrency(row.outstanding_amount)}</span>
                          ) : (
                            <span className="text-emerald-700">₹0.00</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <Link
                            to={`/customers/${row.customer__customer_code || row.customer__id}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-lg text-xs transition cursor-pointer"
                          >
                            <span>Ledger</span>
                            <ChevronRight className="w-3 h-3" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                    {(!data || data.length === 0) && (
                      <tr>
                        <td colSpan={6} className="text-center py-10 text-gray-400">
                          No customer purchase data found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
