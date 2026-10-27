import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { shiftsApi, salesApi, productsApi, inventoryApi } from '../../api'
import { useAuth } from '../../hooks/useAuth'
import {
  Clock, CheckCircle, AlertTriangle, ArrowRight, DollarSign,
  CreditCard, Smartphone, Receipt, AlertCircle, Sparkles, FileText,
  Calendar, ShoppingBag, ChevronDown, ChevronUp, UserCheck, CheckCircle2,
  PackageCheck, Package, Search, RefreshCw, Layers
} from 'lucide-react'
import { PageLoader } from '../../components/ui/Spinner'
import { Button } from '../../components/ui/Button'
import { Select, Input, Textarea } from '../../components/ui/Input'
import { Badge } from '../../components/ui/Badge'
import { Modal } from '../../components/ui/Modal'
import { addToast } from '../../hooks/useToast'
import { formatCurrency, formatDateTime } from '../../lib/utils'

export default function MyShiftPage() {
  const { user } = useAuth()
  const qc = useQueryClient()

  // Active Tab: 'current' (shift open/close) or 'my-sales' (own sales by date)
  const [activeTab, setActiveTab] = useState('current')

  // Date selection for sales tracking
  const todayStr = new Date().toISOString().slice(0, 10)
  const yesterdayStr = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
  const [selectedDate, setSelectedDate] = useState(todayStr)

  // Shift Management State
  const [selectedShift, setSelectedShift] = useState('')
  const [openingCash, setOpeningCash] = useState('0')
  const [closingCash, setClosingCash] = useState('')
  const [notes, setNotes] = useState('')
  const [showConfirmClose, setShowConfirmClose] = useState(false)
  const [editingShiftModal, setEditingShiftModal] = useState(null)
  const [editStartTime, setEditStartTime] = useState('')
  const [editEndTime, setEditEndTime] = useState('')

  // Mandatory Closing Stock Verification State
  const [stockVerified, setStockVerified] = useState(false)
  const [showStockCountModal, setShowStockCountModal] = useState(false)
  const [stockCounts, setStockCounts] = useState({})
  const [stockFilterCategory, setStockFilterCategory] = useState('')
  const [stockSearchTerm, setStockSearchTerm] = useState('')
  const [submittingStockCount, setSubmittingStockCount] = useState(false)

  // Active products query for physical stock count
  const { data: productsData, isLoading: loadingProducts } = useQuery({
    queryKey: ['products-for-shift-stock'],
    queryFn: () => productsApi.list({ is_active: true, page_size: 150 }).then(r => r.data),
  })
  const activeProducts = useMemo(() => {
    return Array.isArray(productsData) ? productsData : (productsData?.results || [])
  }, [productsData])

  const productCategories = useMemo(() => {
    const set = new Set()
    activeProducts.forEach(p => {
      const cat = p.category_name || (typeof p.category === 'object' ? p.category?.name : p.category)
      if (cat) set.add(cat)
    })
    return Array.from(set)
  }, [activeProducts])

  const filteredStockProducts = useMemo(() => {
    return activeProducts.filter(p => {
      const cat = p.category_name || (typeof p.category === 'object' ? p.category?.name : p.category) || ''
      const matchesCat = !stockFilterCategory || cat === stockFilterCategory
      const search = stockSearchTerm.toLowerCase()
      const matchesSearch = !stockSearchTerm ||
        p.name.toLowerCase().includes(search) ||
        (p.pack_size && p.pack_size.toLowerCase().includes(search))
      return matchesCat && matchesSearch
    })
  }, [activeProducts, stockFilterCategory, stockSearchTerm])

  const handleOpenStockVerification = () => {
    const initialCounts = { ...stockCounts }
    activeProducts.forEach(p => {
      if (initialCounts[p.id] === undefined) {
        initialCounts[p.id] = p.stock_quantity ?? 0
      }
    })
    setStockCounts(initialCounts)
    setShowStockCountModal(true)
  }

  const handleSaveStockCounts = async () => {
    setSubmittingStockCount(true)
    try {
      const adjustments = []
      for (const p of activeProducts) {
        const countedVal = stockCounts[p.id]
        if (countedVal !== undefined && countedVal !== '') {
          const counted = Number(countedVal)
          const current = Number(p.stock_quantity || 0)
          if (counted !== current) {
            adjustments.push(
              inventoryApi.adjust({
                product: p.id,
                transaction_type: 'ADJUSTMENT',
                quantity: counted,
                reason: `Shift #${currentShift?.id || ''} closing handover count by ${user?.full_name || 'cashier'} (previous: ${current}, counted: ${counted})`,
              })
            )
          }
        }
      }

      if (adjustments.length > 0) {
        await Promise.all(adjustments)
        qc.invalidateQueries(['products-for-shift-stock'])
        qc.invalidateQueries(['products'])
        qc.invalidateQueries(['inventory'])
        addToast(`Physical stock count recorded! ${adjustments.length} discrepancy adjustment(s) logged for owner.`)
      } else {
        addToast('Stock count verified! All physical items match system records.')
      }

      setStockVerified(true)
      setShowStockCountModal(false)
    } catch (err) {
      addToast(err.response?.data?.detail || 'Failed to record stock count', 'error')
    } finally {
      setSubmittingStockCount(false)
    }
  }

  const handleOpenEditTiming = (shiftObj) => {
    setEditingShiftModal(shiftObj)
    setEditStartTime(shiftObj.start_time || shiftObj.shift_start_time || '06:00')
    setEditEndTime(shiftObj.end_time || shiftObj.shift_end_time || '14:00')
  }

  const handleSaveTiming = async () => {
    if (!editingShiftModal) return
    const shiftId = editingShiftModal.shift || editingShiftModal.id
    try {
      await shiftsApi.update(shiftId, {
        start_time: editStartTime,
        end_time: editEndTime,
      })
      qc.invalidateQueries(['shifts'])
      qc.invalidateQueries(['current-shift'])
      setEditingShiftModal(null)
      addToast('Shift timing updated successfully!')
    } catch {
      addToast('Failed to update shift timing', 'error')
    }
  }

  // Shift templates
  const { data: shiftsData } = useQuery({
    queryKey: ['shifts'],
    queryFn: () => shiftsApi.list().then(r => r.data),
  })
  const shifts = Array.isArray(shiftsData) ? shiftsData : (shiftsData?.results || [])

  // Current active shift
  const { data: currentShift, isLoading } = useQuery({
    queryKey: ['current-shift'],
    queryFn: () => shiftsApi.current().then(r => r.data).catch(() => null),
  })

  // Sales by selected date for this employee
  const { data: daySalesData, isLoading: loadingDaySales } = useQuery({
    queryKey: ['my-sales-date', selectedDate],
    queryFn: () => salesApi.list({ date_from: selectedDate, date_to: selectedDate, page_size: 200 }).then(r => r.data),
    enabled: activeTab === 'my-sales',
  })
  const daySales = Array.isArray(daySalesData) ? daySalesData : (daySalesData?.results || [])

  // Employee shift records on selected date
  const { data: dayShiftsData } = useQuery({
    queryKey: ['my-shifts-date', selectedDate],
    queryFn: () => shiftsApi.employeeShifts({ date: selectedDate }).then(r => r.data),
    enabled: activeTab === 'my-sales',
  })
  const dayShifts = Array.isArray(dayShiftsData) ? dayShiftsData : (dayShiftsData?.results || [])
  const recordedShift = dayShifts[0] || null

  const openMutation = useMutation({
    mutationFn: (data) => shiftsApi.open(data),
    onSuccess: () => {
      qc.invalidateQueries(['current-shift'])
      addToast('Shift opened successfully!')
    },
    onError: (err) => addToast(err.response?.data?.detail || 'Failed to open shift', 'error'),
  })

  const closeMutation = useMutation({
    mutationFn: (data) => shiftsApi.close(data),
    onSuccess: () => {
      qc.invalidateQueries(['current-shift'])
      setShowConfirmClose(false)
      setClosingCash('')
      setNotes('')
      addToast('Shift closed successfully!')
    },
    onError: (err) => addToast(err.response?.data?.detail || 'Failed to close shift', 'error'),
  })

  // Computations for active shift
  const opening = Number(currentShift?.opening_cash || 0)
  const cashSales = Number(currentShift?.cash_sales || 0)
  const upiSales = Number(currentShift?.upi_sales || 0)
  const creditSales = Number(currentShift?.credit_sales || 0)
  const creditCollected = Number(currentShift?.credit_collected || 0)
  const cashCreditCollected = Number(currentShift?.cash_credit_collected || 0)
  const totalSales = Number(currentShift?.total_sales || 0)
  const salesCount = Number(currentShift?.sales_count || 0)
  const expectedCash = Number(currentShift?.expected_cash ?? (opening + cashSales + cashCreditCollected))

  const countedCash = closingCash !== '' ? Number(closingCash) : null
  const cashDiff = countedCash !== null ? (countedCash - expectedCash) : null

  // Aggregated day sales analysis
  const dayAnalysis = useMemo(() => {
    let totalRevenue = 0
    let totalCash = 0
    let totalUPI = 0
    let totalCredit = 0
    const productsMap = {}

    daySales.forEach(sale => {
      if (sale.status === 'CANCELLED') return
      const amount = Number(sale.total || 0)
      totalRevenue += amount
      if (sale.payment_method === 'CASH') totalCash += amount
      else if (sale.payment_method === 'ONLINE' || sale.payment_method === 'UPI') totalUPI += amount
      else if (sale.payment_method === 'CREDIT') totalCredit += amount

      // Aggregate products sold
      if (Array.isArray(sale.items)) {
        sale.items.forEach(it => {
          const key = it.product_name || `Product #${it.product}`
          if (!productsMap[key]) {
            productsMap[key] = {
              name: key,
              pack: it.product_pack_size || '',
              quantity: 0,
              totalAmount: 0,
            }
          }
          productsMap[key].quantity += Number(it.quantity || 0)
          productsMap[key].totalAmount += Number(it.line_total || (Number(it.quantity) * Number(it.unit_price)))
        })
      }
    })

    const openingFloat = Number(recordedShift?.opening_cash || (selectedDate === todayStr ? opening : 0))
    const availableCashInHand = openingFloat + totalCash

    return {
      totalRevenue,
      totalCash,
      totalUPI,
      totalCredit,
      billCount: daySales.length,
      openingFloat,
      availableCashInHand,
      productsList: Object.values(productsMap).sort((a, b) => b.quantity - a.quantity),
    }
  }, [daySales, recordedShift, selectedDate, todayStr, opening])

  if (isLoading) return <PageLoader />

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-4 py-6 space-y-6">
      {/* Header & Cashier Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Shift & My Sales</h1>
          <p className="text-sm text-gray-500">
            Cashier: <strong className="text-gray-800">{user?.full_name}</strong> (@{user?.username})
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-2xl overflow-x-auto w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('current')}
            className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-xl text-[11px] sm:text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'current'
                ? 'bg-white text-green-800 shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Active Counter Shift
          </button>
          <button
            onClick={() => setActiveTab('my-sales')}
            className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-xl text-[11px] sm:text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'my-sales'
                ? 'bg-white text-green-800 shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            My Sales Records
          </button>
        </div>
      </div>

      {/* TAB 1: CURRENT ACTIVE COUNTER SHIFT */}
      {activeTab === 'current' && (
        <div className="space-y-6">
          {currentShift ? (
            <div className="space-y-6">
              {/* Active Shift Header Card */}
              <div className="bg-gradient-to-r from-emerald-700 to-green-600 rounded-3xl p-6 text-white shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-300 animate-pulse" />
                      <p className="text-xs uppercase tracking-wider text-green-200 font-semibold">Active Session</p>
                    </div>
                    <h2 className="text-xl font-bold mt-1">{currentShift.shift_name}</h2>
                    <div className="flex items-center gap-3 mt-1">
                      <p className="text-xs text-green-100 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        Scheduled: {currentShift.shift_start_time} – {currentShift.shift_end_time}
                      </p>
                      <button
                        onClick={() => handleOpenEditTiming(currentShift)}
                        className="text-xs underline text-green-200 hover:text-white font-semibold"
                      >
                        Adjust Hours
                      </button>
                    </div>
                  </div>

                  <div className="bg-white/10 backdrop-blur-sm px-4 py-3 rounded-2xl border border-white/20">
                    <p className="text-[11px] text-green-100 uppercase tracking-wide">Opened At</p>
                    <p className="text-sm font-semibold">{formatDateTime(currentShift.opened_at)}</p>
                  </div>
                </div>
              </div>

              {/* Payment & Cash Breakdown Grid */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">
                  Payments Collected In This Shift
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-xs">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-medium text-gray-500">Cash Sales</span>
                      <div className="w-7 h-7 rounded-lg bg-green-50 text-green-600 flex items-center justify-center">
                        <DollarSign className="w-4 h-4" />
                      </div>
                    </div>
                    <p className="text-lg font-bold text-gray-900">{formatCurrency(cashSales)}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">Paid in cash</p>
                  </div>

                  <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-xs">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-medium text-gray-500">Online / UPI</span>
                      <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                        <Smartphone className="w-4 h-4" />
                      </div>
                    </div>
                    <p className="text-lg font-bold text-gray-900">{formatCurrency(upiSales)}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">Online UPI QR</p>
                  </div>

                  <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-xs">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-medium text-gray-500">Credit Given</span>
                      <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                        <CreditCard className="w-4 h-4" />
                      </div>
                    </div>
                    <p className="text-lg font-bold text-gray-900">{formatCurrency(creditSales)}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">Receivable sales</p>
                  </div>

                  <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-xs">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-medium text-gray-500">Total Shift Sales</span>
                      <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                        <Receipt className="w-4 h-4" />
                      </div>
                    </div>
                    <p className="text-lg font-bold text-green-700">{formatCurrency(totalSales)}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">{salesCount} bill{salesCount !== 1 ? 's' : ''} generated</p>
                  </div>
                </div>
              </div>

              {/* Shift Handover & Reconciliation Box */}
              <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-xs space-y-6">
                <div>
                  <h3 className="text-base font-bold text-gray-900">Shift Handover & Reconciliation</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Complete physical stock verification first, then settle the cash drawer balance to close your shift.
                  </p>
                </div>

                {/* STEP 1: MANDATORY PHYSICAL STOCK VERIFICATION */}
                <div className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                  stockVerified
                    ? 'bg-emerald-50 border-emerald-200'
                    : 'bg-amber-50 border-amber-200'
                }`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 mt-0.5 ${
                        stockVerified ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {stockVerified ? <PackageCheck className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                            stockVerified ? 'bg-emerald-200 text-emerald-900' : 'bg-amber-200 text-amber-900'
                          }`}>
                            Step 1 {stockVerified ? '✓ Verified' : '• Required'}
                          </span>
                        </div>
                        <p className="font-bold text-gray-900 text-sm mt-1">
                          {stockVerified
                            ? 'Physical Closing Stock Counted & Logged'
                            : 'Physical Counter Stock Verification Required'}
                        </p>
                        <p className="text-xs text-gray-600 mt-0.5">
                          {stockVerified
                            ? 'Physical stock was counted and discrepancies recorded for the owner.'
                            : 'Count all milk, curd, ghee and items on counter before closing shift.'}
                        </p>
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant={stockVerified ? 'secondary' : 'primary'}
                      className="shrink-0 text-xs py-2.5 px-4 font-bold"
                      onClick={handleOpenStockVerification}
                    >
                      {stockVerified ? 'Review / Re-count Stock' : 'Count & Verify Stock →'}
                    </Button>
                  </div>
                </div>

                {/* STEP 2: CASH DRAWER STATUS & SETTLEMENT */}
                <div className={`space-y-4 pt-1 transition-all ${
                  !stockVerified ? 'opacity-80' : 'opacity-100'
                }`}>
                  <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        stockVerified ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                      }`}>
                        Step 2
                      </span>
                      <h4 className="text-sm font-bold text-gray-800">Cash Drawer Reconciliation</h4>
                    </div>
                    {!stockVerified && (
                      <span className="text-xs font-semibold text-amber-700 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        Complete Step 1 first
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-gray-50 rounded-2xl text-xs">
                    <div>
                      <span className="text-gray-500 block">Opening Cash Float:</span>
                      <p className="text-sm font-bold text-gray-800 mt-0.5">{formatCurrency(opening)}</p>
                    </div>
                    <div>
                      <span className="text-gray-500 block">+ Cash Sales:</span>
                      <p className="text-sm font-bold text-emerald-700 mt-0.5">+{formatCurrency(cashSales)}</p>
                    </div>
                    <div>
                      <span className="text-gray-500 block">+ Cash Credit Settled:</span>
                      <p className="text-sm font-bold text-blue-700 mt-0.5">+{formatCurrency(cashCreditCollected)}</p>
                    </div>
                    <div className="border-t sm:border-t-0 sm:border-l border-gray-200 pt-2 sm:pt-0 sm:pl-3 col-span-2 sm:col-span-1">
                      <span className="text-gray-700 font-bold block">Expected in Drawer:</span>
                      <p className="text-base font-black text-gray-900 mt-0.5">{formatCurrency(expectedCash)}</p>
                    </div>
                  </div>

                  {/* Close Shift Inputs */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        Closing Physical Cash Counted (₹) *
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-semibold">₹</span>
                        <input
                          type="number"
                          value={closingCash}
                          onChange={e => setClosingCash(e.target.value)}
                          placeholder="Enter physical cash in register"
                          min="0"
                          step="0.01"
                          disabled={!stockVerified}
                          className="w-full pl-8 pr-4 py-3 rounded-xl border border-gray-200 text-base font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-100 disabled:text-gray-400"
                        />
                      </div>
                    </div>

                    {countedCash !== null && stockVerified && (
                      <div className={`p-4 rounded-2xl flex items-center justify-between text-sm ${
                        cashDiff === 0
                          ? 'bg-green-50 text-green-800 border border-green-200'
                          : cashDiff > 0
                          ? 'bg-blue-50 text-blue-800 border border-blue-200'
                          : 'bg-red-50 text-red-800 border border-red-200'
                      }`}>
                        <div>
                          <span className="font-semibold">Reconciliation Difference:</span>
                          <p className="text-xs mt-0.5">
                            {cashDiff === 0
                              ? 'Physical cash matches exact calculated drawer balance.'
                              : cashDiff > 0
                              ? `Surplus: Register has ${formatCurrency(cashDiff)} extra.`
                              : `Shortage: Register is short by ${formatCurrency(Math.abs(cashDiff))}.`}
                          </p>
                        </div>
                        <span className="text-base font-bold">
                          {cashDiff === 0 ? 'Exact Match (₹0)' : (cashDiff > 0 ? `+${formatCurrency(cashDiff)}` : `-${formatCurrency(Math.abs(cashDiff))}`)}
                        </span>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Handover Remarks / Notes
                      </label>
                      <textarea
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        placeholder="Optional notes for owner (e.g. handed over to next shift, petty expenses, etc.)"
                        rows={2}
                        disabled={!stockVerified}
                        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-100 disabled:text-gray-400"
                      />
                    </div>

                    {!stockVerified ? (
                      <div className="space-y-2">
                        <Button
                          variant="secondary"
                          className="w-full py-3.5 text-base font-bold opacity-60 cursor-not-allowed"
                          disabled
                        >
                          End & Close Shift (Locked)
                        </Button>
                        <p className="text-xs text-amber-700 font-semibold text-center flex items-center justify-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Verify counter stock in Step 1 to unlock shift closing
                        </p>
                      </div>
                    ) : !showConfirmClose ? (
                      <Button
                        variant="danger"
                        className="w-full py-3.5 text-base font-bold shadow-sm"
                        onClick={() => setShowConfirmClose(true)}
                        disabled={closingCash === ''}
                      >
                        End & Close Shift
                      </Button>
                    ) : (
                      <div className="p-4 bg-red-50 border border-red-200 rounded-2xl space-y-3">
                        <p className="text-sm font-bold text-red-900">
                          Confirm End of Shift?
                        </p>
                        <p className="text-xs text-red-700">
                          Closing cash: <strong>{formatCurrency(closingCash || 0)}</strong>. Stock verification completed.
                        </p>
                        <div className="flex gap-2">
                          <Button
                            variant="secondary"
                            className="flex-1"
                            onClick={() => setShowConfirmClose(false)}
                          >
                            Cancel
                          </Button>
                          <Button
                            variant="danger"
                            className="flex-1"
                            onClick={() => closeMutation.mutate({
                              closing_cash: Number(closingCash || 0),
                              notes: notes.trim()
                            })}
                            disabled={closeMutation.isPending}
                          >
                            {closeMutation.isPending ? 'Closing...' : 'Yes, Close Shift'}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* No Active Shift Screen */
            <div className="bg-white rounded-3xl border border-gray-100 p-8 shadow-xs space-y-6 max-w-lg mx-auto">
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mx-auto text-green-600">
                  <Clock className="w-8 h-8" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Start Your Shift</h2>
                <p className="text-sm text-gray-500">
                  Select your scheduled shift and enter the opening change in drawer to begin billing sales.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-sm font-semibold text-gray-700">Select Shift Timing *</label>
                    {selectedShift && (
                      <button
                        type="button"
                        onClick={() => {
                          const found = shifts.find(s => String(s.id) === String(selectedShift))
                          if (found) handleOpenEditTiming(found)
                        }}
                        className="text-xs text-green-700 hover:text-green-800 font-semibold underline"
                      >
                        Adjust Shift Hours
                      </button>
                    )}
                  </div>
                  <Select
                    value={selectedShift}
                    onChange={e => setSelectedShift(e.target.value)}
                    required
                  >
                    <option value="">Choose shift...</option>
                    {shifts.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.start_time} – {s.end_time})
                      </option>
                    ))}
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Opening Cash Float in Drawer (₹)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-semibold">₹</span>
                    <input
                      type="number"
                      value={openingCash}
                      onChange={e => setOpeningCash(e.target.value)}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      className="w-full pl-8 pr-4 py-3 rounded-xl border border-gray-200 text-base font-semibold focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1">Starting change provided in the cash drawer</p>
                </div>

                <Button
                  className="w-full py-4 text-base font-bold shadow-md"
                  onClick={() => openMutation.mutate({
                    shift: selectedShift,
                    opening_cash: Number(openingCash || 0)
                  })}
                  disabled={!selectedShift || openMutation.isPending}
                >
                  {openMutation.isPending ? 'Starting...' : 'Open Shift & Enter POS →'}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: MY SALES & DAY RECORDS (TODAY, YESTERDAY, BY DATE) */}
      {activeTab === 'my-sales' && (
        <div className="space-y-6">
          {/* Date Selector Bar */}
          <div className="bg-white rounded-3xl border border-gray-100 p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-green-700" />
              <div>
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">Sales Filter Date</span>
                <p className="text-sm font-bold text-gray-900">{selectedDate}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedDate(todayStr)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                  selectedDate === todayStr
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Today
              </button>
              <button
                onClick={() => setSelectedDate(yesterdayStr)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                  selectedDate === yesterdayStr
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Yesterday
              </button>
              <div className="flex items-center gap-1 border border-gray-200 rounded-xl px-2 py-1">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={e => e.target.value && setSelectedDate(e.target.value)}
                  className="text-xs font-semibold text-gray-700 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Day Key Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-xs">
              <span className="text-xs font-medium text-gray-500">Total Sold By Me</span>
              <p className="text-xl font-black text-green-700 mt-1">{formatCurrency(dayAnalysis.totalRevenue)}</p>
              <p className="text-[11px] text-gray-400 mt-0.5">{dayAnalysis.billCount} bills completed</p>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-xs">
              <span className="text-xs font-medium text-gray-500">Cash Received</span>
              <p className="text-xl font-black text-gray-900 mt-1">{formatCurrency(dayAnalysis.totalCash)}</p>
              <p className="text-[11px] text-gray-400 mt-0.5">Physical currency</p>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-xs">
              <span className="text-xs font-medium text-gray-500">UPI Payments</span>
              <p className="text-xl font-black text-blue-700 mt-1">{formatCurrency(dayAnalysis.totalUPI)}</p>
              <p className="text-[11px] text-gray-400 mt-0.5">Digital QR transfers</p>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 shadow-xs">
              <span className="text-xs font-bold text-emerald-800">Total Cash In Hand</span>
              <p className="text-xl font-black text-emerald-900 mt-1">{formatCurrency(dayAnalysis.availableCashInHand)}</p>
              <p className="text-[11px] text-emerald-700 mt-0.5">
                Float: {formatCurrency(dayAnalysis.openingFloat)} + Cash: {formatCurrency(dayAnalysis.totalCash)}
              </p>
            </div>
          </div>

          {/* What Did I Sell? Products Breakdown */}
          <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-green-100 text-green-700 flex items-center justify-center font-bold">
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">What Did I Sell? (Products Breakdown)</h3>
                  <p className="text-xs text-gray-400">Total quantities of milk, curd, and items sold on {selectedDate}</p>
                </div>
              </div>
              <span className="text-xs font-bold text-gray-500">
                {dayAnalysis.productsList.length} distinct item{dayAnalysis.productsList.length !== 1 ? 's' : ''}
              </span>
            </div>

            {loadingDaySales ? (
              <PageLoader />
            ) : dayAnalysis.productsList.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">
                No products sold on this date ({selectedDate}).
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {dayAnalysis.productsList.map((prod, idx) => (
                  <div key={idx} className="p-3.5 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-gray-900 text-sm">{prod.name}</p>
                      {prod.pack && <p className="text-gray-500">{prod.pack}</p>}
                    </div>
                    <div className="text-right">
                      <p className="text-base font-black text-green-700">
                        {prod.quantity} <span className="text-xs font-normal text-gray-500">sold</span>
                      </p>
                      <p className="text-xs font-semibold text-gray-600 mt-0.5">
                        {formatCurrency(prod.totalAmount)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Bills Generated by Employee */}
          <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                  <Receipt className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">Bills Generated</h3>
                  <p className="text-xs text-gray-400">Transaction log for {selectedDate}</p>
                </div>
              </div>
            </div>

            {daySales.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">No bills generated on this date</p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {daySales.map(sale => (
                  <div key={sale.id} className="p-3.5 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-between text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900 text-sm">{sale.bill_number}</span>
                        <Badge variant={sale.payment_method === 'CASH' ? 'success' : sale.payment_method === 'UPI' ? 'info' : 'purple'}>
                          {sale.payment_method}
                        </Badge>
                      </div>
                      <p className="text-gray-600 mt-1">Customer: <strong>{sale.customer_name || 'Walk-in'}</strong></p>
                      <p className="text-[11px] text-gray-400">{formatDateTime(sale.created_at)}</p>
                    </div>

                    <div className="text-right">
                      <p className="text-base font-black text-gray-900">{formatCurrency(sale.total)}</p>
                      <span className="text-[10px] text-gray-400">
                        {sale.items?.length || 0} item{sale.items?.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Shift Closing Physical Stock Verification Modal */}
      <Modal
        open={showStockCountModal}
        onClose={() => setShowStockCountModal(false)}
        title="Physical Counter Stock Verification"
        className="sm:max-w-2xl"
      >
        <div className="space-y-4">
          <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-2xl text-xs text-emerald-900">
            <p className="font-bold flex items-center gap-1.5">
              <PackageCheck className="w-4 h-4 text-emerald-700 shrink-0" />
              Counter Stock Reconciliation
            </p>
            <p className="mt-0.5 text-emerald-800">
              Verify physical counts for parlour products. Any difference from system stock will create an official inventory adjustment logged for the owner.
            </p>
          </div>

          {/* Search & Filter Bar */}
          <div className="space-y-2">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search product name or pack size (e.g. 500ml, curd, milk)..."
                value={stockSearchTerm}
                onChange={e => setStockSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            {productCategories.length > 0 && (
              <div className="flex items-center gap-1 overflow-x-auto pb-1">
                <button
                  type="button"
                  onClick={() => setStockFilterCategory('')}
                  className={`px-2.5 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                    !stockFilterCategory ? 'bg-green-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  All ({activeProducts.length})
                </button>
                {productCategories.map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setStockFilterCategory(cat)}
                    className={`px-2.5 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                      stockFilterCategory === cat ? 'bg-green-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Products List */}
          <div className="max-h-[50vh] overflow-y-auto space-y-2 pr-1">
            {loadingProducts ? (
              <PageLoader />
            ) : filteredStockProducts.length === 0 ? (
              <p className="text-center py-8 text-xs text-gray-400">No active products found matching search</p>
            ) : (
              filteredStockProducts.map(prod => {
                const sysStock = Number(prod.stock_quantity || 0)
                const countedVal = stockCounts[prod.id] !== undefined ? stockCounts[prod.id] : sysStock
                const countedNum = Number(countedVal || 0)
                const diff = countedNum - sysStock

                return (
                  <div
                    key={prod.id}
                    className="p-3 bg-gray-50 border border-gray-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900 text-sm truncate">{prod.name}</span>
                        {prod.pack_size && (
                          <span className="px-2 py-0.5 rounded-md bg-white border border-gray-200 text-gray-600 font-medium text-[11px]">
                            {prod.pack_size}
                          </span>
                        )}
                      </div>
                      <p className="text-gray-500 mt-0.5">
                        System Stock: <strong className="text-gray-700">{sysStock}</strong>
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {/* Count input */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-gray-500 font-semibold text-xs">Counted:</span>
                        <input
                          type="number"
                          value={countedVal}
                          onChange={e => {
                            const val = e.target.value
                            setStockCounts(prev => ({ ...prev, [prod.id]: val }))
                          }}
                          min="0"
                          step="1"
                          className="w-20 px-2.5 py-1.5 rounded-xl border border-gray-300 font-bold text-gray-900 text-center text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                        />
                      </div>

                      {/* Discrepancy indicator */}
                      <div className="w-24 text-right">
                        {diff === 0 ? (
                          <span className="px-2 py-1 rounded-lg bg-green-100 text-green-800 font-bold text-[11px]">
                            Match (0)
                          </span>
                        ) : diff > 0 ? (
                          <span className="px-2 py-1 rounded-lg bg-blue-100 text-blue-800 font-bold text-[11px]">
                            +{diff} Surplus
                          </span>
                        ) : (
                          <span className="px-2 py-1 rounded-lg bg-red-100 text-red-800 font-bold text-[11px]">
                            {diff} Short
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Quick Tools & Action Footer */}
          <div className="border-t border-gray-100 pt-3 flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => {
                const reset = {}
                activeProducts.forEach(p => { reset[p.id] = p.stock_quantity ?? 0 })
                setStockCounts(reset)
              }}
              className="text-xs text-gray-500 hover:text-gray-800 font-semibold underline flex items-center gap-1"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reset All to System
            </button>

            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                onClick={() => setShowStockCountModal(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveStockCounts}
                disabled={submittingStockCount || loadingProducts}
                className="font-bold"
              >
                {submittingStockCount ? 'Submitting...' : 'Submit Count & Verify ✓'}
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Shift Timing Edit Modal */}
      <Modal
        open={Boolean(editingShiftModal)}
        onClose={() => setEditingShiftModal(null)}
        title={`Adjust Hours: ${editingShiftModal?.name || editingShiftModal?.shift_name || 'Shift'}`}
      >
        <div className="space-y-4">
          <p className="text-xs text-gray-500">
            Update start and end times for this shift. This will update the parlour schedule for this shift.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Start Time"
              type="time"
              value={editStartTime}
              onChange={e => setEditStartTime(e.target.value)}
              required
            />
            <Input
              label="End Time"
              type="time"
              value={editEndTime}
              onChange={e => setEditEndTime(e.target.value)}
              required
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="secondary"
              onClick={() => setEditingShiftModal(null)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveTiming}
            >
              Save Timing
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
