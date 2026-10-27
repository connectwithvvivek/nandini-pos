import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { salesApi, shiftsApi } from '../../api'
import { formatCurrency, formatDate } from '../../lib/utils'
import {
  ArrowLeft, CheckCircle, Minus, Plus, ShoppingCart, Receipt,
  ArrowRight, Banknote, QrCode, CreditCard, Trash2, Clock, AlertTriangle, AlertCircle
} from '../../components/ui/icons'
import { addToast } from '../../hooks/useToast'
import { Badge } from '../../components/ui/Badge'

export default function BillPage() {
  const { state } = useLocation()
  const navigate = useNavigate()
  const { customer, cartItems: initialItems } = state || {}

  const [items, setItems] = useState(initialItems || [])
  const [paymentMethod, setPaymentMethod] = useState('CASH')
  const [loading, setLoading] = useState(false)
  const [completedSale, setCompletedSale] = useState(null)
  const [selectedShiftId, setSelectedShiftId] = useState('')

  // Query active user employee shift
  const { data: currentShift, refetch: refetchShift } = useQuery({
    queryKey: ['current-shift'],
    queryFn: () => shiftsApi.current().then(r => r.data).catch(() => null),
  })

  // Query store shifts list as fallback
  const { data: allShifts = [] } = useQuery({
    queryKey: ['shifts-list'],
    queryFn: () => shiftsApi.list().then(r => r.data?.results || r.data || []).catch(() => []),
  })

  // Auto-select fallback shift if needed
  useEffect(() => {
    if (!selectedShiftId && allShifts.length > 0) {
      setSelectedShiftId(String(allShifts[0].id))
    }
  }, [allShifts, selectedShiftId])

  // Redirect if navigated directly without customer or items (and sale not completed)
  useEffect(() => {
    if (!completedSale && (!customer || !items || items.length === 0)) {
      navigate('/pos', { replace: true })
    }
  }, [completedSale, customer, items, navigate])

  const updateQty = (productId, delta) => {
    setItems(prev => prev
      .map(item => item.product.id === productId
        ? { ...item, quantity: Math.max(0, item.quantity + delta) }
        : item
      )
      .filter(item => item.quantity > 0)
    )
  }

  const updateQtyExact = (productId, val) => {
    const parsed = parseInt(val, 10)
    if (isNaN(parsed) || parsed < 0) return
    if (parsed === 0) {
      setItems(prev => prev.filter(item => item.product.id !== productId))
    } else {
      setItems(prev => prev.map(item => {
        if (item.product.id === productId) {
          const max = item.product.stock_quantity ?? 9999
          return { ...item, quantity: Math.min(parsed, max) }
        }
        return item
      }))
    }
  }

  const subtotal = items.reduce((sum, item) => sum + item.quantity * Number(item.product.effective_price), 0)
  const totalItemCount = items.reduce((sum, item) => sum + item.quantity, 0)

  const handleCompleteSale = async () => {
    setLoading(true)
    try {
      let shiftId = currentShift?.shift
      let employeeShiftId = currentShift?.id

      // If no active shift is currently opened, auto-activate/open the selected shift
      if (!shiftId) {
        const targetShiftId = Number(selectedShiftId) || allShifts[0]?.id
        if (targetShiftId) {
          shiftId = targetShiftId
          try {
            const openRes = await shiftsApi.open({ shift: targetShiftId, opening_cash: 0 })
            employeeShiftId = openRes.data?.id
            refetchShift()
          } catch (e) {
            // Already open or handled by backend fallback
          }
        }
      }

      const payload = {
        customer: customer.id,
        shift: shiftId || undefined,
        employee_shift: employeeShiftId || undefined,
        payment_method: paymentMethod,
        items: items.map(item => ({
          product: item.product.id,
          quantity: item.quantity,
          unit_price: item.product.effective_price,
        })),
      }

      const { data } = await salesApi.create(payload)
      setCompletedSale(data)
      addToast('Sale completed successfully!')
    } catch (err) {
      const errorData = err.response?.data
      let msg = 'Failed to complete sale.'
      if (typeof errorData === 'string') msg = errorData
      else if (errorData?.detail) msg = errorData.detail
      else if (errorData && typeof errorData === 'object') {
        msg = Object.entries(errorData).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(' ') : v}`).join(' | ')
      }
      addToast(msg, 'error')
    } finally {
      setLoading(false)
    }
  }

  // ==========================================
  // SUCCESS SCREEN (After completing sale)
  // ==========================================
  if (completedSale) {
    const saleItems = completedSale.items || items || []
    const customerName = completedSale.customer_name || customer?.name || 'Walk-in Customer'
    const billNumber = completedSale.bill_number || 'N/A'
    const finalShiftName = completedSale.shift_name || currentShift?.shift_name || 'Active Shift'
    const discountVal = Number(completedSale.discount || 0)
    const finalTotal = completedSale.total != null ? Number(completedSale.total) : subtotal

    return (
      <div className="max-w-lg mx-auto px-3 sm:px-4 py-6 text-center space-y-5 animate-in fade-in duration-200">
        <div className="w-16 h-16 bg-emerald-100 rounded-3xl flex items-center justify-center mx-auto text-emerald-700 shadow-inner">
          <CheckCircle className="w-9 h-9" />
        </div>

        <div>
          <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">Sale Completed!</h2>
          <p className="text-xs text-gray-500 mt-0.5">Transaction recorded and inventory adjusted successfully</p>
        </div>

        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-4 sm:p-5 text-left space-y-3.5">
          {/* Bill summary row */}
          <div className="flex justify-between items-center text-xs pb-2.5 border-b border-gray-100">
            <div>
              <span className="text-gray-400 text-[10px] uppercase font-bold block">Bill Number</span>
              <span className="font-bold text-gray-900 text-sm font-mono">{billNumber}</span>
            </div>
            <Badge variant={completedSale.payment_method === 'CREDIT' ? 'warning' : completedSale.payment_method === 'ONLINE' ? 'purple' : 'success'}>
              {completedSale.payment_method === 'CREDIT' ? 'CREDIT · PENDING' : `${completedSale.payment_method || 'CASH'} · PAID`}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-gray-400 text-[10px] uppercase font-bold block">Customer</span>
              <span className="font-semibold text-gray-800">{customerName}</span>
            </div>
            <div className="text-right">
              <span className="text-gray-400 text-[10px] uppercase font-bold block">Shift</span>
              <span className="text-gray-700">{finalShiftName}</span>
            </div>
          </div>

          {/* Items Purchased in this Order */}
          {saleItems.length > 0 && (
            <div className="pt-2 border-t border-gray-100 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                <span>Items Ordered ({saleItems.length})</span>
                <span>Amount</span>
              </div>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {saleItems.map((item, idx) => (
                  <div key={item.id || idx} className="flex items-center justify-between py-1 px-2 rounded-lg bg-gray-50/70 text-xs">
                    <div className="min-w-0 pr-2">
                      <p className="font-bold text-gray-900 truncate">{item.product_name || item.product?.name}</p>
                      <p className="text-[10px] text-gray-400">
                        {item.quantity} × {formatCurrency(item.unit_price || item.product?.effective_price)} {item.product_pack_size ? `· ${item.product_pack_size}` : ''}
                      </p>
                    </div>
                    <span className="font-bold text-gray-800 shrink-0">
                      {formatCurrency(item.line_total || (Number(item.quantity) * Number(item.unit_price || item.product?.effective_price || 0)))}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Totals */}
          <div className="pt-3 border-t border-gray-100 space-y-1">
            {discountVal > 0 && (
              <div className="flex justify-between text-xs text-emerald-700">
                <span>Discount applied</span>
                <span>-{formatCurrency(discountVal)}</span>
              </div>
            )}
            <div className="flex justify-between items-center text-base font-bold">
              <span className="text-gray-900">{completedSale.payment_method === 'CREDIT' ? 'Due Amount' : 'Total Amount Paid'}</span>
              <span className={`text-xl font-black ${completedSale.payment_method === 'CREDIT' ? 'text-amber-700' : 'text-emerald-700'}`}>
                {formatCurrency(finalTotal)}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-2.5">
          <button
            type="button"
            onClick={() => navigate('/pos')}
            className="flex-1 bg-green-700 hover:bg-green-800 active:bg-green-900 text-white font-bold py-3.5 px-4 rounded-2xl transition-all shadow-md active:scale-95 text-sm flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>+ Start New Order</span>
          </button>
          <button
            type="button"
            onClick={() => navigate(`/sales/${completedSale.id}`)}
            className="flex-1 bg-white border border-gray-200 hover:bg-gray-50 active:bg-gray-100 text-gray-700 font-bold py-3.5 px-4 rounded-2xl transition-all text-sm flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Receipt className="w-4 h-4 text-gray-500" />
            <span>Print Receipt</span>
          </button>
        </div>
      </div>
    )
  }

  // Fallback while redirecting if empty
  if (!customer || !items || items.length === 0) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-3">
        <p className="text-sm text-gray-500 font-medium">Redirecting to POS catalog...</p>
      </div>
    )
  }

  // ==========================================
  // BILL REVIEW & CHECKOUT SCREEN
  // ==========================================
  return (
    <div className="max-w-xl mx-auto px-3 sm:px-4 py-4 md:py-6 space-y-4">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-3 bg-white rounded-2xl border border-gray-100 p-3 sm:p-4 shadow-xs">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl hover:bg-gray-100 transition-colors text-gray-600 shrink-0 cursor-pointer"
            title="Back to Catalog"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-bold text-gray-900 leading-tight truncate">Review & Complete Sale</h1>
            <p className="text-xs text-gray-400 mt-0.5">Verify quantities, payment method and finalize bill</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => navigate('/pos')}
          className="text-xs text-gray-500 hover:text-red-600 font-semibold shrink-0 cursor-pointer"
        >
          Cancel
        </button>
      </div>

      {/* Bill Content Box */}
      <div className="space-y-4 pb-28 md:pb-6">
        {/* Customer & Shift Info Card */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-xs space-y-2 text-xs">
          <div className="flex justify-between items-center">
            <span className="text-gray-500">Customer:</span>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-gray-900 text-sm">{customer.name}</span>
              <span className="text-[10px] bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded font-semibold">
                {customer.customer_type}
              </span>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-500">Code / Phone:</span>
            <span className="text-gray-700">{customer.customer_code} {customer.phone && `· ${customer.phone}`}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-500">Billing Date:</span>
            <span className="text-gray-700">{formatDate(new Date().toISOString())}</span>
          </div>
          {currentShift ? (
            <div className="flex justify-between items-center pt-1 border-t border-gray-50">
              <span className="text-gray-500">Counter Shift:</span>
              <span className="font-semibold text-green-700">{currentShift.shift_name}</span>
            </div>
          ) : allShifts.length > 0 ? (
            <div className="pt-2 border-t border-gray-100 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-gray-500 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-amber-500" />
                  Select Shift:
                </span>
                <select
                  value={selectedShiftId}
                  onChange={e => setSelectedShiftId(e.target.value)}
                  className="text-xs font-semibold text-gray-800 bg-amber-50/80 border border-amber-200 rounded-lg px-2 py-1 focus:ring-1 focus:ring-amber-500"
                >
                  {allShifts.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.start_time.slice(0, 5)} - {s.end_time.slice(0, 5)})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : null}
        </div>

        {/* Selected Items */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-gray-100 pb-2">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">
              Billed Items ({totalItemCount})
            </span>
            <span className="text-xs font-semibold text-gray-400">Rate × Qty</span>
          </div>

          <div className="space-y-2.5 divide-y divide-gray-50">
            {items.map(item => (
              <div key={item.product.id} className="pt-2 first:pt-0 flex items-center justify-between gap-3 text-xs">
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 truncate leading-tight">{item.product.name}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    {item.product.pack_size || item.product.unit} · {formatCurrency(item.product.effective_price)} each
                  </p>
                </div>

                <div className="flex items-center gap-1 shrink-0 bg-gray-50 border border-gray-200 rounded-xl p-1">
                  <button
                    type="button"
                    onClick={() => updateQty(item.product.id, -1)}
                    className="w-6 h-6 flex items-center justify-center rounded-lg bg-white text-gray-700 hover:text-red-600 shadow-2xs active:scale-95 cursor-pointer"
                    title="Decrease"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <input
                    type="number"
                    min="1"
                    max={item.product.stock_quantity}
                    value={item.quantity}
                    onChange={(e) => updateQtyExact(item.product.id, e.target.value)}
                    className="w-10 text-center font-bold text-xs text-gray-900 border-0 focus:ring-1 focus:ring-green-500 rounded bg-white py-0.5"
                    title="Type quantity (e.g. 10, 15)"
                  />
                  <button
                    type="button"
                    onClick={() => updateQty(item.product.id, 1)}
                    className="w-6 h-6 flex items-center justify-center rounded-lg bg-white text-gray-700 hover:text-green-700 shadow-2xs active:scale-95 cursor-pointer"
                    title="Increase"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>

                <span className="text-sm font-bold text-gray-900 min-w-[55px] text-right shrink-0">
                  {formatCurrency(item.quantity * Number(item.product.effective_price))}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Payment Method Selector */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-xs space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide">
              Payment Method *
            </label>
            <span className="text-[11px] text-gray-400">Cash · Online · Credit</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[
              {
                id: 'CASH',
                label: 'Cash',
                desc: 'Cash Counter',
                icon: Banknote,
                activeClass: 'bg-emerald-50 border-emerald-500 text-emerald-950 ring-2 ring-emerald-200',
                iconBg: 'bg-emerald-100 text-emerald-700'
              },
              {
                id: 'ONLINE',
                label: 'Online / UPI',
                desc: 'Scan QR / UPI',
                icon: QrCode,
                activeClass: 'bg-blue-50 border-blue-500 text-blue-950 ring-2 ring-blue-200',
                iconBg: 'bg-blue-100 text-blue-700'
              },
              {
                id: 'CREDIT',
                label: 'Credit',
                desc: 'Add to Ledger',
                icon: CreditCard,
                activeClass: 'bg-amber-50 border-amber-500 text-amber-950 ring-2 ring-amber-200',
                iconBg: 'bg-amber-100 text-amber-700'
              },
            ].map(m => {
              const Icon = m.icon
              const isSelected = paymentMethod === m.id
              return (
                <button
                  type="button"
                  key={m.id}
                  onClick={() => setPaymentMethod(m.id)}
                  className={`p-3 rounded-2xl text-left transition-all border flex flex-col justify-between min-h-[82px] active:scale-95 cursor-pointer ${
                    isSelected
                      ? m.activeClass
                      : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`p-1.5 rounded-xl ${isSelected ? m.iconBg : 'bg-white text-gray-500'}`}>
                      <Icon className="w-4 h-4" />
                    </span>
                    {isSelected && (
                      <span className="w-2 h-2 rounded-full bg-current" />
                    )}
                  </div>
                  <div>
                    <span className="text-xs font-bold leading-tight block">{m.label}</span>
                    <span className="text-[10px] opacity-75 mt-0.5 block">{m.desc}</span>
                  </div>
                </button>
              )
            })}
          </div>

          {paymentMethod === 'CREDIT' && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Credit Receivable</span>
              </p>
              <p className="text-[11px] text-amber-800 leading-tight">
                Bill will be recorded as outstanding against <strong>{customer.name}</strong>. Stock will be reduced immediately and added to the customer credit ledger.
              </p>
            </div>
          )}
        </div>

        {/* Bill Total Summary */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-xs space-y-2">
          <div className="flex justify-between text-xs text-gray-500">
            <span>Subtotal ({totalItemCount} items)</span>
            <span className="font-semibold text-gray-800">{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex justify-between items-center text-base sm:text-lg font-black text-gray-900 pt-2 border-t border-gray-100">
            <span>Total Payable</span>
            <span className="text-xl sm:text-2xl font-black text-green-700">{formatCurrency(subtotal)}</span>
          </div>
        </div>

        {/* Complete Sale Button — Desktop Flow Placement */}
        <div className="hidden md:block pt-2">
          <button
            type="button"
            onClick={handleCompleteSale}
            disabled={loading || items.length === 0}
            className="w-full bg-green-600 hover:bg-green-700 active:bg-green-800 text-white font-bold py-4 rounded-2xl transition-all shadow-md active:scale-[0.99] disabled:opacity-50 text-base flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? 'Processing Sale...' : (
              <>
                <span>Complete Sale</span>
                <span>·</span>
                <span className="font-extrabold">{formatCurrency(subtotal)}</span>
                <ArrowRight className="w-5 h-5 ml-1" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Complete Sale Button — Mobile Fixed Sticky Placement (Above mobile bottom nav) */}
      <div className="md:hidden fixed bottom-14 left-0 right-0 p-3 bg-white/95 backdrop-blur-md border-t border-gray-200/90 shadow-xl z-30">
        <button
          type="button"
          onClick={handleCompleteSale}
          disabled={loading || items.length === 0}
          className="w-full bg-green-600 hover:bg-green-700 active:bg-green-800 text-white font-bold py-3.5 px-4 rounded-2xl transition-all shadow-md active:scale-[0.99] disabled:opacity-50 text-sm flex items-center justify-between cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-lg bg-white/20 text-xs font-bold">
              {totalItemCount}
            </span>
            <span className="font-extrabold">{loading ? 'Processing...' : 'Complete Sale'}</span>
          </div>
          <span className="text-base font-black tracking-tight">{formatCurrency(subtotal)} →</span>
        </button>
      </div>
    </div>
  )
}
