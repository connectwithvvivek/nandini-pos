import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { customersApi, pricingApi, salesApi, productsApi, creditApi } from '../../api'
import { useAuth } from '../../hooks/useAuth'
import { formatCurrency, formatDateTime, formatDate } from '../../lib/utils'
import {
  ArrowLeft, Edit2, Check, X, ShoppingBag, CreditCard, Banknote, Receipt,
  CheckCircle, Clock, ChevronDown, ChevronUp, Phone, MapPin, Plus, User
} from '../../components/ui/icons'
import { PageLoader } from '../../components/ui/Spinner'
import { Badge } from '../../components/ui/Badge'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { Input, Select, Textarea } from '../../components/ui/Input'
import { addToast } from '../../hooks/useToast'
import { SettleCreditModal } from '../../components/credit/SettleCreditModal'

const TYPE_COLORS = {
  REGULAR: 'default', RETAILER: 'info', HOTEL: 'purple',
  RESTAURANT: 'warning', INSTITUTION: 'success', OTHER: 'default',
}

function EditPriceRow({ price, onSave, canEdit = true }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(price.price)

  const handleSave = async () => {
    if (isNaN(parseFloat(val)) || parseFloat(val) <= 0) return
    await onSave(price.product, parseFloat(val))
    setEditing(false)
  }

  return (
    <div className="flex items-center justify-between py-2.5 border-b border-gray-100 last:border-0 text-xs sm:text-sm">
      <div className="min-w-0 pr-2">
        <p className="font-semibold text-gray-900 truncate">{price.product_name}</p>
        <p className="text-xs text-gray-400">Default rate: {formatCurrency(price.default_price)}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {editing ? (
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              value={val}
              onChange={e => setVal(e.target.value)}
              className="w-20 px-2 py-1 text-right text-xs font-bold border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-green-500"
              step="0.01"
              min="0"
            />
            <button onClick={handleSave} className="p-1.5 text-green-700 hover:bg-green-50 rounded-lg">
              <Check className="w-4 h-4" />
            </button>
            <button onClick={() => { setVal(price.price); setEditing(false) }} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg">
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="font-bold text-green-700">{formatCurrency(price.price)}</span>
            {canEdit && (
              <button
                onClick={() => setEditing(true)}
                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"
                title="Edit special price"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function AddPriceModal({ customerId, open, onClose, existingProductIds = [] }) {
  const [productId, setProductId] = useState('')
  const [price, setPrice] = useState('')
  const [loading, setLoading] = useState(false)
  const qc = useQueryClient()

  const { data: products } = useQuery({
    queryKey: ['products-all'],
    queryFn: () => productsApi.list({ is_active: true, page_size: 100 }).then(r => r.data),
  })

  const available = (products?.results || []).filter(p => !existingProductIds.includes(p.id))

  const handleSave = async (e) => {
    e.preventDefault()
    if (!productId || !price) return
    setLoading(true)
    try {
      await pricingApi.updateCustomerPrice(customerId, { product: productId, price })
      qc.invalidateQueries(['customer-prices', customerId])
      addToast('Price added')
      onClose()
    } catch (err) {
      addToast(err.response?.data?.detail || 'Failed to add price', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Add Custom Price">
      <form onSubmit={handleSave} className="space-y-4">
        <Select label="Product" value={productId} onChange={e => setProductId(e.target.value)} required>
          <option value="">Select product...</option>
          {available.map(p => (
            <option key={p.id} value={p.id}>{p.name} ({p.pack_size})</option>
          ))}
        </Select>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Custom Price (₹)</label>
          <input
            type="number" value={price} onChange={e => setPrice(e.target.value)}
            required min="0" step="0.01" placeholder="0.00"
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
          />
        </div>
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button type="submit" className="flex-1" disabled={loading}>{loading ? 'Saving...' : 'Add Price'}</Button>
        </div>
      </form>
    </Modal>
  )
}

export default function CustomerDetailPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const isOwner = user?.role === 'OWNER'
  const [showEdit, setShowEdit] = useState(false)
  const [showAddPrice, setShowAddPrice] = useState(false)
  const [showAllKpis, setShowAllKpis] = useState(false)
  const [showAllBills, setShowAllBills] = useState(false)
  const [showAllPurchases, setShowAllPurchases] = useState(false)
  const [selectedCreditBill, setSelectedCreditBill] = useState(null)
  const qc = useQueryClient()

  const { data: customer, isLoading } = useQuery({
    queryKey: ['customer', id],
    queryFn: () => customersApi.get(id).then(r => r.data),
  })

  const customerPk = customer?.id || id

  const { data: ledgerData, refetch: refetchLedger } = useQuery({
    queryKey: ['customer-credit-ledger', customerPk],
    queryFn: () => creditApi.customerLedger(customerPk).then(r => r.data),
    enabled: !!customer?.id || !isNaN(Number(id)),
  })

  const { data: prices = [] } = useQuery({
    queryKey: ['customer-prices', customerPk],
    queryFn: () => pricingApi.getCustomerPrices(customerPk).then(r => r.data),
    enabled: !!customer?.id || !isNaN(Number(id)),
  })

  const { data: salesData } = useQuery({
    queryKey: ['customer-sales', customerPk],
    queryFn: () => salesApi.customerSales(customerPk, { page_size: 20 }).then(r => r.data),
    enabled: !!customer?.id || !isNaN(Number(id)),
  })

  const updateMutation = useMutation({
    mutationFn: (data) => customersApi.update(customerPk, data),
    onSuccess: () => {
      qc.invalidateQueries(['customer', id])
      qc.invalidateQueries(['customer', customerPk])
      addToast('Customer updated successfully')
    },
  })

  const updatePriceMutation = useMutation({
    mutationFn: ({ product, price }) => pricingApi.updateCustomerPrice(customerPk, { product, price }),
    onSuccess: () => {
      qc.invalidateQueries(['customer-prices', customerPk])
      addToast('Price updated')
    },
  })

  if (isLoading) return <PageLoader />
  if (!customer) return <div className="text-center py-12 text-gray-400">Customer not found</div>

  const outstanding = ledgerData?.outstanding_amount ?? 0
  const totalCredit = ledgerData?.total_credit ?? 0
  const totalPaid = ledgerData?.total_paid ?? 0
  const totalPurchases = ledgerData?.total_purchases ?? 0
  const pendingBillsCount = ledgerData?.pending_bills_count ?? 0
  const creditBills = ledgerData?.bills || []

  // Only show 4 records initially as requested
  const visibleCreditBills = showAllBills ? creditBills : creditBills.slice(0, 4)
  const purchasesList = salesData?.results || []
  const visiblePurchases = showAllPurchases ? purchasesList : purchasesList.slice(0, 4)

  const handleCollectPaymentClick = (bill) => {
    const targetBill = bill || creditBills.find(b => b.outstanding_amount > 0) || creditBills[0]
    if (targetBill) {
      setSelectedCreditBill(targetBill)
    } else {
      addToast('No unsettled credit bill found for this customer.', 'info')
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-5">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-xs">
        <div className="flex items-center gap-3 min-w-0">
          <Link to="/customers" className="p-2.5 rounded-xl hover:bg-gray-100 text-gray-600 transition-colors shrink-0" title="Back to Customers">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight truncate">{customer.name}</h1>
              <Badge variant={TYPE_COLORS[customer.customer_type]}>{customer.customer_type}</Badge>
              {!customer.is_active && <Badge variant="danger">Inactive</Badge>}
            </div>
            <p className="text-xs text-gray-400 mt-0.5 font-mono">{customer.customer_code}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
          {outstanding > 0 && creditBills.length > 0 && (
            <Button
              size="sm"
              onClick={() => handleCollectPaymentClick()}
              className="bg-green-700 hover:bg-green-800 text-white font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-xs cursor-pointer"
              title="Collect Pending Credit Payment"
            >
              <Banknote className="w-4 h-4" />
              <span>Collect Payment</span>
            </Button>
          )}

          {isOwner && (
            <Button size="sm" variant="secondary" onClick={() => setShowEdit(true)} className="px-3 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer">
              <Edit2 className="w-3.5 h-3.5" />
              <span>Edit Details</span>
            </Button>
          )}
        </div>
      </div>

      {/* Customer Contact & Meta Card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xs p-4 sm:p-5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 sm:w-14 sm:h-14 bg-green-50 text-green-700 rounded-2xl flex items-center justify-center text-xl font-black shrink-0 border border-green-100">
            {customer.name[0]?.toUpperCase() || 'C'}
          </div>
          <div className="flex-1 min-w-0 space-y-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-400 block">Phone</span>
                {customer.phone ? (
                  <span className="font-semibold text-gray-800 flex items-center gap-1.5 mt-0.5">
                    <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>{customer.phone}</span>
                  </span>
                ) : (
                  <span className="text-gray-400 italic">No phone recorded</span>
                )}
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-gray-400 block">Address</span>
                {customer.address ? (
                  <span className="text-gray-700 flex items-center gap-1.5 mt-0.5 break-words">
                    <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span>{customer.address}</span>
                  </span>
                ) : (
                  <span className="text-gray-400 italic">No address recorded</span>
                )}
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-gray-400 block">Special Terms / Notes</span>
                <span className="text-gray-500 italic block mt-0.5">{customer.notes || 'No special notes'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Credit & Financial Summary Metrics Header with Mobile Show More Toggle */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Account Metrics</h2>
          <button
            type="button"
            onClick={() => setShowAllKpis(s => !s)}
            className="sm:hidden inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white border border-gray-200 text-xs font-bold text-gray-700 shadow-2xs hover:bg-gray-50 active:scale-95 transition cursor-pointer"
          >
            <span>{showAllKpis ? 'Show Less' : 'Show All'}</span>
            {showAllKpis ? <ChevronUp className="w-3.5 h-3.5 text-gray-600" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-600" />}
          </button>
        </div>

        {/* 5 KPI Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3">
          <div className="bg-white p-3.5 rounded-2xl border border-gray-100 shadow-xs">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Total Purchases</span>
            <span className="text-base font-black text-gray-900 mt-1 block">{formatCurrency(totalPurchases)}</span>
            <span className="text-[10px] text-gray-400">All completed sales</span>
          </div>
          <div className="bg-amber-50/70 p-3.5 rounded-2xl border border-amber-100 shadow-xs">
            <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">Total Credit</span>
            <span className="text-base font-black text-amber-900 mt-1 block">{formatCurrency(totalCredit)}</span>
            <span className="text-[10px] text-amber-600">All credit bills</span>
          </div>
          <div className="bg-emerald-50/70 p-3.5 rounded-2xl border border-emerald-100 shadow-xs">
            <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">Total Paid</span>
            <span className="text-base font-black text-emerald-900 mt-1 block">{formatCurrency(totalPaid)}</span>
            <span className="text-[10px] text-emerald-600">Credit paid back</span>
          </div>
          <div className={`p-3.5 rounded-2xl border shadow-xs ${outstanding > 0 ? 'bg-red-50/70 border-red-100' : 'bg-gray-50 border-gray-100'}`}>
            <span className={`text-[10px] font-bold uppercase tracking-wider block ${outstanding > 0 ? 'text-red-700' : 'text-gray-500'}`}>
              Outstanding Due
            </span>
            <span className={`text-base font-black mt-1 block ${outstanding > 0 ? 'text-red-800' : 'text-gray-900'}`}>
              {formatCurrency(outstanding)}
            </span>
            <span className={`text-[10px] ${outstanding > 0 ? 'text-red-600 font-medium' : 'text-gray-400'}`}>
              {outstanding > 0 ? 'Balance to collect' : 'Fully settled'}
            </span>
          </div>
          <div className={`bg-orange-50/70 p-3.5 rounded-2xl border border-orange-100 shadow-xs col-span-2 sm:col-span-1 ${
            !showAllKpis ? 'hidden sm:block' : 'block'
          }`}>
            <span className="text-[10px] font-bold text-orange-700 uppercase tracking-wider block">Pending Bills</span>
            <span className="text-base font-black text-orange-900 mt-1 block">{pendingBillsCount}</span>
            <span className="text-[10px] text-orange-600">Unsettled credit bills</span>
          </div>
        </div>
      </div>

      {/* Credit Ledger Section (Shows 4 records by default with Show More button) */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xs p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-green-50 text-green-700 rounded-lg">
              <CreditCard className="w-4 h-4" />
            </span>
            <h2 className="text-sm font-bold text-gray-900">Customer Credit Ledger</h2>
          </div>
          <span className="text-xs text-gray-500 font-semibold">{creditBills.length} total bills</span>
        </div>

        {creditBills.length === 0 ? (
          <div className="text-center py-8 text-gray-400 space-y-1">
            <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto" />
            <p className="text-xs font-semibold text-gray-600">No credit history for this customer</p>
          </div>
        ) : (
          <>
            {/* Desktop Ledger Table */}
            <div className="hidden sm:block overflow-x-auto w-full">
              <table className="w-full text-left text-xs min-w-[700px]">
                <thead>
                  <tr className="border-b border-gray-100 text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 px-3">Bill #</th>
                    <th className="py-2.5 px-3">Given By & Shift</th>
                    <th className="py-2.5 px-3 text-right">Original</th>
                    <th className="py-2.5 px-3 text-right">Paid</th>
                    <th className="py-2.5 px-3 text-right">Outstanding</th>
                    <th className="py-2.5 px-3">Collections Audit</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {visibleCreditBills.map((bill) => (
                    <tr key={bill.id} className="hover:bg-gray-50/70 transition">
                      <td className="py-3 px-3 font-mono font-bold text-gray-900 whitespace-nowrap">
                        {bill.bill_number}
                        <div className="text-[10px] text-gray-400 font-normal">{formatDateTime(bill.created_at)}</div>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="font-bold text-gray-900">{bill.employee_name || 'Staff'}</div>
                        <div className="text-[11px] text-emerald-800 font-medium flex items-center gap-1 mt-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          {bill.shift_name ? `Shift: ${bill.shift_name}` : 'General'}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right font-medium text-gray-700">{formatCurrency(bill.original_amount)}</td>
                      <td className="py-3 px-3 text-right font-medium text-emerald-700">{formatCurrency(bill.amount_paid)}</td>
                      <td className="py-3 px-3 text-right font-black text-red-700">
                        {formatCurrency(bill.outstanding_amount)}
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
                          <span className="text-[11px] text-gray-400 italic">No collections yet</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                          bill.status === 'PAID'
                            ? 'bg-emerald-100 text-emerald-800'
                            : bill.status === 'PARTIALLY_PAID'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {bill.status === 'PARTIALLY_PAID' ? 'Partially Paid' : bill.status === 'PAID' ? 'Paid' : 'Pending'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        {bill.outstanding_amount > 0 ? (
                          <button
                            type="button"
                            onClick={() => setSelectedCreditBill(bill)}
                            className="px-3 py-1.5 bg-green-700 hover:bg-green-800 active:bg-green-900 text-white font-bold rounded-xl text-xs shadow-xs transition cursor-pointer"
                          >
                            Settle
                          </button>
                        ) : (
                          <span className="text-[10px] text-emerald-600 font-bold">Settled</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Ledger Cards */}
            <div className="sm:hidden space-y-2.5">
              {visibleCreditBills.map((bill) => (
                <div key={bill.id} className="bg-gray-50/80 border border-gray-200/80 rounded-xl p-3 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-mono text-xs font-bold text-gray-800">{bill.bill_number}</span>
                      <p className="text-[10px] text-gray-400">{formatDateTime(bill.created_at)}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                      bill.status === 'PAID'
                        ? 'bg-emerald-100 text-emerald-800'
                        : bill.status === 'PARTIALLY_PAID'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {bill.status === 'PARTIALLY_PAID' ? 'Partial' : bill.status === 'PAID' ? 'Paid' : 'Pending'}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-1 text-center pt-1 border-t border-gray-100">
                    <div className="bg-white p-1 rounded-lg border border-gray-100">
                      <span className="text-[9px] text-gray-400 block font-semibold">ORIGINAL</span>
                      <span className="text-xs font-bold text-gray-700">{formatCurrency(bill.original_amount)}</span>
                    </div>
                    <div className="bg-white p-1 rounded-lg border border-gray-100">
                      <span className="text-[9px] text-gray-400 block font-semibold">PAID</span>
                      <span className="text-xs font-bold text-emerald-700">{formatCurrency(bill.amount_paid)}</span>
                    </div>
                    <div className="bg-red-50 p-1 rounded-lg border border-red-100">
                      <span className="text-[9px] text-red-600 block font-bold">DUE</span>
                      <span className="text-xs font-black text-red-800">{formatCurrency(bill.outstanding_amount)}</span>
                    </div>
                  </div>

                  {bill.outstanding_amount > 0 && (
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => setSelectedCreditBill(bill)}
                        className="w-full py-2 bg-green-700 hover:bg-green-800 active:bg-green-900 text-white font-bold rounded-xl text-xs shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Banknote className="w-3.5 h-3.5" />
                        <span>Settle / Collect Payment</span>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Show More / Show Less Toggle for Credit Ledger (shows 4 by default) */}
            {creditBills.length > 4 && (
              <div className="pt-2 flex items-center justify-between border-t border-gray-100 text-xs">
                <span className="text-gray-500 font-medium">
                  Showing {visibleCreditBills.length} of {creditBills.length} bills
                </span>
                <button
                  type="button"
                  onClick={() => setShowAllBills(s => !s)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-800 font-bold rounded-xl transition cursor-pointer"
                >
                  <span>{showAllBills ? 'Show Less' : `Show More (${creditBills.length - 4} more)`}</span>
                  {showAllBills ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Bottom Dual Grid: Custom Rates + Recent Purchases */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Custom Prices Card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-xs p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-gray-100">
            <div>
              <h2 className="text-sm font-bold text-gray-900">Custom Negotiated Rates</h2>
              <p className="text-[11px] text-gray-400 mt-0.5">Applied automatically at POS for this customer</p>
            </div>
            {isOwner && (
              <Button size="sm" variant="outline" onClick={() => setShowAddPrice(true)} className="px-3 py-1.5 text-xs font-bold">
                <Plus className="w-3.5 h-3.5" /> Add Rate
              </Button>
            )}
          </div>

          {prices.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-6">No custom prices set. Default store prices apply.</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {prices.map(p => (
                <EditPriceRow
                  key={p.id}
                  price={p}
                  canEdit={isOwner}
                  onSave={(productId, price) => updatePriceMutation.mutateAsync({ product: productId, price })}
                />
              ))}
            </div>
          )}
        </div>

        {/* Recent Purchases Card (4 by default with Show More) */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-xs p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-gray-100">
            <h2 className="text-sm font-bold text-gray-900">Recent Customer Purchases</h2>
            <Link to={`/sales?customer=${customerPk}`} className="text-xs text-green-700 font-bold hover:underline">
              View All Bills →
            </Link>
          </div>

          {purchasesList.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-6">No purchases recorded yet</p>
          ) : (
            <>
              <div className="space-y-1.5">
                {visiblePurchases.map(s => (
                  <Link
                    key={s.id}
                    to={`/sales/${s.id}`}
                    className="flex items-center justify-between py-2 px-2.5 rounded-xl hover:bg-gray-50 border border-transparent hover:border-gray-100 transition cursor-pointer"
                  >
                    <div>
                      <p className="text-xs font-bold text-gray-900">{s.bill_number}</p>
                      <p className="text-[10px] text-gray-400">{formatDateTime(s.created_at)} · {s.shift_name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-black text-gray-900">{formatCurrency(s.total)}</p>
                      <Badge variant={s.status === 'COMPLETED' ? 'success' : 'danger'} className="text-[9px]">
                        {s.status}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>

              {purchasesList.length > 4 && (
                <div className="pt-2 flex items-center justify-between border-t border-gray-100 text-xs">
                  <span className="text-gray-500 font-medium">
                    Showing {visiblePurchases.length} of {purchasesList.length} orders
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowAllPurchases(s => !s)}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-800 font-bold rounded-xl transition cursor-pointer"
                  >
                    <span>{showAllPurchases ? 'Show Less' : `Show More (${purchasesList.length - 4} more)`}</span>
                    {showAllPurchases ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Edit Customer Modal */}
      <Modal open={showEdit} onClose={() => setShowEdit(false)} title="Edit Customer Details">
        <form onSubmit={async (e) => {
          e.preventDefault()
          const fd = new FormData(e.target)
          const data = Object.fromEntries(fd)
          data.is_active = fd.get('is_active') === 'on'
          await updateMutation.mutateAsync(data)
          setShowEdit(false)
        }} className="space-y-4">
          <Input label="Name" name="name" defaultValue={customer.name} required />
          <Input label="Phone" name="phone" defaultValue={customer.phone} />
          <Select label="Type" name="customer_type" defaultValue={customer.customer_type}>
            {['REGULAR','RETAILER','HOTEL','RESTAURANT','INSTITUTION','OTHER'].map(t => (
              <option key={t} value={t}>{t.charAt(0) + t.slice(1).toLowerCase()}</option>
            ))}
          </Select>
          <Textarea label="Address" name="address" defaultValue={customer.address} />
          <Textarea label="Notes" name="notes" defaultValue={customer.notes} />
          <div className="flex items-center gap-2">
            <input type="checkbox" id="edit_active" name="is_active" defaultChecked={customer.is_active} className="w-4 h-4 accent-green-600" />
            <label htmlFor="edit_active" className="text-sm text-gray-700 font-medium">Active Customer</label>
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setShowEdit(false)}>Cancel</Button>
            <Button type="submit" className="flex-1">Save Changes</Button>
          </div>
        </form>
      </Modal>

      <AddPriceModal
        customerId={customerPk}
        open={showAddPrice}
        onClose={() => setShowAddPrice(false)}
        existingProductIds={prices.map(p => p.product)}
      />

      {/* Settle Credit Modal (with explicit open={true} so it ALWAYS appears reliably) */}
      {selectedCreditBill && (
        <SettleCreditModal
          open={true}
          bill={selectedCreditBill}
          onClose={() => setSelectedCreditBill(null)}
          onSuccess={() => {
            setSelectedCreditBill(null)
            refetchLedger()
            qc.invalidateQueries(['customer-credit-ledger', id])
            qc.invalidateQueries(['customer-credit-ledger', customerPk])
            qc.invalidateQueries(['credit-summary'])
          }}
        />
      )}
    </div>
  )
}
