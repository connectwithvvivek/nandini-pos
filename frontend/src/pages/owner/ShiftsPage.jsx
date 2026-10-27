import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { shiftsApi, authApi } from '../../api'
import { PageLoader } from '../../components/ui/Spinner'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { Input, Select } from '../../components/ui/Input'
import { Badge } from '../../components/ui/Badge'
import { addToast } from '../../hooks/useToast'
import { formatCurrency, formatDateTime } from '../../lib/utils'
import {
  Clock, Edit2, Plus, Calendar, User, DollarSign,
  Smartphone, CreditCard, Receipt, FileText, CheckCircle2,
  AlertCircle, History, Sliders
} from 'lucide-react'

function ShiftForm({ initial, onSave, onClose }) {
  const [form, setForm] = useState(initial || { name: '', start_time: '', end_time: '', is_active: true })
  const [loading, setLoading] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await onSave(form)
      onClose()
    } catch (err) {
      const errorData = err.response?.data
      let msg = 'Failed to save shift'
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

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Shift Name *"
        value={form.name}
        onChange={e => set('name', e.target.value)}
        required
        placeholder="e.g. Shift 1 - Morning"
      />
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Start Time *"
          type="time"
          value={form.start_time}
          onChange={e => set('start_time', e.target.value)}
          required
        />
        <Input
          label="End Time *"
          type="time"
          value={form.end_time}
          onChange={e => set('end_time', e.target.value)}
          required
        />
      </div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="shift_active"
          checked={form.is_active}
          onChange={e => set('is_active', e.target.checked)}
          className="w-4 h-4 accent-green-600"
        />
        <label htmlFor="shift_active" className="text-sm text-gray-700">Active Shift Schedule</label>
      </div>
      <div className="flex gap-3 pt-2">
        <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" className="flex-1" disabled={loading}>
          {loading ? 'Saving...' : 'Save Shift'}
        </Button>
      </div>
    </form>
  )
}

export default function ShiftsPage() {
  const [activeTab, setActiveTab] = useState('history') // 'history' | 'templates'
  const [filterDate, setFilterDate] = useState('')
  const [filterEmployee, setFilterEmployee] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [editShift, setEditShift] = useState(null)
  const qc = useQueryClient()

  // Shift templates
  const { data: shiftsData, isLoading: loadingTemplates } = useQuery({
    queryKey: ['shifts'],
    queryFn: () => shiftsApi.list().then(r => r.data),
  })
  const shifts = Array.isArray(shiftsData) ? shiftsData : (shiftsData?.results || [])

  // Employees for filtering
  const { data: empsData } = useQuery({
    queryKey: ['employees'],
    queryFn: () => authApi.employees().then(r => r.data),
  })
  const employees = Array.isArray(empsData) ? empsData : (empsData?.results || [])

  // Shift audit log / history
  const { data: empShiftsData, isLoading: loadingHistory } = useQuery({
    queryKey: ['employee-shifts-history', filterDate, filterEmployee],
    queryFn: () => {
      const params = {}
      if (filterDate) params.date = filterDate
      if (filterEmployee) params.employee = filterEmployee
      return shiftsApi.employeeShifts(params).then(r => r.data)
    },
  })
  const empShifts = Array.isArray(empShiftsData) ? empShiftsData : (empShiftsData?.results || [])

  const createMutation = useMutation({
    mutationFn: (data) => shiftsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries(['shifts'])
      addToast('Shift created')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => shiftsApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries(['shifts'])
      addToast('Shift updated')
    },
  })

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-4 md:px-6 py-4 md:py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Shift Management & Reconciliation</h1>
          <p className="text-sm text-gray-500">Track cashier shifts, collected payments, and manage parlour schedules</p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-2xl self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'history'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <History className="w-4 h-4" /> Shift History & Cash Reconcile
          </button>
          <button
            onClick={() => setActiveTab('templates')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'templates'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Sliders className="w-4 h-4" /> Shift Schedules
          </button>
        </div>
      </div>

      {activeTab === 'history' ? (
        /* Shift History Tab */
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <Calendar className="w-4 h-4 text-gray-400" />
              <input
                type="date"
                value={filterDate}
                onChange={e => setFilterDate(e.target.value)}
                className="w-full text-xs py-2 px-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <User className="w-4 h-4 text-gray-400" />
              <select
                value={filterEmployee}
                onChange={e => setFilterEmployee(e.target.value)}
                className="w-full text-xs py-2 px-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">All Cashiers / Employees</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.full_name} (@{emp.username})</option>
                ))}
              </select>
            </div>

            {(filterDate || filterEmployee) && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => { setFilterDate(''); setFilterEmployee('') }}
                className="text-xs"
              >
                Clear Filters
              </Button>
            )}
          </div>

          {/* History List */}
          {loadingHistory ? (
            <PageLoader />
          ) : empShifts.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-400 space-y-2">
              <Clock className="w-12 h-12 mx-auto opacity-30" />
              <p className="text-sm font-semibold text-gray-700">No shift records found</p>
              <p className="text-xs text-gray-400">
                {filterDate || filterEmployee ? 'Try clearing your filters' : 'Cashier shifts will appear here once opened and closed'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {empShifts.map(es => {
                const isShort = es.cash_difference !== null && es.cash_difference < 0
                const isOver = es.cash_difference !== null && es.cash_difference > 0
                const isMatch = es.cash_difference === 0

                return (
                  <div
                    key={es.id}
                    className="bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow p-5 space-y-4"
                  >
                    {/* Top Row: Shift Name, Date, Cashier, Status */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-50 pb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                          es.status === 'OPEN' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                        }`}>
                          <Clock className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-base font-bold text-gray-900">{es.shift_name}</h3>
                            <Badge variant={es.status === 'OPEN' ? 'success' : 'default'}>
                              {es.status}
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">
                            Cashier: <strong className="text-gray-800">{es.employee_name}</strong> · Date: {es.date}
                          </p>
                        </div>
                      </div>

                      <div className="text-right text-xs text-gray-500">
                        <p>Opened: {formatDateTime(es.opened_at)}</p>
                        {es.closed_at && <p>Closed: {formatDateTime(es.closed_at)}</p>}
                      </div>
                    </div>

                    {/* Breakdown of Collected Payments */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gray-50/70 p-3.5 rounded-2xl text-xs">
                      <div>
                        <span className="text-gray-500 flex items-center gap-1 mb-0.5">
                          <DollarSign className="w-3.5 h-3.5 text-green-600" /> Cash Sales
                        </span>
                        <p className="text-sm font-bold text-gray-900">{formatCurrency(es.cash_sales || 0)}</p>
                      </div>

                      <div>
                        <span className="text-gray-500 flex items-center gap-1 mb-0.5">
                          <Smartphone className="w-3.5 h-3.5 text-blue-600" /> Online / UPI
                        </span>
                        <p className="text-sm font-bold text-gray-900">{formatCurrency(es.online_sales || es.upi_sales || 0)}</p>
                      </div>

                      <div>
                        <span className="text-gray-500 flex items-center gap-1 mb-0.5">
                          <CreditCard className="w-3.5 h-3.5 text-amber-600" /> Credit Given
                        </span>
                        <p className="text-sm font-bold text-amber-900">{formatCurrency(es.credit_sales || 0)}</p>
                      </div>

                      <div>
                        <span className="text-gray-500 flex items-center gap-1 mb-0.5">
                          <Receipt className="w-3.5 h-3.5 text-purple-600" /> Total Sales ({es.sales_count || 0} bills)
                        </span>
                        <p className="text-sm font-bold text-green-700">{formatCurrency(es.total_sales || 0)}</p>
                      </div>
                    </div>

                    {/* Cash Drawer Reconciliation Row */}
                    <div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-1">
                      <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
                        <span>Opening: <strong>{formatCurrency(es.opening_cash)}</strong></span>
                        <span>Cash Sales: <strong>+{formatCurrency(es.cash_sales || 0)}</strong></span>
                        <span>Credit Settled: <strong>+{formatCurrency(es.cash_credit_collected || 0)}</strong></span>
                        <span className="text-green-800 font-bold">Expected: <strong>{formatCurrency(es.expected_cash || 0)}</strong></span>
                        {es.closing_cash !== null && (
                          <span>Closing: <strong>{formatCurrency(es.closing_cash)}</strong></span>
                        )}
                      </div>

                      {es.closing_cash !== null && (
                        <div>
                          {isMatch && (
                            <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-green-100 text-green-800">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Exact Cash Match
                            </span>
                          )}
                          {isOver && (
                            <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-blue-100 text-blue-800">
                              Cash Surplus: +{formatCurrency(es.cash_difference)}
                            </span>
                          )}
                          {isShort && (
                            <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-red-100 text-red-800">
                              Cash Shortage: {formatCurrency(es.cash_difference)}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {es.notes && (
                      <p className="text-xs text-gray-600 bg-amber-50/50 p-2.5 rounded-xl border border-amber-100/50">
                        <strong>Handover Note:</strong> {es.notes}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      ) : (
        /* Shift Schedules / Templates Tab */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">Configure master shift hours for your parlour</p>
            <Button size="sm" onClick={() => setShowAdd(true)}>
              <Plus className="w-4 h-4" /> Add Shift Schedule
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {shifts.map(s => (
              <div
                key={s.id}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center flex-shrink-0 text-green-700 font-bold">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">{s.name}</p>
                    <p className="text-xs text-gray-500 font-mono mt-0.5">{s.start_time} – {s.end_time}</p>
                    {!s.is_active && <span className="text-[10px] text-red-500 font-semibold">Inactive</span>}
                  </div>
                </div>
                <Button size="sm" variant="secondary" onClick={() => setEditShift(s)}>
                  <Edit2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add / Edit Modals */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Shift Schedule">
        <ShiftForm onSave={(data) => createMutation.mutateAsync(data)} onClose={() => setShowAdd(false)} />
      </Modal>

      <Modal open={!!editShift} onClose={() => setEditShift(null)} title="Edit Shift Schedule">
        {editShift && (
          <ShiftForm
            initial={editShift}
            onSave={(data) => updateMutation.mutateAsync({ id: editShift.id, data })}
            onClose={() => setEditShift(null)}
          />
        )}
      </Modal>
    </div>
  )
}
