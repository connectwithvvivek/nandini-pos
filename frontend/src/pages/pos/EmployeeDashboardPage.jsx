import { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { shiftsApi, salesApi, productsApi, inventoryApi } from '../../api'
import { useAuth } from '../../hooks/useAuth'
import { formatCurrency, formatDateTime } from '../../lib/utils'
import {
  DollarSign, Smartphone, CreditCard, Receipt, Clock,
  ShoppingCart, Package, AlertTriangle, ArrowRight, CheckCircle2,
  Boxes, RefreshCw, ChevronRight, UserCheck, Eye
} from 'lucide-react'
import { PageLoader } from '../../components/ui/Spinner'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { Input, Select, Textarea } from '../../components/ui/Input'
import { addToast } from '../../hooks/useToast'

function QuickAdjustModal({ product, open, onClose, onUpdated, currentShift }) {
  const [quantity, setQuantity] = useState('')
  const [reason, setReason] = useState('')
  const [type, setType] = useState('ADJUSTMENT')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!quantity || Number(quantity) <= 0) return
    setLoading(true)
    try {
      await inventoryApi.adjust({
        product: product.id,
        transaction_type: type,
        quantity: Number(quantity),
        shift: currentShift?.shift?.id || currentShift?.shift_id || currentShift?.shift,
        employee_shift: currentShift?.id,
        reason: reason.trim() || 'Shift stock update'
      })
      addToast(`Updated stock for ${product.name}!`)
      onUpdated()
      onClose()
    } catch {
      addToast('Failed to update stock', 'error')
    } finally {
      setLoading(false)
    }
  }

  if (!product) return null
  return (
    <Modal open={open} onClose={onClose} title={`Adjust Stock: ${product.name}`}>
      <div className="p-3 bg-gray-50 rounded-xl mb-3 flex items-center justify-between text-xs">
        <span>Current Stock:</span>
        <strong className="text-base text-gray-900">{product.stock_quantity} {product.unit}</strong>
      </div>
      <form onSubmit={handleSubmit} className="space-y-3">
        <Select label="Movement Type" value={type} onChange={e => setType(e.target.value)}>
          <option value="PURCHASE">Stock In / Received</option>
          <option value="DAMAGE">Damaged / Leakage</option>
          <option value="ADJUSTMENT">Physical Count (Set Exact)</option>
        </Select>
        <Input
          label={`Quantity (${product.unit}) *`}
          type="number"
          value={quantity}
          onChange={e => setQuantity(e.target.value)}
          required
          min="0.1"
          step="any"
          placeholder="e.g. 20"
        />
        <Input
          label="Remarks (Optional)"
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="e.g. Morning crates received"
        />
        <div className="flex gap-2 pt-2">
          <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" className="flex-1 font-bold" disabled={loading}>
            {loading ? 'Saving...' : 'Update Stock'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export default function EmployeeDashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [stockCategory, setStockCategory] = useState('ALL')
  const [adjustingProduct, setAdjustingProduct] = useState(null)
  const [readOnlyMode, setReadOnlyMode] = useState(false)
  const [startShiftId, setStartShiftId] = useState('')
  const [startOpeningCash, setStartOpeningCash] = useState('0')
  const [openingShiftLoading, setOpeningShiftLoading] = useState(false)

  // Current active shift
  const { data: currentShift, isLoading: loadingShift } = useQuery({
    queryKey: ['current-shift'],
    queryFn: () => shiftsApi.current().then(r => r.data).catch(() => null),
  })

  // List of active shift templates (Morning, Afternoon, Evening)
  const { data: shiftsList = [] } = useQuery({
    queryKey: ['active-shifts-list'],
    queryFn: () => shiftsApi.list().then(r => Array.isArray(r.data) ? r.data : (r.data?.results || [])),
  })

  const handleStartShift = async (e) => {
    e.preventDefault()
    if (!startShiftId) {
      addToast('Please select your shift (Morning, Afternoon, or Evening).', 'error')
      return
    }
    setOpeningShiftLoading(true)
    try {
      await shiftsApi.open({
        shift: Number(startShiftId),
        opening_cash: Number(startOpeningCash) || 0
      })
      addToast('Shift started! Cash counter is open for billing.')
      qc.invalidateQueries({ queryKey: ['current-shift'] })
      setReadOnlyMode(false)
    } catch (err) {
      addToast(err.response?.data?.detail || 'Failed to start shift.', 'error')
    } finally {
      setOpeningShiftLoading(false)
    }
  }

  // Today's sales by this cashier
  const todayStr = new Date().toISOString().slice(0, 10)
  const { data: salesData, isLoading: loadingSales } = useQuery({
    queryKey: ['employee-dashboard-sales', todayStr],
    queryFn: () => salesApi.list({ date_from: todayStr, date_to: todayStr, page_size: 50 }).then(r => r.data),
  })
  const sales = Array.isArray(salesData) ? salesData : (salesData?.results || [])

  // Parlour products stock
  const { data: productsData, isLoading: loadingProducts, refetch: refetchProducts } = useQuery({
    queryKey: ['products-dashboard'],
    queryFn: () => productsApi.list({ is_active: true, page_size: 100 }).then(r => r.data),
  })
  const products = Array.isArray(productsData) ? productsData : (productsData?.results || [])

  // Shift & Cash breakdown
  const opening = Number(currentShift?.opening_cash || 0)
  const cashSales = Number(currentShift?.cash_sales || 0)
  const upiSales = Number(currentShift?.upi_sales || 0)
  const creditSales = Number(currentShift?.credit_sales || 0)
  const cashCreditCollected = Number(currentShift?.cash_credit_collected || 0)
  const totalSales = Number(currentShift?.total_sales || 0)
  const salesCount = Number(currentShift?.sales_count || sales.length)
  const expectedCash = Number(currentShift?.expected_cash ?? (opening + cashSales + cashCreditCollected))

  // Filtered products
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      if (stockCategory === 'ALL') return true
      if (stockCategory === 'LOW') return p.is_low_stock
      return p.category_name?.toLowerCase().includes(stockCategory.toLowerCase())
    })
  }, [products, stockCategory])

  const lowStockCount = useMemo(() => products.filter(p => p.is_low_stock).length, [products])

  if (loadingShift && loadingSales) return <PageLoader />

  return (
    <div className="max-w-6xl mx-auto space-y-5 px-3 sm:px-4 md:px-6 py-4 md:py-6">
      {/* Top Welcome & Shift Banner */}
      <div className="bg-white rounded-3xl border border-gray-100 p-4 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Cashier Dashboard</span>
            <span className="text-gray-300">•</span>
            {currentShift ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-800">
                <span className="w-2 h-2 rounded-full bg-green-600 animate-pulse" />
                {currentShift.shift_name}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                No Active Shift
              </span>
            )}
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">
            Hello, {user?.full_name}
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {currentShift
              ? `Shift hours: ${currentShift.shift_start_time} – ${currentShift.shift_end_time}`
              : 'Open your shift counter to start billing customers.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/shift"
            className="flex-1 sm:flex-none px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center gap-1.5"
          >
            <Clock className="w-4 h-4 text-gray-500" />
            <span>Shift & Cash</span>
          </Link>
          <Link
            to="/pos"
            className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-xs font-bold transition-colors shadow-xs flex items-center justify-center gap-1.5"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>New Sale</span>
          </Link>
        </div>
      </div>

      {/* If No Shift Open: Remind Cashier on Login to Start Shift & Set Opening Balance (Light & Simple) */}
      {!currentShift && !readOnlyMode && (
        <div className="bg-white rounded-3xl p-5 text-gray-900 shadow-xs border border-gray-100 space-y-4 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start sm:items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 border border-amber-100">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200/80">
                    Shift Action Required
                  </span>
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                </div>
                <h2 className="text-base sm:text-lg font-bold text-gray-900 mt-1">Start Shift & Confirm Opening Balance</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Select your shift and enter your starting cash drawer float to begin sales.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setReadOnlyMode(true)}
              className="text-xs font-semibold text-gray-500 hover:text-gray-800 underline self-start sm:self-center cursor-pointer"
            >
              Skip to Read-Only Mode →
            </button>
          </div>

          {/* Quick Start Shift Form on First Page */}
          <form onSubmit={handleStartShift} className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-gray-50/80 p-3.5 rounded-2xl border border-gray-100">
            <div>
              <label className="block text-[11px] font-bold text-gray-600 mb-1">Select Shift *</label>
              <select
                value={startShiftId}
                onChange={(e) => setStartShiftId(e.target.value)}
                required
                className="w-full bg-white text-gray-900 rounded-xl px-3 py-2 text-xs font-semibold border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">Choose shift...</option>
                {shiftsList.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.start_time?.slice(0, 5)} - {s.end_time?.slice(0, 5)})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-600 mb-1">Opening Cash Float (₹) *</label>
              <input
                type="number"
                step="any"
                min="0"
                value={startOpeningCash}
                onChange={(e) => setStartOpeningCash(e.target.value)}
                placeholder="e.g. 500"
                required
                className="w-full bg-white text-gray-900 rounded-xl px-3 py-2 text-xs font-semibold border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                disabled={openingShiftLoading}
                className="w-full py-2 px-4 rounded-xl bg-green-600 hover:bg-green-700 active:bg-green-800 text-white font-bold text-xs transition shadow-xs flex items-center justify-center gap-1.5 min-h-[36px] cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{openingShiftLoading ? 'Opening Shift...' : 'Start Shift & Open Counter'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Read Only Mode Banner if Skipped */}
      {!currentShift && readOnlyMode && (
        <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs animate-in fade-in duration-150">
          <div className="flex items-center gap-2.5">
            <Eye className="w-4 h-4 text-amber-700 shrink-0" />
            <p className="text-amber-900 font-semibold">
              <span className="font-bold">Read-Only Mode:</span> Browsing inventory and bills without an active shift.
            </p>
          </div>
          <button
            onClick={() => setReadOnlyMode(false)}
            className="px-3.5 py-1.5 bg-green-700 hover:bg-green-800 text-white font-bold rounded-xl text-xs transition shadow-2xs self-start sm:self-auto"
          >
            Start Shift & Open Counter
          </button>
        </div>
      )}

      {/* Metrics Row: Sales & Cash Status */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
        {/* Total Sales */}
        <div className="bg-white rounded-2xl border border-gray-100 p-3 sm:p-4 shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] sm:text-xs font-medium text-gray-500 truncate">Total Sales</span>
            <Receipt className="w-4 h-4 text-green-600 shrink-0" />
          </div>
          <p className="text-lg sm:text-xl font-black text-green-700 truncate">{formatCurrency(totalSales)}</p>
          <p className="text-[10px] sm:text-[11px] text-gray-400 mt-0.5 truncate">{salesCount} bill{salesCount !== 1 ? 's' : ''}</p>
        </div>

        {/* Cash Collected */}
        <div className="bg-white rounded-2xl border border-gray-100 p-3 sm:p-4 shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] sm:text-xs font-medium text-gray-500 truncate">Cash</span>
            <DollarSign className="w-4 h-4 text-gray-400 shrink-0" />
          </div>
          <p className="text-lg sm:text-xl font-black text-gray-900 truncate">{formatCurrency(cashSales)}</p>
          <p className="text-[10px] sm:text-[11px] text-gray-400 mt-0.5">Cash bills</p>
        </div>

        {/* UPI Payments */}
        <div className="bg-white rounded-2xl border border-gray-100 p-3 sm:p-4 shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] sm:text-xs font-medium text-gray-500 truncate">Online UPI</span>
            <Smartphone className="w-4 h-4 text-blue-600 shrink-0" />
          </div>
          <p className="text-lg sm:text-xl font-black text-blue-700 truncate">{formatCurrency(upiSales)}</p>
          <p className="text-[10px] sm:text-[11px] text-gray-400 mt-0.5">QR transfers</p>
        </div>

        {/* Available Cash in Drawer */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 sm:p-4 shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] sm:text-xs font-bold text-emerald-800 truncate">Drawer Cash</span>
            <DollarSign className="w-4 h-4 text-emerald-700 shrink-0" />
          </div>
          <p className="text-lg sm:text-xl font-black text-emerald-900 truncate">{formatCurrency(expectedCash)}</p>
          <p className="text-[10px] sm:text-[11px] text-emerald-700 mt-0.5 truncate">Float + Cash</p>
        </div>
      </div>

      {/* Main Grid: Stock in Shift & Recent Bills */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Stock in Shift */}
        <div className="lg:col-span-2 space-y-3">
          <div className="bg-white rounded-3xl border border-gray-100 p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
              <div>
                <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <Boxes className="w-4 h-4 text-green-700" />
                  Parlour Stock in Shift
                </h2>
                <p className="text-xs text-gray-400">Available units ready for selling</p>
              </div>

              {/* Stock Filter Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
                {['ALL', 'Milk', 'Curd', 'LOW'].map(c => (
                  <button
                    key={c}
                    onClick={() => setStockCategory(c)}
                    className={`px-3 py-1 rounded-xl font-semibold transition-colors ${
                      stockCategory === c
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {c === 'LOW' ? `Low Stock (${lowStockCount})` : c}
                  </button>
                ))}
              </div>
            </div>

            {loadingProducts ? (
              <PageLoader />
            ) : filteredProducts.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">No stock items found</p>
            ) : (
              <div className="space-y-2 max-h-[440px] overflow-y-auto pr-1">
                {filteredProducts.map(p => {
                  const stock = Number(p.stock_quantity || 0)
                  const isLow = p.is_low_stock && stock > 0
                  const isOut = stock <= 0

                  return (
                    <div
                      key={p.id}
                      className="p-3 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-between gap-3 text-xs hover:border-green-200 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-gray-900 text-sm truncate">{p.name}</p>
                          {p.pack_size && (
                            <span className="text-[10px] font-semibold text-green-700 bg-green-100 px-1.5 py-0.2 rounded">
                              {p.pack_size}
                            </span>
                          )}
                        </div>
                        <p className="text-gray-400 mt-0.5">
                          {p.category_name || 'Dairy'} · MRP: {formatCurrency(p.default_price)}
                        </p>
                      </div>

                      <div className="text-right">
                        <span className={`text-sm font-bold block ${
                          isOut ? 'text-red-600' : isLow ? 'text-amber-700' : 'text-gray-900'
                        }`}>
                          {stock} <span className="text-[10px] font-normal text-gray-400">{p.unit}</span>
                        </span>
                        {isOut ? (
                          <span className="text-[10px] font-bold text-red-500">Out of Stock</span>
                        ) : isLow ? (
                          <span className="text-[10px] font-bold text-amber-600">Low Stock</span>
                        ) : (
                          <span className="text-[10px] text-green-600 font-semibold">Available</span>
                        )}
                      </div>

                      <button
                        onClick={() => setAdjustingProduct(p)}
                        title="Quick Stock Adjustment"
                        className="p-1.5 rounded-lg bg-white border border-gray-200 hover:bg-green-50 hover:text-green-700 text-gray-500 transition-colors"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: Recent Bills Today */}
        <div className="space-y-3">
          <div className="bg-white rounded-3xl border border-gray-100 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-blue-600" />
                Recent Bills Today
              </h2>
              <Link to="/sales" className="text-xs text-green-600 font-bold hover:underline">
                View all
              </Link>
            </div>

            {loadingSales ? (
              <PageLoader />
            ) : sales.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-8">No bills generated yet today</p>
            ) : (
              <div className="space-y-2 max-h-[440px] overflow-y-auto pr-1">
                {sales.slice(0, 8).map(s => (
                  <Link
                    key={s.id}
                    to={`/sales/${s.id}`}
                    className="p-3 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-between text-xs hover:bg-gray-100 transition-colors block"
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-gray-900">{s.bill_number}</span>
                        <Badge variant={s.payment_method === 'CASH' ? 'success' : s.payment_method === 'UPI' ? 'info' : 'purple'} className="text-[9px]">
                          {s.payment_method}
                        </Badge>
                      </div>
                      <p className="text-gray-500 mt-0.5">{s.customer_name || 'Walk-in'}</p>
                    </div>

                    <div className="text-right">
                      <p className="font-bold text-gray-900">{formatCurrency(s.total)}</p>
                      <p className="text-[10px] text-gray-400">{formatDateTime(s.created_at).split(',')[1]}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Adjust Modal */}
      <QuickAdjustModal
        product={adjustingProduct}
        open={Boolean(adjustingProduct)}
        onClose={() => setAdjustingProduct(null)}
        currentShift={currentShift}
        onUpdated={() => {
          refetchProducts()
        }}
      />
    </div>
  )
}

