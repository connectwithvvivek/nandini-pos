import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { salesApi } from '../../api'
import { formatCurrency, formatDateTime } from '../../lib/utils'
import {
  ArrowLeft, Printer, XCircle, CheckCircle2, Receipt, FileText,
  User, Clock, Banknote, QrCode, CreditCard, ShoppingBag
} from '../../components/ui/icons'
import { PageLoader } from '../../components/ui/Spinner'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { addToast } from '../../hooks/useToast'
import { useAuth } from '../../hooks/useAuth'

const STATUS_COLORS = { COMPLETED: 'success', CANCELLED: 'danger', REFUNDED: 'warning' }

export default function SaleDetailPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const qc = useQueryClient()

  const storeInfo = (() => {
    try {
      const s = localStorage.getItem('nandini_store_info')
      if (s) return JSON.parse(s)
    } catch {}
    return {
      parlourName: 'NANDINI MILK PARLOUR',
      subBranch: 'Karnataka Milk Federation (KMF)',
      address: 'Shop #12, Commercial Complex, Main Road, Bangalore',
      phone: '+91 98765 43210',
      receiptFooter: 'Goods once sold cannot be returned. Thank you! Visit again!',
    }
  })()

  const { data: sale, isLoading } = useQuery({
    queryKey: ['sale', id],
    queryFn: () => salesApi.get(id).then(r => r.data),
  })

  const cancelMutation = useMutation({
    mutationFn: () => salesApi.cancel(id),
    onSuccess: () => {
      qc.invalidateQueries(['sale', id])
      addToast('Sale cancelled successfully')
    },
    onError: (err) => addToast(err.response?.data?.detail || 'Failed to cancel', 'error'),
  })

  const handlePrint = () => {
    window.print()
  }

  if (isLoading) return <PageLoader />
  if (!sale) return <div className="text-center py-12 text-gray-400">Sale not found</div>

  const totalUnits = sale.items?.reduce((sum, item) => sum + Number(item.quantity || 0), 0) || 0

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-5">
      {/* Action Header (Hidden in Print) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-xs">
        <div className="flex items-center gap-3">
          <Link
            to="/sales"
            className="p-2.5 rounded-xl hover:bg-gray-100 text-gray-600 transition-colors shrink-0"
            title="Back to Sales"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-xl font-black text-gray-900 leading-tight">
                Bill #{sale.bill_number}
              </h1>
              <Badge variant={STATUS_COLORS[sale.status] || 'default'}>
                {sale.status}
              </Badge>
              <Badge variant={sale.payment_method === 'CREDIT' ? 'warning' : sale.payment_method === 'ONLINE' ? 'purple' : 'success'}>
                {sale.payment_method === 'CREDIT' ? `CREDIT · ${sale.credit_status || 'PENDING'}` : `${sale.payment_method} · PAID`}
              </Badge>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              Recorded on {formatDateTime(sale.created_at)} · Counter Shift: {sale.shift_name}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          {/* Print 80mm Receipt */}
          <Button
            size="sm"
            onClick={handlePrint}
            className="bg-gray-900 hover:bg-black text-white text-xs px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-xs cursor-pointer font-bold"
            title="Print 80mm Thermal Slip"
          >
            <Printer className="w-4 h-4" />
            <span>Print 80mm Receipt</span>
          </Button>

          {user?.is_owner !== false && sale.status === 'COMPLETED' && (
            <Button
              size="sm"
              variant="danger"
              onClick={() => {
                if (window.confirm('Are you sure you want to cancel this bill? Stock will be restored.')) {
                  cancelMutation.mutate()
                }
              }}
              className="text-xs px-3.5 py-2.5 rounded-xl cursor-pointer"
            >
              <XCircle className="w-4 h-4" />
              <span>Cancel Bill</span>
            </Button>
          )}
        </div>
      </div>

      {/* Main Grid: Left Details & Right Thermal Slip Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Comprehensive Bill Details (7 Columns) */}
        <div className="lg:col-span-7 space-y-4 print:hidden">
          {/* Customer & Transaction Overview */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-xs p-4 sm:p-5 space-y-3">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-4 h-4 text-emerald-700" />
              <span>Customer & Staff Audit</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="bg-gray-50/70 p-3 rounded-xl border border-gray-100">
                <span className="text-gray-400 text-[10px] uppercase font-bold block">Customer Details</span>
                <Link
                  to={`/customers/${sale.customer_code || sale.customer}`}
                  className="font-bold text-emerald-800 text-sm hover:underline block mt-0.5"
                >
                  {sale.customer_name}
                </Link>
                <span className="text-gray-500 font-mono text-[11px] block mt-0.5">
                  ID: {sale.customer_code || `CUST-${sale.customer}`}
                </span>
              </div>

              <div className="bg-gray-50/70 p-3 rounded-xl border border-gray-100">
                <span className="text-gray-400 text-[10px] uppercase font-bold block">Counter & Shift Audit</span>
                <span className="font-bold text-gray-800 text-sm block mt-0.5">
                  Biller: {sale.employee_name || 'Counter Staff'}
                </span>
                <span className="text-emerald-700 text-xs font-semibold block mt-0.5">
                  Shift: {sale.shift_name || 'General Counter'}
                </span>
              </div>
            </div>
          </div>

          {/* Ordered Products Table */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                <ShoppingBag className="w-4 h-4 text-emerald-700" />
                <span>Billed Items ({sale.items?.length || 0} Products · {totalUnits} Units)</span>
              </h2>
            </div>

            <div className="overflow-x-auto w-full">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-gray-50/70 border-b border-gray-100 text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4">Item & Pack Size</th>
                    <th className="py-3 px-3 text-center">Quantity</th>
                    <th className="py-3 px-3 text-right">Unit Rate</th>
                    <th className="py-3 px-4 text-right">Line Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {sale.items?.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50/70 transition">
                      <td className="py-3 px-4 font-semibold text-gray-900">
                        <div>{item.product_name}</div>
                        {item.product_pack_size && (
                          <span className="text-[10px] font-semibold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                            {item.product_pack_size}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-gray-800">
                        {Number(item.quantity)}
                      </td>
                      <td className="py-3 px-3 text-right text-gray-600 font-medium">
                        {formatCurrency(item.unit_price)}
                      </td>
                      <td className="py-3 px-4 text-right font-black text-gray-900 text-sm">
                        {formatCurrency(item.line_total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Financial Calculation Row */}
            <div className="p-4 bg-gray-50/50 border-t border-gray-100 space-y-1.5 text-xs">
              <div className="flex justify-between text-gray-600">
                <span>Items Subtotal:</span>
                <span className="font-semibold text-gray-900">{formatCurrency(sale.subtotal)}</span>
              </div>
              {Number(sale.discount) > 0 && (
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>Discount Applied:</span>
                  <span>-{formatCurrency(sale.discount)}</span>
                </div>
              )}
              <div className="flex justify-between items-center text-base font-bold pt-2 border-t border-gray-200/80 text-gray-900">
                <span>Net Payable:</span>
                <span className="text-xl font-black text-green-700">{formatCurrency(sale.total)}</span>
              </div>
            </div>
          </div>

          {/* Credit Receivable Details (If Credit Sale) */}
          {sale.payment_method === 'CREDIT' && (
            <div className="bg-amber-50/60 border border-amber-200/80 rounded-2xl p-4 sm:p-5 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-amber-700" />
                  <span>Credit Receivable Ledger Record</span>
                </span>
                <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                  sale.credit_status === 'PAID' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                }`}>
                  {sale.credit_status || 'PENDING'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-white/80 p-2.5 rounded-xl border border-amber-100">
                  <span className="text-[10px] text-gray-400 uppercase font-bold block">Credit Given By</span>
                  <span className="font-bold text-gray-800">
                    {sale.credit_record?.employee_name || sale.employee_name}
                  </span>
                  <span className="text-gray-500 text-[10px] block">
                    {sale.credit_record?.shift_name || sale.shift_name}
                  </span>
                </div>
                <div className="bg-white/80 p-2.5 rounded-xl border border-amber-100 text-right">
                  <span className="text-[10px] text-gray-400 uppercase font-bold block">Current Balance Due</span>
                  <span className="text-base font-black text-red-700 block">
                    {formatCurrency(sale.credit_record?.outstanding_amount ?? sale.credit_outstanding)}
                  </span>
                </div>
              </div>

              {sale.credit_record?.payments && sale.credit_record.payments.length > 0 && (
                <div className="pt-2 border-t border-amber-200/60 space-y-1.5">
                  <span className="font-bold text-amber-950 text-[11px] block">Settlement Payment Collections:</span>
                  {sale.credit_record.payments.map((p, idx) => (
                    <div key={p.id || idx} className="flex justify-between items-center bg-white/80 p-2 rounded-lg border border-amber-100 text-xs">
                      <div>
                        <span className="font-bold text-gray-800">{p.employee_name || 'Staff'}</span>
                        <span className="text-emerald-700 font-semibold ml-1.5">({p.payment_method})</span>
                        <span className="text-gray-400 text-[10px] block">{p.shift_name} · {formatDateTime(p.created_at)}</span>
                      </div>
                      <span className="font-bold text-emerald-700 text-sm">{formatCurrency(p.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Thermal 80mm Slip Live Preview & Print Target (5 Columns) */}
        <div className="lg:col-span-5 flex flex-col items-center">
          <div className="w-full max-w-[340px] receipt-80mm bg-white border border-dashed border-gray-300 rounded-2xl shadow-sm p-4 sm:p-5 font-mono text-xs">
            {/* Store Header */}
            <div className="text-center pb-3 border-b border-dashed border-gray-400 space-y-0.5">
              <h2 className="text-base font-extrabold uppercase tracking-wide text-black">{storeInfo.parlourName}</h2>
              <p className="text-[11px] font-semibold text-gray-700">{storeInfo.subBranch}</p>
              {storeInfo.address && <p className="text-[10px] text-gray-600 leading-tight">{storeInfo.address}</p>}
              {storeInfo.phone && <p className="text-[10px] text-gray-600">Ph: {storeInfo.phone}</p>}
              <p className="text-[11px] font-bold uppercase tracking-wider text-black pt-1">*** RETAIL BILL ***</p>
            </div>

            {/* Receipt Info */}
            <div className="py-2.5 border-b border-dashed border-gray-400 space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span>BILL NO:</span>
                <span className="font-bold">{sale.bill_number}</span>
              </div>
              <div className="flex justify-between">
                <span>DATE/TIME:</span>
                <span>{formatDateTime(sale.created_at)}</span>
              </div>
              <div className="flex justify-between">
                <span>CUSTOMER:</span>
                <span className="font-semibold truncate max-w-[170px]">{sale.customer_name}</span>
              </div>
              {sale.customer_code && (
                <div className="flex justify-between">
                  <span>CUST CODE:</span>
                  <span>{sale.customer_code}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>CASHIER:</span>
                <span>{sale.employee_name || 'Counter'}</span>
              </div>
              {sale.shift_name && (
                <div className="flex justify-between">
                  <span>SHIFT:</span>
                  <span>{sale.shift_name}</span>
                </div>
              )}
            </div>

            {/* Items Header */}
            <div className="py-1.5 border-b border-dashed border-gray-400 font-bold flex justify-between text-[11px]">
              <span className="w-5/12">ITEM / PACK</span>
              <span className="w-2/12 text-center">QTY</span>
              <span className="w-2/12 text-right">RATE</span>
              <span className="w-3/12 text-right">AMT (₹)</span>
            </div>

            {/* Items List */}
            <div className="py-1.5 border-b border-dashed border-gray-400 space-y-1.5 text-[11px]">
              {sale.items?.map(item => (
                <div key={item.id} className="space-y-0.5">
                  <div className="flex justify-between items-baseline font-medium">
                    <span className="w-5/12 truncate font-semibold">{item.product_name}</span>
                    <span className="w-2/12 text-center">{Number(item.quantity)}</span>
                    <span className="w-2/12 text-right">{Number(item.unit_price).toFixed(2)}</span>
                    <span className="w-3/12 text-right font-bold">{Number(item.line_total).toFixed(2)}</span>
                  </div>
                  {item.product_pack_size && (
                    <p className="text-[10px] text-gray-500 pl-0.5">[{item.product_pack_size}]</p>
                  )}
                </div>
              ))}
            </div>

            {/* Summary & Totals */}
            <div className="py-2 border-b border-dashed border-gray-400 space-y-1 text-[11px]">
              <div className="flex justify-between text-gray-600">
                <span>Total Items / Units:</span>
                <span>{sale.items?.length || 0} items ({totalUnits} units)</span>
              </div>
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>{formatCurrency(sale.subtotal)}</span>
              </div>
              {Number(sale.discount) > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>Discount:</span>
                  <span>-{formatCurrency(sale.discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-extrabold pt-1 border-t border-dashed border-gray-400 text-black">
                <span>NET PAYABLE:</span>
                <span>{formatCurrency(sale.total)}</span>
              </div>
              <div className="flex justify-between pt-1">
                <span>Payment Mode:</span>
                <span className="font-bold uppercase">
                  {sale.payment_method === 'CREDIT' ? `CREDIT [${sale.credit_status || 'PENDING'}]` : `${sale.payment_method} [PAID]`}
                </span>
              </div>
              {sale.payment_method === 'CREDIT' && (
                <div className="pt-1.5 border-t border-dashed border-gray-400 space-y-1 text-[10px]">
                  <div className="flex justify-between font-bold text-gray-800">
                    <span>CREDIT GIVEN BY:</span>
                    <span>{sale.credit_record?.employee_name || sale.employee_name} ({sale.credit_record?.shift_name || sale.shift_name})</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>OUTSTANDING DUE:</span>
                    <span className="font-bold text-red-700">{formatCurrency(sale.credit_record?.outstanding_amount ?? sale.credit_outstanding)}</span>
                  </div>
                </div>
              )}
              <div className="flex justify-between">
                <span>Bill Status:</span>
                <span className="font-semibold uppercase">{sale.status}</span>
              </div>
            </div>

            {/* Thermal Receipt Footer */}
            <div className="text-center pt-3 space-y-1 text-[10px] text-gray-600">
              <p className="font-bold text-gray-800">*** THANK YOU FOR VISITING ***</p>
              <p className="leading-tight">{storeInfo.receiptFooter}</p>
              <p className="text-[9px] text-gray-500">Nandini - Purity & Quality Guaranteed</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
