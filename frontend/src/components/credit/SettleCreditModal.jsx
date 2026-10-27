import { useState, useEffect } from 'react'
import { Banknote, QrCode } from '../../components/ui/icons'
import { creditApi } from '../../api'
import { formatCurrency, formatDate } from '../../lib/utils'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Input, Textarea } from '../ui/Input'
import { addToast } from '../../hooks/useToast'

export default function SettleCreditModal({ bill, open = true, onClose, onSuccess }) {
  const [amount, setAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('CASH')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (bill) {
      setAmount(String(bill.outstanding_amount || ''))
      setPaymentMethod('CASH')
      setNotes('')
    }
  }, [bill])

  if (!bill) return null

  const outstanding = Number(bill.outstanding_amount || 0)

  const handleSubmit = async (e) => {
    e.preventDefault()
    const payAmount = parseFloat(amount)

    if (isNaN(payAmount) || payAmount <= 0) {
      addToast('Please enter a valid payment amount', 'error')
      return
    }

    if (payAmount > outstanding) {
      addToast(`Payment amount (${formatCurrency(payAmount)}) cannot exceed outstanding amount (${formatCurrency(outstanding)})`, 'error')
      return
    }

    setLoading(true)
    try {
      await creditApi.payBill(bill.id, {
        amount: payAmount,
        payment_method: paymentMethod,
        notes: notes.trim(),
      })
      addToast(`Payment of ${formatCurrency(payAmount)} recorded successfully!`)
      if (onSuccess) onSuccess()
      onClose()
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to record credit settlement.'
      addToast(msg, 'error')
    } finally {
      setLoading(false)
    }
  }

  const remainingAfterPayment = Math.max(0, outstanding - (parseFloat(amount) || 0))

  return (
    <Modal open={open} onClose={onClose} title={`Settle Credit — ${bill.bill_number}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Bill Info Card */}
        <div className="bg-gray-50 border border-gray-100 rounded-2xl p-3.5 space-y-2 text-xs">
          <div className="flex justify-between items-center">
            <span className="text-gray-500">Customer:</span>
            <span className="font-bold text-gray-900">{bill.customer_name} ({bill.customer_code})</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-500">Bill Date:</span>
            <span className="text-gray-700">{formatDate(bill.created_at)}</span>
          </div>
          <div className="flex justify-between items-center pt-1 border-t border-gray-200">
            <span className="text-gray-500">Original Bill:</span>
            <span className="font-semibold text-gray-800">{formatCurrency(bill.original_amount)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-500">Already Paid:</span>
            <span className="font-semibold text-green-700">{formatCurrency(bill.amount_paid)}</span>
          </div>
          <div className="flex justify-between items-center text-sm font-black pt-1 border-t border-gray-200">
            <span className="text-amber-800">Due Outstanding:</span>
            <span className="text-amber-700">{formatCurrency(outstanding)}</span>
          </div>
        </div>

        {/* Amount Input with Quick Preset */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">
              Amount Received (₹) *
            </label>
            <button
              type="button"
              onClick={() => setAmount(String(outstanding))}
              className="text-xs font-bold text-green-700 hover:text-green-800"
            >
              Pay Full ({formatCurrency(outstanding)})
            </button>
          </div>
          <Input
            type="number"
            min="0.01"
            max={outstanding}
            step="0.01"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="Enter payment amount"
            required
            autoFocus
          />
          {parseFloat(amount) > 0 && parseFloat(amount) < outstanding && (
            <p className="text-[11px] text-gray-500 mt-1">
              Partial payment: <strong>{formatCurrency(remainingAfterPayment)}</strong> will remain outstanding.
            </p>
          )}
        </div>

        {/* Payment Method Selector — Only Cash or Online */}
        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">
            Settlement Payment Mode *
          </label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'CASH', label: 'Cash', desc: 'Cash collected at counter', icon: Banknote },
              { id: 'ONLINE', label: 'Online / UPI', desc: 'GPay / PhonePe / QR', icon: QrCode },
            ].map(m => {
              const Icon = m.icon
              const isSelected = paymentMethod === m.id
              return (
                <button
                  type="button"
                  key={m.id}
                  onClick={() => setPaymentMethod(m.id)}
                  className={`p-3 rounded-2xl text-left border transition-all flex items-start gap-2.5 active:scale-95 ${
                    isSelected
                      ? m.id === 'ONLINE'
                        ? 'bg-blue-50 border-blue-500 text-blue-900 ring-2 ring-blue-100 font-bold'
                        : 'bg-emerald-50 border-emerald-600 text-emerald-950 ring-2 ring-emerald-100 font-bold'
                      : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <span className={`p-1.5 rounded-xl shrink-0 mt-0.5 ${
                    isSelected
                      ? m.id === 'ONLINE' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
                      : 'bg-white text-gray-500'
                  }`}>
                    <Icon className="w-4 h-4" />
                  </span>
                  <div>
                    <p className="text-xs font-bold leading-tight">{m.label}</p>
                    <p className="text-[10px] opacity-75 mt-0.5">{m.desc}</p>
                  </div>
                </button>
              )
            })}
          </div>
          <p className="text-[10px] text-gray-400 mt-1">
            Note: Credit settlements can only be received via Cash or Online.
          </p>
        </div>

        {/* Remarks / Reference Notes */}
        <Textarea
          label="Payment Note / Reference (Optional)"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="e.g. Paid in full by customer brother, UPI ref #..."
          rows={2}
        />

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" className="flex-1 font-bold" disabled={loading || !amount || parseFloat(amount) <= 0}>
            {loading ? 'Recording...' : `Receive ${formatCurrency(parseFloat(amount) || 0)}`}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export { SettleCreditModal }

