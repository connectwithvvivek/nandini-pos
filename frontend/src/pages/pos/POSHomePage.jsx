import { useState, useCallback, useMemo } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { customersApi, shiftsApi } from '../../api'
import { useAuth } from '../../hooks/useAuth'
import {
  Search, ChevronRight, Clock, Plus, Users, ShoppingBag,
  Sparkles, Phone, MapPin, X, ArrowRight, UserCheck, AlertCircle
} from '../../components/ui/icons'
import { Badge } from '../../components/ui/Badge'
import { PageLoader } from '../../components/ui/Spinner'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { Input, Select, Textarea } from '../../components/ui/Input'
import { addToast } from '../../hooks/useToast'

const TYPE_COLORS = {
  REGULAR: 'default',
  RETAILER: 'info',
  HOTEL: 'purple',
  RESTAURANT: 'warning',
  INSTITUTION: 'success',
  OTHER: 'default',
}

const CUSTOMER_TYPES = [
  { id: 'ALL', label: 'All Customers' },
  { id: 'REGULAR', label: 'Regular' },
  { id: 'HOTEL', label: 'Hotels' },
  { id: 'RESTAURANT', label: 'Restaurants' },
  { id: 'RETAILER', label: 'Retailers' },
  
]

function QuickCustomerModal({ open, onClose, defaultName = '', onCreated }) {
  const [form, setForm] = useState({
    name: defaultName,
    phone: '',
    address: '',
    customer_type: 'REGULAR',
    notes: '',
    is_active: true,
  })
  const [loading, setLoading] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data } = await customersApi.create(form)
      addToast('Customer registered!')
      onCreated(data)
      onClose()
    } catch (err) {
      const data = err.response?.data
      let msg = 'Failed to create customer.'
      if (typeof data === 'string') msg = data
      else if (data?.detail) msg = data.detail
      else if (data && typeof data === 'object') {
        msg = Object.entries(data).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(' ') : v}`).join(' | ')
      }
      addToast(msg, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Register New Customer">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Customer Name *"
          value={form.name}
          onChange={e => set('name', e.target.value)}
          required
          placeholder="e.g. Anand Milk Point / Walk-in Customer"
        />
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Phone Number"
            value={form.phone}
            onChange={e => set('phone', e.target.value)}
            placeholder="9876543210"
          />
          <Select
            label="Customer Type"
            value={form.customer_type}
            onChange={e => set('customer_type', e.target.value)}
          >
            {['REGULAR','RETAILER','HOTEL','RESTAURANT','INSTITUTION','OTHER'].map(t => (
              <option key={t} value={t}>{t.charAt(0) + t.slice(1).toLowerCase()}</option>
            ))}
          </Select>
        </div>
        <Textarea
          label="Address (Optional)"
          value={form.address}
          onChange={e => set('address', e.target.value)}
          placeholder="Shop / Area address"
        />
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" className="flex-1" disabled={loading}>
            {loading ? 'Creating...' : 'Create & Select'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export default function POSHomePage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [selectedType, setSelectedType] = useState('ALL')
  const [showAddModal, setShowAddModal] = useState(false)

  const debounce = useCallback((val) => {
    clearTimeout(window._posTimer)
    window._posTimer = setTimeout(() => setDebouncedSearch(val), 250)
  }, [])

  const handleSearch = (e) => {
    setSearch(e.target.value)
    debounce(e.target.value)
  }

  const clearSearch = () => {
    setSearch('')
    setDebouncedSearch('')
  }

  // Active shift query
  const { data: currentShift } = useQuery({
    queryKey: ['current-shift'],
    queryFn: () => shiftsApi.current().then(r => r.data).catch(() => null),
  })

  // Customers query - loads initial list and updates with search
  const { data, isLoading } = useQuery({
    queryKey: ['customers-pos', debouncedSearch],
    queryFn: () => customersApi.list({ search: debouncedSearch, is_active: true, page_size: 50 }).then(r => r.data),
  })

  const rawCustomers = Array.isArray(data) ? data : (data?.results || [])

  // Filter customers by type if selected
  const filteredCustomers = useMemo(() => {
    if (selectedType === 'ALL') return rawCustomers
    return rawCustomers.filter(c => c.customer_type === selectedType)
  }, [rawCustomers, selectedType])

  // Recommended customers (frequent / top regular customers)
  const recommendedCustomers = useMemo(() => {
    if (debouncedSearch) return []
    // Prioritize business accounts like Hotels, Restaurants, Retailers, or first 6
    return [...rawCustomers].slice(0, 6)
  }, [rawCustomers, debouncedSearch])

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening'

  const handleSelectCustomer = (customerOrId) => {
    let target = customerOrId
    if (typeof customerOrId === 'object' && customerOrId !== null) {
      target = customerOrId.customer_code || customerOrId.id
    } else {
      const found = rawCustomers.find(c => String(c.id) === String(customerOrId))
      if (found && found.customer_code) target = found.customer_code
    }
    navigate(`/pos/customer/${target}`)
  }

  // Handle Quick Walk-in sale: selects or creates a standard Walk-in customer
  const handleQuickWalkIn = async () => {
    const walkIn = rawCustomers.find(c => c.name.toLowerCase().includes('walk-in') || c.name.toLowerCase().includes('regular'))
    if (walkIn) {
      handleSelectCustomer(walkIn.id)
    } else {
      try {
        const { data: newCustomer } = await customersApi.create({
          name: 'Walk-in Customer',
          phone: '',
          customer_type: 'REGULAR',
          is_active: true,
        })
        qc.invalidateQueries(['customers-pos'])
        handleSelectCustomer(newCustomer.id)
      } catch {
        if (rawCustomers.length > 0) {
          handleSelectCustomer(rawCustomers[0].id)
        } else {
          setShowAddModal(true)
        }
      }
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-4 md:px-6 py-4 md:py-5 space-y-4">
      {/* Minimalist Professional Header Bar */}
      <div className="bg-white rounded-2xl border border-gray-100 p-3 sm:p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-green-50 text-green-700 flex items-center justify-center font-bold shrink-0">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base font-bold text-gray-900 leading-tight">
                Point of Sale
              </h1>
              <span className="text-gray-300">•</span>
              <span className="text-xs font-semibold text-gray-500 truncate">
                {user?.full_name || 'Cashier'}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5 truncate">
              Select or search a customer to start billing
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Walk-in Button */}
          <button
            onClick={handleQuickWalkIn}
            className="px-3.5 py-2 rounded-xl bg-green-50 hover:bg-green-100 text-green-700 text-xs font-bold transition-colors flex items-center gap-1.5"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Walk-in Sale</span>
          </button>

          {/* Shift indicator */}
          <Link
            to="/shift"
            className="px-3 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-1.5"
          >
            <span className={`w-2 h-2 rounded-full ${currentShift ? 'bg-green-600 animate-pulse' : 'bg-amber-500'}`} />
            <span>{currentShift ? currentShift.shift_name : 'No Active Shift'}</span>
          </Link>
        </div>
      </div>

      {/* Search & Filter Controls */}
      <div className="bg-white rounded-3xl border border-gray-100 p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={handleSearch}
              placeholder="Search customer by name, code (CUS-0001), or mobile..."
              className="w-full pl-11 pr-10 py-3 rounded-2xl border border-gray-200 bg-gray-50/50 hover:bg-white focus:bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition shadow-inner"
              autoFocus
            />
            {search && (
              <button
                onClick={clearSearch}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 rounded-full"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Desktop Only New Customer Button (Mobile uses floating button) */}
          <Button onClick={() => setShowAddModal(true)} className="hidden sm:inline-flex whitespace-nowrap py-3 px-5">
            <Plus className="w-4 h-4" /> New Customer
          </Button>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          {CUSTOMER_TYPES.map(type => (
            <button
              key={type.id}
              onClick={() => setSelectedType(type.id)}
              className={`px-3.5 py-1.5 rounded-xl font-medium transition-colors whitespace-nowrap ${
                selectedType === type.id
                  ? 'bg-green-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Customers List / Recommendation Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-green-600" />
            {debouncedSearch
              ? `Search Results for "${debouncedSearch}"`
              : selectedType !== 'ALL'
              ? `${selectedType} Customers`
              : 'Select Customer to Start Billing'}
          </h2>
          <span className="text-xs text-gray-500">
            {filteredCustomers.length} customer{filteredCustomers.length !== 1 ? 's' : ''} available
          </span>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gray-200 rounded-full" />
                  <div className="space-y-1.5 flex-1">
                    <div className="h-4 bg-gray-200 rounded w-3/4" />
                    <div className="h-3 bg-gray-100 rounded w-1/2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="bg-white rounded-3xl border border-gray-100 p-12 text-center space-y-3">
            <Users className="w-12 h-12 mx-auto text-gray-300" />
            <h3 className="text-base font-bold text-gray-800">No Customers Found</h3>
            <p className="text-sm text-gray-500 max-w-sm mx-auto">
              No customer matched {debouncedSearch ? `"${debouncedSearch}"` : 'the selected filter'}. You can quickly create one right now.
            </p>
            <Button
              onClick={() => setShowAddModal(true)}
              className="mt-2"
            >
              <Plus className="w-4 h-4" /> Add "{search || 'New Customer'}"
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredCustomers.map(c => (
              <div
                key={c.id}
                onClick={() => handleSelectCustomer(c.id)}
                className="group bg-white rounded-2xl border border-gray-100 hover:border-green-400 p-4 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="w-10 h-10 sm:w-11 sm:h-11 bg-green-100 text-green-700 font-bold text-sm sm:text-base rounded-2xl flex items-center justify-center shrink-0 group-hover:bg-green-600 group-hover:text-white transition-colors">
                        {c.name?.[0]?.toUpperCase() || 'C'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm sm:text-base font-bold text-gray-900 group-hover:text-green-700 transition-colors truncate leading-tight">
                          {c.name}
                        </p>
                        <p className="text-xs text-gray-400 font-mono mt-0.5 truncate">
                          {c.customer_code}
                        </p>
                      </div>
                    </div>
                    <Badge variant={TYPE_COLORS[c.customer_type] || 'default'} className="shrink-0 text-[10px] sm:text-xs">
                      {c.customer_type}
                    </Badge>
                  </div>

                  {c.phone && (
                    <p className="text-xs text-gray-500 flex items-center gap-1.5 mt-2">
                      <Phone className="w-3.5 h-3.5 text-gray-400" />
                      {c.phone}
                    </p>
                  )}
                  {c.address && (
                    <p className="text-xs text-gray-400 flex items-center gap-1.5 mt-1 truncate">
                      <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                      {c.address}
                    </p>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-gray-50 flex items-center justify-between text-xs font-bold text-green-700 group-hover:text-green-800">
                  <span>Start Sale</span>
                  <div className="w-6 h-6 rounded-full bg-green-50 group-hover:bg-green-600 group-hover:text-white flex items-center justify-center transition-colors">
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Mobile Floating + Button for Adding Customer */}
      <button
        type="button"
        onClick={() => setShowAddModal(true)}
        className="fixed bottom-20 right-4 sm:hidden z-40 bg-green-600 hover:bg-green-700 active:bg-green-800 text-white rounded-full px-4 py-3.5 shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all"
        title="Add New Customer"
      >
        <Plus className="w-5 h-5 stroke-[2.5]" />
        <span className="text-xs font-bold">New Customer</span>
      </button>

      {/* Quick Add Customer Modal */}
      <QuickCustomerModal
        open={showAddModal}
        defaultName={search}
        onClose={() => setShowAddModal(false)}
        onCreated={(newCust) => {
          qc.invalidateQueries(['customers-pos'])
          handleSelectCustomer(newCust.id)
        }}
      />
    </div>
  )
}
