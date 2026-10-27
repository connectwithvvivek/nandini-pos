import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { authApi } from '../../api'
import { PageLoader } from '../../components/ui/Spinner'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { Input, Select } from '../../components/ui/Input'
import { addToast } from '../../hooks/useToast'
import { UserCog, Edit2, Plus } from 'lucide-react'
import { Badge } from '../../components/ui/Badge'

function EmployeeForm({ initial, onSave, onClose }) {
  const [form, setForm] = useState(initial || { username: '', password: '', full_name: '', phone: '', is_active: true })
  const [loading, setLoading] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const payload = { ...form }
      if (initial && !payload.password) {
        delete payload.password
      }
      await onSave(payload)
      onClose()
    } catch (err) {
      const errorData = err.response?.data
      let msg = 'Failed to save employee'
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
      <Input label="Full Name *" value={form.full_name} onChange={e => set('full_name', e.target.value)} required />
      <Input label="Username *" value={form.username} onChange={e => set('username', e.target.value)} required />
      <Input label={initial ? 'New Password (leave blank to keep current)' : 'Password *'} type="password"
        value={form.password} onChange={e => set('password', e.target.value)} required={!initial} minLength={6} />
      <Input label="Phone" value={form.phone} onChange={e => set('phone', e.target.value)} />
      <div className="flex items-center gap-2">
        <input type="checkbox" id="emp_active" checked={form.is_active} onChange={e => set('is_active', e.target.checked)} className="w-4 h-4 accent-green-600" />
        <label htmlFor="emp_active" className="text-sm text-gray-700">Active</label>
      </div>
      <div className="flex gap-3 pt-2">
        <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
        <Button type="submit" className="flex-1" disabled={loading}>{loading ? 'Saving...' : 'Save'}</Button>
      </div>
    </form>
  )
}

export default function EmployeesPage() {
  const [showAdd, setShowAdd] = useState(false)
  const [editEmp, setEditEmp] = useState(null)
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: () => authApi.employees().then(r => r.data),
  })

  const employees = Array.isArray(data) ? data : (data?.results || [])

  const createMutation = useMutation({
    mutationFn: (data) => authApi.createEmployee(data),
    onSuccess: () => { qc.invalidateQueries(['employees']); addToast('Employee created') },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => authApi.updateEmployee(id, data),
    onSuccess: () => { qc.invalidateQueries(['employees']); addToast('Employee updated') },
  })

  if (isLoading) return <PageLoader />

  return (
    <div className="max-w-3xl mx-auto px-3 sm:px-4 md:px-6 py-4 md:py-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Employees</h1>
        <Button size="sm" onClick={() => setShowAdd(true)}><Plus className="w-4 h-4" /> Add</Button>
      </div>

      <div className="space-y-2">
        {employees.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <UserCog className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No employees yet</p>
          </div>
        )}
        {employees.map(emp => (
          <div key={emp.id} className="bg-white rounded-2xl border border-gray-100 shadow-xs px-4 py-3 flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
              <span className="text-sm font-bold text-blue-700">{emp.full_name?.[0]?.toUpperCase() || 'E'}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-900 truncate leading-tight">{emp.full_name}</p>
              <p className="text-xs text-gray-500 truncate mt-0.5">@{emp.username} {emp.phone && `· ${emp.phone}`}</p>
            </div>
            {!emp.is_active && <Badge variant="danger" className="shrink-0 text-[11px]">Inactive</Badge>}
            <Button size="sm" variant="secondary" onClick={() => setEditEmp(emp)} className="shrink-0">
              <Edit2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        ))}
      </div>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Employee">
        <EmployeeForm onSave={(data) => createMutation.mutateAsync(data)} onClose={() => setShowAdd(false)} />
      </Modal>
      <Modal open={!!editEmp} onClose={() => setEditEmp(null)} title="Edit Employee">
        {editEmp && (
          <EmployeeForm initial={editEmp}
            onSave={(data) => updateMutation.mutateAsync({ id: editEmp.id, data })}
            onClose={() => setEditEmp(null)} />
        )}
      </Modal>
    </div>
  )
}
