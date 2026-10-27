import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { inventoryApi, productsApi } from '../../api'
import { formatCurrency, formatDateTime } from '../../lib/utils'
import {
  Package, AlertTriangle, AlertCircle, RefreshCw, History, Plus,
  Minus, Search, Filter, ArrowUpRight, ArrowDownRight, CheckCircle2,
  Boxes, ShieldAlert, Sparkles, ShoppingBag, LayoutGrid, List
} from 'lucide-react'
import { PageLoader } from '../../components/ui/Spinner'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { Input, Select, Textarea } from '../../components/ui/Input'
import { Badge } from '../../components/ui/Badge'
import { addToast } from '../../hooks/useToast'

function AdjustModal({ product, open, onClose }) {
  const [form, setForm] = useState({ transaction_type: 'PURCHASE', quantity: '', reason: '' })
  const [loading, setLoading] = useState(false)
  const qc = useQueryClient()

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.quantity || Number(form.quantity) <= 0) {
      addToast('Please enter a valid quantity', 'error')
      return
    }
    setLoading(true)
    try {
      await inventoryApi.adjust({ product: product.id, ...form, quantity: Number(form.quantity) })
      qc.invalidateQueries(['products-inventory'])
      qc.invalidateQueries(['inventory-history', product.id])
      addToast(`Stock updated for ${product.name}!`)
      onClose()
    } catch (err) {
      addToast(err.response?.data?.detail || 'Failed to update stock', 'error')
    } finally {
      setLoading(false)
    }
  }

  if (!product) return null
  return (
    <Modal open={open} onClose={onClose} title={`Adjust Stock — ${product.name}`}>
      <div className="mb-4 p-4 bg-gray-50 rounded-2xl flex items-center justify-between border border-gray-100">
        <div>
          <p className="text-xs text-gray-500 font-medium">Pack: {product.pack_size || product.unit}</p>
          <p className="text-xs text-gray-400 mt-0.5">Min required: {product.minimum_stock} {product.unit}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500 font-medium">Current Stock</p>
          <p className={`text-2xl font-bold ${product.is_low_stock ? 'text-red-600' : 'text-gray-900'}`}>
            {product.stock_quantity} <span className="text-xs font-normal text-gray-500">{product.unit}</span>
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Select
          label="Adjustment Type *"
          value={form.transaction_type}
          onChange={e => setForm(f => ({ ...f, transaction_type: e.target.value }))}
        >
          <option value="PURCHASE">Stock In / Purchase (Add Stock)</option>
          <option value="DAMAGE">Wastage / Leakage / Damage (Remove)</option>
          <option value="RETURN">Customer Return (Add Stock)</option>
          <option value="ADJUSTMENT">Stock Audit (Set Absolute Stock)</option>
          <option value="CORRECTION">Inventory Count Correction</option>
        </Select>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Quantity ({product.unit}) *
          </label>
          <Input
            type="number"
            value={form.quantity}
            onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))}
            required
            min="0.1"
            step="any"
            placeholder="e.g. 50"
          />
          {/* Quick presets */}
          <div className="flex gap-2 mt-2">
            {[10, 25, 50, 100].map(amt => (
              <button
                type="button"
                key={amt}
                onClick={() => setForm(f => ({ ...f, quantity: String(amt) }))}
                className="px-2.5 py-1 text-xs rounded-lg bg-gray-100 hover:bg-green-100 hover:text-green-800 text-gray-700 font-semibold transition-colors"
              >
                +{amt}
              </button>
            ))}
          </div>
        </div>

        <Textarea
          label="Reason / Remarks (Optional)"
          value={form.reason}
          onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
          placeholder="e.g. Morning delivery crates received, batch #4"
          rows={2}
        />

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" className="flex-1 font-bold" disabled={loading}>
            {loading ? 'Updating...' : 'Save Stock Update'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

function HistoryModal({ product, open, onClose }) {
  const { data = [], isLoading } = useQuery({
    queryKey: ['inventory-history', product?.id],
    queryFn: () => inventoryApi.productHistory(product.id).then(r => r.data),
    enabled: !!product && open,
  })

  const typeConfig = {
    PURCHASE: { label: 'Stock In', color: 'text-green-700 bg-green-50 border-green-200' },
    SALE: { label: 'Sold (POS)', color: 'text-red-700 bg-red-50 border-red-200' },
    DAMAGE: { label: 'Damaged', color: 'text-orange-700 bg-orange-50 border-orange-200' },
    RETURN: { label: 'Returned', color: 'text-blue-700 bg-blue-50 border-blue-200' },
    ADJUSTMENT: { label: 'Audit Set', color: 'text-purple-700 bg-purple-50 border-purple-200' },
    CORRECTION: { label: 'Corrected', color: 'text-gray-700 bg-gray-50 border-gray-200' },
  }

  if (!product) return null
  return (
    <Modal open={open} onClose={onClose} title={`Stock Movement History — ${product.name}`}>
      <div className="space-y-3">
        <p className="text-xs text-gray-500">
          Showing transaction audit trail for {product.pack_size || product.unit}. Current: <strong>{product.stock_quantity} {product.unit}</strong>
        </p>

        {isLoading ? <PageLoader /> : (
          <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
            {data.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">No stock movements recorded yet</p>
            ) : (
              data.map(t => {
                const conf = typeConfig[t.transaction_type] || { label: t.transaction_type, color: 'text-gray-700 bg-gray-50' }
                const isPositive = Number(t.quantity) > 0 && t.transaction_type !== 'SALE' && t.transaction_type !== 'DAMAGE'
                return (
                  <div key={t.id} className="p-3 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-between text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full font-bold border ${conf.color}`}>
                          {conf.label}
                        </span>
                        <span className={`font-bold text-sm ${isPositive ? 'text-green-700' : 'text-gray-900'}`}>
                          {isPositive ? `+${t.quantity}` : `${t.quantity}`} {product.unit}
                        </span>
                      </div>
                      <p className="text-gray-500 mt-1">{t.reason || t.reference_sale || 'Manual entry'}</p>
                      <div className="flex items-center gap-2 text-[11px] text-gray-500 mt-0.5">
                        <span className="font-semibold text-gray-800">{t.created_by_name || 'Staff'}</span>
                        <span>•</span>
                        <span className="text-emerald-700 font-medium">{t.shift_name ? `Shift: ${t.shift_name}` : 'General'}</span>
                        <span>•</span>
                        <span className="text-gray-400">{formatDateTime(t.created_at)}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[11px] text-gray-400 block">Balance</span>
                      <p className="font-mono font-bold text-gray-800 text-sm">{t.new_stock}</p>
                      <span className="text-[10px] text-gray-400">was {t.previous_stock}</span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}

function StockHistoryView() {
  const [typeFilter, setTypeFilter] = useState('ALL')
  const [search, setSearch] = useState('')
  const qc = useQueryClient()

  const { data: rawHistory = [], isLoading, isFetching } = useQuery({
    queryKey: ['owner-inventory-history'],
    queryFn: () => inventoryApi.list().then(r => Array.isArray(r.data) ? r.data : (r.data?.results || [])),
  })

  const history = useMemo(() => {
    return rawHistory.filter(t => {
      const matchType = typeFilter === 'ALL' || t.transaction_type === typeFilter
      const q = search.toLowerCase()
      const matchSearch = !search ||
        (t.product_name && t.product_name.toLowerCase().includes(q)) ||
        (t.reason && t.reason.toLowerCase().includes(q)) ||
        (t.created_by_name && t.created_by_name.toLowerCase().includes(q))
      return matchType && matchSearch
    })
  }, [rawHistory, typeFilter, search])

  const typeConfig = {
    PURCHASE: { label: 'Stock In / Purchase', badge: 'bg-green-50 text-green-700 border-green-200' },
    SALE: { label: 'Sold (POS)', badge: 'bg-red-50 text-red-600 border-red-200' },
    DAMAGE: { label: 'Wastage / Damage', badge: 'bg-orange-50 text-orange-700 border-orange-200' },
    RETURN: { label: 'Customer Return', badge: 'bg-blue-50 text-blue-700 border-blue-200' },
    ADJUSTMENT: { label: 'Stock Audit', badge: 'bg-purple-50 text-purple-700 border-purple-200' },
    CORRECTION: { label: 'Count Correction', badge: 'bg-gray-100 text-gray-700 border-gray-200' },
  }

  const summary = useMemo(() => {
    let stockInTotal = 0
    let wastageTotal = 0
    let auditsCount = 0

    rawHistory.forEach(t => {
      const qty = Number(t.quantity || 0)
      if (t.transaction_type === 'PURCHASE') stockInTotal += Math.abs(qty)
      else if (t.transaction_type === 'DAMAGE') wastageTotal += Math.abs(qty)
      else if (t.transaction_type === 'ADJUSTMENT') auditsCount++
    })

    return { total: rawHistory.length, stockInTotal, wastageTotal, auditsCount }
  }, [rawHistory])

  return (
    <div className="space-y-4">
      {/* Metric Cards for History */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-xs">
          <span className="text-xs font-semibold text-gray-500">Total Movements</span>
          <p className="text-2xl font-black text-gray-900 mt-1">{summary.total}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">Logged adjustments & sales</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-xs">
          <span className="text-xs font-semibold text-green-700">Stock In (Purchases)</span>
          <p className="text-2xl font-black text-green-700 mt-1">+{summary.stockInTotal}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">Units received into stock</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-xs">
          <span className="text-xs font-semibold text-orange-700">Wastage & Damage</span>
          <p className="text-2xl font-black text-orange-700 mt-1">-{summary.wastageTotal}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">Reported leakage / expired</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-xs">
          <span className="text-xs font-semibold text-purple-700">Stock Audits</span>
          <p className="text-2xl font-black text-purple-700 mt-1">{summary.auditsCount}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">Physical count syncs</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-gray-100 p-3 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Filter history by product, cashier/employee name, reason..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          <button
            onClick={() => qc.invalidateQueries(['owner-inventory-history'])}
            className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-xl transition-colors shrink-0"
            title="Refresh history"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Filter chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
          {[
            { id: 'ALL', label: 'All Types' },
            { id: 'PURCHASE', label: 'Stock In / Purchase' },
            { id: 'ADJUSTMENT', label: 'Stock Audit' },
            { id: 'DAMAGE', label: 'Wastage / Damage' },
            { id: 'RETURN', label: 'Customer Return' },
            { id: 'CORRECTION', label: 'Correction' },
            { id: 'SALE', label: 'POS Sales' },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setTypeFilter(f.id)}
              className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition-colors ${
                typeFilter === f.id
                  ? 'bg-gray-900 text-white shadow-xs'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* History Audit Table */}
      {isLoading ? (
        <PageLoader />
      ) : history.length === 0 ? (
        <div className="bg-white rounded-3xl border border-gray-100 p-12 text-center space-y-2">
          <History className="w-12 h-12 text-gray-300 mx-auto" />
          <h3 className="text-base font-bold text-gray-800">No stock adjustment logs found</h3>
          <p className="text-xs text-gray-400">Stock movements and physical inventory audits will appear here.</p>
        </div>
      ) : (
        <div>
          <div className="hidden md:block bg-white rounded-3xl border border-gray-100 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-gray-50 border-b border-gray-100 text-gray-500 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Date & Time</th>
                    <th className="py-3 px-4">Product</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4 text-right">Adjustment</th>
                    <th className="py-3 px-4 text-right">Balance Change</th>
                    <th className="py-3 px-4">Adjusted By & Shift</th>
                    <th className="py-3 px-4">Reason / Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {history.map(item => {
                    const conf = typeConfig[item.transaction_type] || { label: item.transaction_type, badge: 'bg-gray-100 text-gray-700' }
                    const isPositive = Number(item.quantity) > 0 && item.transaction_type !== 'SALE' && item.transaction_type !== 'DAMAGE'
                    return (
                      <tr key={item.id} className="hover:bg-gray-50/70 transition-colors">
                        <td className="py-3 px-4 whitespace-nowrap text-gray-500 font-medium">
                          {formatDateTime(item.created_at)}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="font-bold text-gray-900">{item.product_name}</div>
                          {item.product_pack_size && (
                            <div className="text-[10px] text-gray-400">{item.product_pack_size}</div>
                          )}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full font-bold border text-[11px] ${conf.badge}`}>
                            {conf.label}
                          </span>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap text-right">
                          <span className={`font-mono font-bold text-sm ${isPositive ? 'text-green-700' : 'text-gray-900'}`}>
                            {isPositive ? `+${item.quantity}` : item.quantity} {item.product_unit || 'pcs'}
                          </span>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap text-right font-mono">
                          <span className="text-gray-400">{item.previous_stock}</span>
                          <span className="text-gray-300 mx-1">→</span>
                          <span className="font-bold text-gray-900">{item.new_stock}</span>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="font-bold text-gray-900">{item.created_by_name || 'System / Admin'}</div>
                          <div className="text-[11px] text-emerald-800 font-medium flex items-center gap-1 mt-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            {item.shift_name ? `Shift: ${item.shift_name}` : 'General'}
                          </div>
                        </td>
                        <td className="py-3 px-4 max-w-xs truncate text-gray-500">
                          {item.reason || item.reference_sale || '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Responsive History Cards */}
          <div className="md:hidden space-y-2.5">
            {history.map(item => {
              const conf = typeConfig[item.transaction_type] || { label: item.transaction_type, badge: 'bg-gray-100 text-gray-700' }
              const isPositive = Number(item.quantity) > 0 && item.transaction_type !== 'SALE' && item.transaction_type !== 'DAMAGE'
              return (
                <div key={item.id} className="bg-white rounded-2xl border border-gray-100 p-3.5 shadow-xs space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-bold text-gray-900 text-sm leading-tight">{item.product_name}</div>
                      {item.product_pack_size && (
                        <span className="text-[10px] text-gray-400">{item.product_pack_size}</span>
                      )}
                    </div>
                    <span className={`inline-block px-2.5 py-0.5 rounded-full font-bold border text-[10px] ${conf.badge}`}>
                      {conf.label}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 p-2 bg-gray-50 rounded-xl text-xs">
                    <div>
                      <span className="text-[10px] text-gray-400 block font-semibold">ADJUSTMENT</span>
                      <span className={`font-mono font-bold text-sm ${isPositive ? 'text-green-700' : 'text-gray-900'}`}>
                        {isPositive ? `+${item.quantity}` : item.quantity} {item.product_unit || 'pcs'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 block font-semibold">BALANCE CHANGE</span>
                      <span className="font-mono font-bold text-gray-800 text-xs">
                        {item.previous_stock} → {item.new_stock}
                      </span>
                    </div>
                  </div>

                  <div className="pt-1 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
                    <div>
                      <span className="font-bold text-gray-900 block">{item.created_by_name || 'System / Staff'}</span>
                      <span className="text-emerald-700 font-semibold">{item.shift_name ? `Shift: ${item.shift_name}` : 'General'}</span>
                    </div>
                    <span className="text-[10px] text-gray-400 text-right">{formatDateTime(item.created_at)}</span>
                  </div>
                  {item.reason && (
                    <p className="text-[11px] text-gray-500 bg-gray-50/80 p-2 rounded-lg italic">
                      "{item.reason}"
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default function InventoryPage() {
  const [activeTab, setActiveTab] = useState('stock') // 'stock' | 'history'
  const [adjustProduct, setAdjustProduct] = useState(null)
  const [historyProduct, setHistoryProduct] = useState(null)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('ALL')
  const [stockStatusFilter, setStockStatusFilter] = useState('ALL') // ALL | LOW | OUT
  const [viewMode, setViewMode] = useState('grid') // 'grid' | 'list'

  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['products-inventory'],
    queryFn: () => productsApi.list({ page_size: 200 }).then(r => r.data),
  })

  // Quick adjust mutation for direct +10 / +50 stock buttons
  const quickStockMutation = useMutation({
    mutationFn: ({ productId, quantity }) => inventoryApi.adjust({
      product: productId,
      transaction_type: 'PURCHASE',
      quantity,
      reason: 'Quick stock replenishment'
    }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries(['products-inventory'])
      addToast(`Added +${vars.quantity} units to stock!`)
    },
    onError: () => addToast('Failed to adjust stock', 'error')
  })

  const rawProducts = data?.results || (Array.isArray(data) ? data : [])

  // Filtered products
  const products = useMemo(() => {
    return rawProducts.filter(p => {
      const matchSearch = !search ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.pack_size && p.pack_size.toLowerCase().includes(search.toLowerCase()))
      const matchCategory = categoryFilter === 'ALL' ||
        (p.category_name && p.category_name.toLowerCase().includes(categoryFilter.toLowerCase()))
      const stock = Number(p.stock_quantity)
      let matchStatus = true
      if (stockStatusFilter === 'LOW') matchStatus = p.is_low_stock && stock > 0
      else if (stockStatusFilter === 'OUT') matchStatus = stock <= 0
      return matchSearch && matchCategory && matchStatus
    })
  }, [rawProducts, search, categoryFilter, stockStatusFilter])

  // Statistics
  const stats = useMemo(() => {
    let totalItems = rawProducts.length
    let lowStockCount = 0
    let outOfStockCount = 0
    let totalUnits = 0

    rawProducts.forEach(p => {
      const s = Number(p.stock_quantity || 0)
      totalUnits += s
      if (s <= 0) outOfStockCount++
      else if (p.is_low_stock) lowStockCount++
    })

    return { totalItems, lowStockCount, outOfStockCount, totalUnits }
  }, [rawProducts])

  // Categories list
  const categories = useMemo(() => {
    const set = new Set()
    rawProducts.forEach(p => {
      if (p.category_name) set.add(p.category_name)
    })
    return ['ALL', ...Array.from(set)]
  }, [rawProducts])

  return (
    <div className="max-w-6xl mx-auto space-y-6 px-3 py-4">
      {/* Header & View Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Inventory & Stock Tracking</h1>
          <p className="text-xs sm:text-sm text-gray-500">Monitor milk packets, curds, ghee, sweets & stock replenishment</p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-gray-100 p-1 rounded-2xl self-start sm:self-auto border border-gray-200/60 shadow-2xs">
          <button
            type="button"
            onClick={() => setActiveTab('stock')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              activeTab === 'stock'
                ? 'bg-white text-gray-900 shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Boxes className="w-4 h-4 text-green-600" />
            <span>Current Stock</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              activeTab === 'history'
                ? 'bg-white text-gray-900 shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <History className="w-4 h-4 text-purple-600" />
            <span>Stock Adjustment History</span>
          </button>
        </div>
      </div>

      {activeTab === 'history' ? (
        <StockHistoryView />
      ) : (
        <>
          {/* Metric Cards Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div
          onClick={() => { setStockStatusFilter('ALL'); setCategoryFilter('ALL') }}
          className={`bg-white rounded-2xl border p-4 shadow-xs cursor-pointer transition-all ${
            stockStatusFilter === 'ALL' && categoryFilter === 'ALL' ? 'border-green-500 ring-2 ring-green-100' : 'border-gray-100 hover:border-gray-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500">Tracked Items</span>
            <Boxes className="w-4 h-4 text-gray-400" />
          </div>
          <p className="text-2xl font-black text-gray-900 mt-1">{stats.totalItems}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">{stats.totalUnits} total units in parlour</p>
        </div>

        <div
          onClick={() => setStockStatusFilter('LOW')}
          className={`bg-white rounded-2xl border p-4 shadow-xs cursor-pointer transition-all ${
            stockStatusFilter === 'LOW' ? 'border-amber-500 ring-2 ring-amber-100' : 'border-gray-100 hover:border-gray-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-700">Low Stock Alert</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-amber-700 mt-1">{stats.lowStockCount}</p>
          <p className="text-[11px] text-amber-600 mt-0.5">Below reorder minimum</p>
        </div>

        <div
          onClick={() => setStockStatusFilter('OUT')}
          className={`bg-white rounded-2xl border p-4 shadow-xs cursor-pointer transition-all ${
            stockStatusFilter === 'OUT' ? 'border-red-500 ring-2 ring-red-100' : 'border-gray-100 hover:border-gray-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-red-600">Out of Stock</span>
            <ShieldAlert className="w-4 h-4 text-red-500" />
          </div>
          <p className="text-2xl font-black text-red-600 mt-1">{stats.outOfStockCount}</p>
          <p className="text-[11px] text-red-500 mt-0.5">Replenishment required</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-green-700">Total Parlour Stock</span>
            <CheckCircle2 className="w-4 h-4 text-green-600" />
          </div>
          <p className="text-2xl font-black text-green-700 mt-1">{stats.totalUnits}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">Pcs & packets ready to sell</p>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white rounded-2xl border border-gray-100 p-3 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by product name, 250ml, 500ml, 1L, curd, peda..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          {/* Stock Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: 'ALL', label: 'All Stock' },
              { id: 'LOW', label: `Low (${stats.lowStockCount})` },
              { id: 'OUT', label: `Out (${stats.outOfStockCount})` },
            ].map(pill => (
              <button
                key={pill.id}
                onClick={() => setStockStatusFilter(pill.id)}
                className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
                  stockStatusFilter === pill.id
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {pill.label}
              </button>
            ))}
          </div>

          {/* Grid / List View Toggle */}
          <div className="flex items-center bg-gray-100 p-1 rounded-xl flex-shrink-0">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'grid' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-900'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'list' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-900'
              }`}
              title="List View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Category Horizontal Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-1">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                categoryFilter === cat
                  ? 'bg-green-600 text-white shadow-xs'
                  : 'bg-gray-50 text-gray-600 border border-gray-200/80 hover:bg-gray-100'
              }`}
            >
              {cat === 'ALL' ? 'All Categories' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Products Inventory Display (Grid vs List) */}
      {isLoading ? (
        <PageLoader />
      ) : products.length === 0 ? (
        <div className="bg-white rounded-3xl border border-gray-100 p-12 text-center space-y-2">
          <Boxes className="w-12 h-12 text-gray-300 mx-auto" />
          <h3 className="text-base font-bold text-gray-800">No inventory matches found</h3>
          <p className="text-xs text-gray-400">Try adjusting your search query or active filters.</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {products.map(p => {
            const stock = Number(p.stock_quantity || 0)
            const min = Number(p.minimum_stock || 10)
            const isOut = stock <= 0
            const isLow = p.is_low_stock && !isOut

            return (
              <div
                key={p.id}
                className={`bg-white rounded-2xl border p-4 shadow-xs flex flex-col justify-between transition-all ${
                  isOut
                    ? 'border-red-200 bg-red-50/20'
                    : isLow
                    ? 'border-amber-200 bg-amber-50/10'
                    : 'border-gray-100 hover:border-green-300'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-12 rounded-xl bg-gray-50 border border-gray-100 overflow-hidden flex-shrink-0 flex items-center justify-center">
                        {p.image_url ? (
                          <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                        ) : (
                          <ShoppingBag className="w-5 h-5 text-gray-300" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-gray-900 truncate leading-tight">
                          {p.name}
                        </p>
                        <p className="text-xs text-green-700 font-semibold mt-0.5">
                          {p.pack_size || p.unit}
                        </p>
                        <p className="text-[10px] text-gray-400 truncate">
                          {p.category_name || 'Dairy'} · {formatCurrency(p.default_price)}
                        </p>
                      </div>
                    </div>

                    {isOut ? (
                      <Badge variant="danger">Out of Stock</Badge>
                    ) : isLow ? (
                      <Badge variant="warning">Low Stock</Badge>
                    ) : (
                      <Badge variant="success">In Stock</Badge>
                    )}
                  </div>

                  {/* Stock Quantity Details */}
                  <div className="mt-4 p-3 bg-gray-50/80 rounded-xl space-y-1.5">
                    <div className="flex items-baseline justify-between text-xs">
                      <span className="text-gray-500 font-medium">Available Stock:</span>
                      <span className={`text-lg font-black ${isOut ? 'text-red-600' : isLow ? 'text-amber-700' : 'text-gray-900'}`}>
                        {stock} <span className="text-xs font-normal text-gray-400">{p.unit}</span>
                      </span>
                    </div>

                    <div className="flex justify-between text-[11px] text-gray-500 pt-1 border-t border-gray-100">
                      <span>Reorder threshold:</span>
                      <span className="font-semibold text-gray-700">{min} {p.unit}</span>
                    </div>
                  </div>
                </div>

                {/* Bottom Actions: Quick Stock + Adjust + History */}
                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] font-bold text-gray-400 mr-1">Quick In:</span>
                    <button
                      onClick={() => quickStockMutation.mutate({ productId: p.id, quantity: 10 })}
                      disabled={quickStockMutation.isPending}
                      className="px-2 py-1 text-[11px] font-bold bg-green-50 hover:bg-green-100 text-green-700 rounded-lg transition-colors active:scale-95"
                    >
                      +10
                    </button>
                    <button
                      onClick={() => quickStockMutation.mutate({ productId: p.id, quantity: 50 })}
                      disabled={quickStockMutation.isPending}
                      className="px-2 py-1 text-[11px] font-bold bg-green-50 hover:bg-green-100 text-green-700 rounded-lg transition-colors active:scale-95"
                    >
                      +50
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setAdjustProduct(p)}
                      title="Adjust Stock"
                      className="p-2 rounded-xl bg-gray-100 hover:bg-green-100 text-gray-700 hover:text-green-700 transition-colors"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setHistoryProduct(p)}
                      title="Stock Movement Log"
                      className="p-2 rounded-xl bg-gray-100 hover:bg-blue-100 text-gray-700 hover:text-blue-700 transition-colors"
                    >
                      <History className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* List / Table View */
        <div className="space-y-2">
          {products.map(p => {
            const stock = Number(p.stock_quantity || 0)
            const min = Number(p.minimum_stock || 10)
            const isOut = stock <= 0
            const isLow = p.is_low_stock && !isOut

            return (
              <div
                key={p.id}
                className="bg-white rounded-2xl border border-gray-100 p-3.5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-green-200 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-11 h-11 rounded-xl bg-gray-50 border border-gray-100 overflow-hidden flex-shrink-0 flex items-center justify-center">
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                    ) : (
                      <ShoppingBag className="w-4 h-4 text-gray-300" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-gray-900 truncate leading-tight">{p.name}</p>
                      {p.pack_size && (
                        <span className="text-[10px] font-semibold text-green-700 bg-green-50 px-1.5 py-0.5 rounded">
                          {p.pack_size}
                        </span>
                      )}
                      {isOut ? (
                        <Badge variant="danger" className="text-[10px]">Out</Badge>
                      ) : isLow ? (
                        <Badge variant="warning" className="text-[10px]">Low</Badge>
                      ) : (
                        <Badge variant="success" className="text-[10px]">In Stock</Badge>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {p.category_name || 'Dairy'} · MRP: {formatCurrency(p.default_price)} · Reorder: {min} {p.unit}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4 flex-shrink-0">
                  <div className="text-right">
                    <span className={`text-base font-black ${isOut ? 'text-red-600' : isLow ? 'text-amber-700' : 'text-gray-900'}`}>
                      {stock} <span className="text-xs font-normal text-gray-400">{p.unit}</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => quickStockMutation.mutate({ productId: p.id, quantity: 10 })}
                      disabled={quickStockMutation.isPending}
                      className="px-2.5 py-1 text-xs font-bold bg-green-50 hover:bg-green-100 text-green-700 rounded-lg transition-colors"
                    >
                      +10
                    </button>
                    <button
                      onClick={() => quickStockMutation.mutate({ productId: p.id, quantity: 50 })}
                      disabled={quickStockMutation.isPending}
                      className="px-2.5 py-1 text-xs font-bold bg-green-50 hover:bg-green-100 text-green-700 rounded-lg transition-colors"
                    >
                      +50
                    </button>
                    <button
                      onClick={() => setAdjustProduct(p)}
                      title="Adjust Stock"
                      className="p-1.5 rounded-xl bg-gray-100 hover:bg-green-100 text-gray-700 hover:text-green-700 transition-colors"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setHistoryProduct(p)}
                      title="Movement Log"
                      className="p-1.5 rounded-xl bg-gray-100 hover:bg-blue-100 text-gray-700 hover:text-blue-700 transition-colors"
                    >
                      <History className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
      </>
      )}

      {/* Adjust Stock Modal */}
      <AdjustModal
        product={adjustProduct}
        open={Boolean(adjustProduct)}
        onClose={() => setAdjustProduct(null)}
      />

      {/* Stock History Audit Modal */}
      <HistoryModal
        product={historyProduct}
        open={Boolean(historyProduct)}
        onClose={() => setHistoryProduct(null)}
      />
    </div>
  )
}
