import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { customersApi } from '../../api'
import { Search, Plus, ChevronRight, Phone, Tag, Users, MapPin } from '../../components/ui/icons'
import { Link, useNavigate } from 'react-router-dom'
import { Badge } from '../../components/ui/Badge'
import { PageLoader } from '../../components/ui/Spinner'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { Input, Select, Textarea } from '../../components/ui/Input'
import { addToast } from '../../hooks/useToast'

const TYPE_COLORS = {
  REGULAR: 'default', RETAILER: 'info', HOTEL: 'purple',
  RESTAURANT: 'warning', INSTITUTION: 'success', OTHER: 'default',
}

function CustomerForm({ initial, onSave, onClose }) {
  const [form, setForm] = useState(initial || {
    name: '', phone: '', address: '', customer_type: 'REGULAR', notes: '', is_active: true
  })
  const [loading, setLoading] = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) return
    setLoading(true)
    try {
      await onSave(form)
      onClose()
    } catch {
      // Error handled by parent
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input label="Full Name *" value={form.name} onChange={e => set('name', e.target.value)} required placeholder="e.g. Ramesh Kumar" />
      <Input label="Phone Number" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="9876543210" />
      <Select label="Customer Type" value={form.customer_type} onChange={e => set('customer_type', e.target.value)}>
        <option value="REGULAR">Regular Consumer</option>
        <option value="RETAILER">Retail Store / Vendor</option>
        <option value="HOTEL">Hotel / Tea Stall</option>
        <option value="RESTAURANT">Restaurant</option>
        <option value="INSTITUTION">Institution</option>
        <option value="OTHER">Other</option>
      </Select>
      <Textarea label="Shop / Delivery Address" value={form.address} onChange={e => set('address', e.target.value)} placeholder="Street, landmark, locality..." />
      <Textarea label="Notes / Credit Terms (Optional)" value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="e.g. Daily morning milk crates" />
      <div className="flex gap-3 pt-2">
        <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
        <Button type="submit" className="flex-1" disabled={loading}>{loading ? 'Saving...' : 'Save Customer'}</Button>
      </div>
    </form>
  )
}

export default function CustomersPage() {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const qc = useQueryClient()
  const navigate = useNavigate()

  // Debounce search
  const debounceTimer = useState(null)
  const handleSearch = (e) => {
    const val = e.target.value
    setSearch(val)
    clearTimeout(debounceTimer[0])
    debounceTimer[0] = setTimeout(() => {
      setDebouncedSearch(val)
    }, 300)
  }

  const { data, isLoading } = useQuery({
    queryKey: ['customers', debouncedSearch],
    queryFn: () => customersApi.list({ search: debouncedSearch, page_size: 100 }).then(r => r.data),
  })

  const createMutation = useMutation({
    mutationFn: (data) => customersApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries(['customers'])
      addToast('Customer created successfully')
    },
  })

  const customers = data?.results || []

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-green-50 text-green-700 rounded-xl">
              <Users className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">Customer Directory</h1>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Manage customer accounts, custom rates, credit ledgers and pending balances
          </p>
        </div>

        <Button onClick={() => setShowAdd(true)} size="sm" className="min-h-[40px] px-4 font-bold shadow-xs flex items-center gap-2 cursor-pointer self-start sm:self-center">
          <Plus className="w-4 h-4" />
          <span>Add New Customer</span>
        </Button>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={search}
          onChange={handleSearch}
          placeholder="Search by customer name, phone number, customer ID (e.g. CUST-0001)..."
          className="w-full pl-10 pr-4 py-3 rounded-2xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-green-500 text-xs sm:text-sm shadow-xs"
        />
      </div>

      {/* Customer Grid */}
      {isLoading ? <PageLoader /> : (
        <div>
          {customers.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 text-gray-400 space-y-2">
              <Users className="w-12 h-12 mx-auto text-gray-300" />
              <p className="text-sm font-semibold text-gray-700">No customers found</p>
              <p className="text-xs text-gray-400">Try adjusting your search query or add a new customer</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {customers.map(c => (
                <Link
                  key={c.id}
                  to={`/customers/${c.customer_code || c.id}`}
                  className="bg-white rounded-2xl border border-gray-100 p-4 hover:border-green-300 hover:shadow-md transition-all flex flex-col justify-between space-y-3 cursor-pointer group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-11 h-11 bg-green-50 text-green-700 font-black rounded-2xl flex items-center justify-center text-base shrink-0 group-hover:bg-green-600 group-hover:text-white transition-colors">
                        {c.name?.[0]?.toUpperCase() || 'C'}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-bold text-gray-900 truncate leading-tight group-hover:text-green-700 transition-colors">
                          {c.name}
                        </h3>
                        <p className="font-mono text-[11px] text-gray-400 mt-0.5">
                          {c.customer_code}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <Badge variant={TYPE_COLORS[c.customer_type]} className="text-[10px]">
                        {c.customer_type}
                      </Badge>
                      {!c.is_active && <Badge variant="danger" className="text-[10px]">Inactive</Badge>}
                    </div>
                  </div>

                  <div className="space-y-1 text-xs text-gray-500 pt-1 border-t border-gray-50">
                    {c.phone && (
                      <div className="flex items-center gap-1.5 text-gray-600 truncate">
                        <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>{c.phone}</span>
                      </div>
                    )}
                    {c.address && (
                      <div className="flex items-center gap-1.5 text-gray-400 truncate">
                        <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span className="truncate">{c.address}</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-gray-50 flex items-center justify-between text-xs font-bold text-green-700 group-hover:text-green-800">
                    <span>View Credit Ledger & Details</span>
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add New Customer">
        <CustomerForm onSave={(data) => createMutation.mutateAsync(data)} onClose={() => setShowAdd(false)} />
      </Modal>
    </div>
  )
}
