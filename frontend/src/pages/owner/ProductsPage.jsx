import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { productsApi } from '../../api'
import { formatCurrency } from '../../lib/utils'
import { Plus, Search, Edit2, ImagePlus, AlertTriangle, Package, LayoutGrid, List, FolderPlus, Tag } from 'lucide-react'
import { PageLoader, SkeletonCard } from '../../components/ui/Spinner'
import { Badge } from '../../components/ui/Badge'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { Input, Select, Textarea } from '../../components/ui/Input'
import { addToast } from '../../hooks/useToast'

const PLACEHOLDER = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2YzZjRmNiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iI2FlYjViZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg=='

function CategoryModal({ open, onClose }) {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const qc = useQueryClient()

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    try {
      await productsApi.createCategory({ name: name.trim() })
      await qc.invalidateQueries(['categories'])
      addToast(`Category "${name.trim()}" created successfully!`)
      setName('')
      onClose()
    } catch (err) {
      addToast(err.response?.data?.name?.[0] || err.response?.data?.detail || 'Failed to create category', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Create New Category">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Category Name *"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="e.g. Milk, Curd, Ghee, Sweets, Ice Creams, Beverages"
          required
          autoFocus
        />
        <p className="text-xs text-gray-500">
          Categories help organize your parlour products in both POS billing and inventory tracking.
        </p>
        <div className="flex gap-2 justify-end pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading || !name.trim()}>
            {loading ? 'Creating...' : 'Create Category'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

function ProductForm({ initial, onSave, onClose }) {
  const [form, setForm] = useState(initial || {
    name: '', pack_size: '', default_price: '', stock_quantity: '0', minimum_stock: '0',
    unit: 'pcs', description: '', is_active: true, category: ''
  })
  const [loading, setLoading] = useState(false)
  const [showQuickCat, setShowQuickCat] = useState(false)
  const [newCatName, setNewCatName] = useState('')
  const [savingCat, setSavingCat] = useState(false)

  const qc = useQueryClient()
  const { data: cats } = useQuery({ queryKey: ['categories'], queryFn: () => productsApi.categories().then(r => r.data) })
  const categories = Array.isArray(cats) ? cats : (cats?.results || [])
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleCreateCategory = async () => {
    if (!newCatName.trim()) return
    setSavingCat(true)
    try {
      const res = await productsApi.createCategory({ name: newCatName.trim() })
      await qc.invalidateQueries(['categories'])
      set('category', String(res.data.id))
      setShowQuickCat(false)
      setNewCatName('')
      addToast(`Category "${res.data.name}" created and selected!`)
    } catch (err) {
      addToast(err.response?.data?.name?.[0] || 'Failed to create category', 'error')
    } finally {
      setSavingCat(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const payload = {
        name: form.name.trim(),
        pack_size: form.pack_size || '',
        unit: form.unit || 'pcs',
        default_price: parseFloat(form.default_price) || 0,
        stock_quantity: parseFloat(form.stock_quantity || 0),
        minimum_stock: parseFloat(form.minimum_stock || 0),
        description: form.description || '',
        is_active: Boolean(form.is_active),
        category: form.category ? Number(form.category) : null,
      }
      await onSave(payload)
      onClose()
    } catch (err) {
      const data = err.response?.data
      let msg = 'Failed to save product.'
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

  const PACK_PRESETS = ['250 ml', '500 ml', '1 L', '2 L', '6 L', '200 g', '450 g', '1 kg', 'Pack', 'Piece']
  const COMMON_PRODUCTS = [
    { name: 'Nandini Toned Milk', pack: '250 ml', price: '12.00', catName: 'Milk' },
    { name: 'Nandini Toned Milk', pack: '500 ml', price: '24.00', catName: 'Milk' },
    { name: 'Nandini Toned Milk', pack: '1 L', price: '48.00', catName: 'Milk' },
    { name: 'Nandini Shubham Standardised Milk', pack: '500 ml', price: '27.00', catName: 'Milk' },
    { name: 'Nandini Shubham Standardised Milk', pack: '1 L', price: '54.00', catName: 'Milk' },
    { name: 'Nandini Samrudhi Milk', pack: '500 ml', price: '29.00', catName: 'Milk' },
    { name: 'Nandini Thick Curd', pack: '200 g', price: '12.00', catName: 'Curd' },
    { name: 'Nandini Thick Curd', pack: '500 ml', price: '28.00', catName: 'Curd' },
    { name: 'Nandini Thick Curd', pack: '1 L', price: '55.00', catName: 'Curd' },
    { name: 'Nandini Pure Ghee', pack: '200 ml', price: '140.00', catName: 'Ghee' },
    { name: 'Nandini Pure Ghee', pack: '500 ml', price: '330.00', catName: 'Ghee' },
    { name: 'Nandini Pure Ghee', pack: '1 L', price: '650.00', catName: 'Ghee' },
  ]

  const handleSelectPreset = (p) => {
    set('name', p.name)
    set('pack_size', p.pack)
    set('default_price', p.price)
    const foundCat = categories.find(c => c.name.toLowerCase().includes(p.catName.toLowerCase()))
    if (foundCat) set('category', String(foundCat.id))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Quick Fill Templates */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
          Quick Fill Presets (250ml, 500ml, 1L, etc.)
        </label>
        <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1 bg-gray-50 rounded-xl border border-gray-100">
          {COMMON_PRODUCTS.map((cp, idx) => (
            <button
              type="button"
              key={idx}
              onClick={() => handleSelectPreset(cp)}
              className="text-[11px] font-semibold px-2 py-0.5 rounded-lg bg-white hover:bg-green-100 text-gray-800 hover:text-green-800 border border-gray-200 transition-colors shrink-0"
            >
              + {cp.name.replace('Nandini ', '')} ({cp.pack})
            </button>
          ))}
        </div>
      </div>

      <Input
        label="Product Name *"
        value={form.name}
        onChange={e => set('name', e.target.value)}
        required
        placeholder="e.g. Nandini Toned Milk / Nandini Curd"
      />

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-sm font-medium text-gray-700">Pack Size</label>
          <span className="text-[11px] text-gray-400">Common: 250ml, 500ml, 1L</span>
        </div>
        <div className="flex flex-wrap gap-1 mb-2">
          {PACK_PRESETS.map(ps => (
            <button
              type="button"
              key={ps}
              onClick={() => set('pack_size', ps)}
              className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors ${
                form.pack_size === ps
                  ? 'bg-green-600 text-white font-bold'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
            >
              {ps}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input
            value={form.pack_size}
            onChange={e => set('pack_size', e.target.value)}
            placeholder="e.g. 500 ml or 1 L"
          />
          <Input
            label="Unit"
            value={form.unit}
            onChange={e => set('unit', e.target.value)}
            placeholder="pcs / packet"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Input
          label="Default Price (₹) *"
          type="number"
          value={form.default_price}
          onChange={e => set('default_price', e.target.value)}
          required
          min="0"
          step="0.01"
          placeholder="0.00"
        />
        <Input
          label="Initial Stock"
          type="number"
          value={form.stock_quantity}
          onChange={e => set('stock_quantity', e.target.value)}
          min="0"
          step="any"
          placeholder="0"
        />
        <Input
          label="Low Stock Alert"
          type="number"
          value={form.minimum_stock}
          onChange={e => set('minimum_stock', e.target.value)}
          min="0"
          step="any"
          placeholder="10"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-sm font-medium text-gray-700">Category</label>
          <button
            type="button"
            onClick={() => setShowQuickCat(s => !s)}
            className="text-xs text-green-700 hover:text-green-800 font-semibold"
          >
            {showQuickCat ? 'Select existing category' : '+ Create New Category'}
          </button>
        </div>
        {showQuickCat ? (
          <div className="flex items-center gap-2 p-2 bg-green-50 rounded-xl border border-green-200">
            <input
              type="text"
              value={newCatName}
              onChange={e => setNewCatName(e.target.value)}
              placeholder="e.g. Ice Creams, Paneer, Sweets..."
              className="flex-1 px-3 py-1.5 text-xs bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-green-500"
            />
            <Button
              type="button"
              size="sm"
              disabled={!newCatName.trim() || savingCat}
              onClick={handleCreateCategory}
              className="text-xs py-1.5 px-3"
            >
              {savingCat ? 'Saving...' : 'Add'}
            </Button>
            <button
              type="button"
              onClick={() => { setShowQuickCat(false); setNewCatName('') }}
              className="text-xs text-gray-500 hover:text-gray-700 p-1"
            >
              Cancel
            </button>
          </div>
        ) : (
          <Select
            value={form.category || ''}
            onChange={e => set('category', e.target.value || '')}
          >
            <option value="">Choose category...</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        )}
      </div>

      <Textarea
        label="Description (Optional)"
        value={form.description}
        onChange={e => set('description', e.target.value)}
        placeholder="Storage temperature, shelf life, or supplier notes"
        rows={2}
      />

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="prod_active"
          checked={form.is_active}
          onChange={e => set('is_active', e.target.checked)}
          className="w-4 h-4 accent-green-600 rounded"
        />
        <label htmlFor="prod_active" className="text-sm font-semibold text-gray-700">
          Available for Selling in POS
        </label>
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" className="flex-1 font-bold" disabled={loading}>
          {loading ? 'Saving...' : 'Save Product'}
        </Button>
      </div>
    </form>
  )
}

function ProductCard({ product, onEdit, onUploadImage }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden flex flex-col justify-between hover:border-green-300 transition-colors">
      <div className="relative aspect-square bg-gray-50">
        <img src={product.image_url || PLACEHOLDER} alt={product.name}
          className="w-full h-full object-cover"
          onError={e => { e.target.src = PLACEHOLDER }} />
        {product.is_low_stock && (
          <div className="absolute top-2 left-2 bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
            <AlertTriangle className="w-3 h-3" /> Low
          </div>
        )}
        {!product.is_active && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span className="text-white text-xs font-bold bg-black/60 px-3 py-1 rounded-full">Inactive</span>
          </div>
        )}
        <button onClick={() => onUploadImage(product)}
          className="absolute bottom-2 right-2 p-1.5 bg-white/90 backdrop-blur-xs rounded-xl shadow-xs hover:bg-white transition-colors"
          title="Upload / Change Image">
          <ImagePlus className="w-4 h-4 text-gray-700" />
        </button>
      </div>
      <div className="p-3.5 space-y-2">
        <div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {product.category_name && (
              <span className="text-[10px] font-bold uppercase tracking-wider text-green-700 bg-green-50 px-1.5 py-0.5 rounded">
                {product.category_name}
              </span>
            )}
            {product.pack_size && (
              <span className="text-[10px] font-semibold text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded">
                {product.pack_size}
              </span>
            )}
          </div>
          <p className="text-sm font-bold text-gray-900 leading-tight mt-1 truncate">{product.name}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            Stock: <strong className="text-gray-700">{product.stock_quantity} {product.unit}</strong>
          </p>
        </div>
        <div className="pt-2 border-t border-gray-50 flex items-center justify-between">
          <p className="text-base font-black text-green-700">{formatCurrency(product.default_price)}</p>
          <Button size="sm" variant="secondary" className="text-xs px-2.5 py-1" onClick={() => onEdit(product)}>
            <Edit2 className="w-3 h-3" /> Edit
          </Button>
        </div>
      </div>
    </div>
  )
}

function ProductRow({ product, onEdit, onUploadImage }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-3 shadow-xs flex items-center justify-between gap-3 hover:border-green-200 transition-colors">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="w-12 h-12 rounded-xl bg-gray-50 border border-gray-100 overflow-hidden flex-shrink-0 relative group">
          <img
            src={product.image_url || PLACEHOLDER}
            alt={product.name}
            className="w-full h-full object-cover"
            onError={e => { e.target.src = PLACEHOLDER }}
          />
          <button
            onClick={() => onUploadImage(product)}
            className="absolute inset-0 bg-black/40 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
            title="Change image"
          >
            <ImagePlus className="w-4 h-4" />
          </button>
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold text-gray-900 truncate leading-tight">{product.name}</p>
            {product.pack_size && (
              <span className="text-[10px] font-semibold text-green-700 bg-green-50 px-1.5 py-0.5 rounded">
                {product.pack_size}
              </span>
            )}
            {!product.is_active && (
              <Badge variant="danger" className="text-[10px]">Inactive</Badge>
            )}
            {product.is_low_stock && (
              <Badge variant="warning" className="text-[10px]">Low</Badge>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            {product.category_name || 'Dairy'} · Stock: <strong className="text-gray-700">{product.stock_quantity} {product.unit}</strong> (Min: {product.minimum_stock})
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4 flex-shrink-0">
        <span className="text-base font-black text-green-700">
          {formatCurrency(product.default_price)}
        </span>
        <Button size="sm" variant="secondary" className="text-xs" onClick={() => onEdit(product)}>
          <Edit2 className="w-3.5 h-3.5" /> Edit
        </Button>
      </div>
    </div>
  )
}

export default function ProductsPage() {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('ALL')
  const [viewMode, setViewMode] = useState('grid') // 'grid' | 'list'
  const [showAdd, setShowAdd] = useState(false)
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [editProduct, setEditProduct] = useState(null)
  const [uploadProduct, setUploadProduct] = useState(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const fileRef = useRef()
  const qc = useQueryClient()

  const debounce = (val) => {
    clearTimeout(window._prodTimer)
    window._prodTimer = setTimeout(() => setDebouncedSearch(val), 300)
  }

  // Fetch categories
  const { data: catsData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => productsApi.categories().then(r => r.data),
  })
  const categories = Array.isArray(catsData) ? catsData : (catsData?.results || [])

  // Fetch products with category filter
  const { data, isLoading } = useQuery({
    queryKey: ['products', debouncedSearch, selectedCategory],
    queryFn: () => productsApi.list({
      search: debouncedSearch,
      category: selectedCategory === 'ALL' ? undefined : selectedCategory,
      page_size: 100
    }).then(r => r.data),
  })

  const createMutation = useMutation({
    mutationFn: (data) => productsApi.create(data),
    onSuccess: () => { qc.invalidateQueries(['products']); addToast('Product created') },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => productsApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries(['products']); addToast('Product updated') },
  })

  const handleImageUpload = async (e) => {
    const file = e.target.files[0]
    if (!file || !uploadProduct) return
    const fd = new FormData()
    fd.append('image', file)
    setUploadingImage(true)
    try {
      await productsApi.uploadImage(uploadProduct.id, fd)
      qc.invalidateQueries(['products'])
      addToast('Product image uploaded successfully')
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 'Failed to upload image'
      addToast(errorMsg, 'error')
    } finally {
      setUploadingImage(false)
      setUploadProduct(null)
      e.target.value = ''
    }
  }

  const products = Array.isArray(data) ? data : (data?.results || [])

  return (
    <div className="max-w-5xl mx-auto space-y-4 px-3 sm:px-6 py-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Product Catalog</h1>
          <p className="text-xs text-gray-500">Manage milk packs, curds, ghee, sweets & pricing</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={() => setShowCategoryModal(true)}
            className="font-semibold text-xs sm:text-sm py-2 px-3"
            title="Add a custom product category"
          >
            <FolderPlus className="w-4 h-4 text-green-700" />
            <span>+ Category</span>
          </Button>
          <Button
            onClick={() => setShowAdd(true)}
            className="font-bold text-xs sm:text-sm py-2 px-3.5"
          >
            <Plus className="w-4 h-4" />
            <span>Add Product</span>
          </Button>
        </div>
      </div>

      {/* Search Bar & View Mode Toggle */}
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); debounce(e.target.value) }}
            placeholder="Search products by name, pack size (250ml, 500ml, 1L)..."
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-green-500 text-xs sm:text-sm shadow-xs"
          />
        </div>

        {/* Grid vs List View Toggle */}
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

      {/* Category Filter Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
        <button
          onClick={() => setSelectedCategory('ALL')}
          className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition-colors ${
            selectedCategory === 'ALL'
              ? 'bg-green-600 text-white shadow-xs'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          All Products ({products.length})
        </button>
        {categories.map(c => (
          <button
            key={c.id}
            onClick={() => setSelectedCategory(c.name)}
            className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition-colors ${
              selectedCategory === c.name
                ? 'bg-green-600 text-white shadow-xs'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {c.name}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {[...Array(8)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-12 text-gray-400 bg-white rounded-3xl border border-gray-100">
          <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm font-semibold">No products found</p>
          <p className="text-xs text-gray-400 mt-1">Try a different search query or category</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {products.map(p => (
            <ProductCard
              key={p.id}
              product={p}
              onEdit={setEditProduct}
              onUploadImage={(prod) => { setUploadProduct(prod); fileRef.current?.click() }}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {products.map(p => (
            <ProductRow
              key={p.id}
              product={p}
              onEdit={setEditProduct}
              onUploadImage={(prod) => { setUploadProduct(prod); fileRef.current?.click() }}
            />
          ))}
        </div>
      )}

      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />

      {/* Add Product Modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Product">
        <ProductForm onSave={(data) => createMutation.mutateAsync(data)} onClose={() => setShowAdd(false)} />
      </Modal>

      {/* Edit Product Modal */}
      <Modal open={!!editProduct} onClose={() => setEditProduct(null)} title="Edit Product">
        {editProduct && (
          <ProductForm
            initial={editProduct}
            onSave={(data) => updateMutation.mutateAsync({ id: editProduct.id, data })}
            onClose={() => setEditProduct(null)} />
        )}
      </Modal>

      {/* Create Category Modal */}
      <CategoryModal open={showCategoryModal} onClose={() => setShowCategoryModal(false)} />
    </div>
  )
}
