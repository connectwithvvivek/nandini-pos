import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { customersApi, pricingApi, productsApi } from '../../api'
import { formatCurrency } from '../../lib/utils'
import {
  ArrowLeft, Plus, Minus, ShoppingCart, AlertTriangle,
  Search, Trash2, Tag, Check, X, Store, User, LayoutGrid, List
} from 'lucide-react'
import { PageLoader, SkeletonCard } from '../../components/ui/Spinner'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'

const PLACEHOLDER = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2YzZjRmNiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iI2FlYjViZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg=='

// GRID VIEW CARD (Informative, Touch-Friendly & Easy Add to Cart)
function ProductCard({ product, qty, onAdd, onRemove, onSetQty }) {
  const stock = Number(product.stock_quantity)
  const outOfStock = stock <= 0
  const hasCustomPrice = product.customer_price !== null && Number(product.customer_price) !== Number(product.default_price)
  const inCart = qty > 0

  return (
    <div className={`bg-white rounded-2xl border flex flex-col justify-between overflow-hidden transition-all shadow-xs ${
      outOfStock
        ? 'opacity-60 border-gray-100'
        : inCart
        ? 'border-green-500 ring-2 ring-green-100 shadow-sm'
        : 'border-gray-100 hover:border-green-300 hover:shadow-md'
    }`}>
      {/* Product Image area (1-tap add when not in cart) */}
      <div
        onClick={() => !outOfStock && qty === 0 && onAdd(product)}
        className={`relative aspect-video sm:aspect-square bg-gray-50 overflow-hidden ${
          !outOfStock && qty === 0 ? 'cursor-pointer group' : ''
        }`}
      >
        <img
          src={product.image_url || PLACEHOLDER}
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          onError={e => { e.target.src = PLACEHOLDER }}
        />
        {inCart && (
          <div className="absolute top-2 left-2 bg-green-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
            <Check className="w-3 h-3 stroke-[3]" /> {qty} in Cart
          </div>
        )}
        {!inCart && product.is_low_stock && !outOfStock && (
          <div className="absolute top-2 left-2 bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
            <AlertTriangle className="w-3 h-3" /> Low ({stock})
          </div>
        )}
        {outOfStock && (
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center">
            <span className="text-white text-xs font-bold bg-black/60 px-2.5 py-1 rounded-full">Out of Stock</span>
          </div>
        )}
        {hasCustomPrice && (
          <div className="absolute top-2 right-2 bg-purple-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm flex items-center gap-1">
            <Tag className="w-2.5 h-2.5" /> Special Rate
          </div>
        )}
      </div>

      <div className="p-3 flex-1 flex flex-col justify-between space-y-2">
        <div
          onClick={() => !outOfStock && qty === 0 && onAdd(product)}
          className={!outOfStock && qty === 0 ? 'cursor-pointer' : ''}
        >
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
          <p className="text-sm font-bold text-gray-900 leading-tight mt-1 line-clamp-2">{product.name}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">
            {outOfStock ? 'Out of stock' : `${stock} ${product.unit} available`}
          </p>
        </div>

        <div>
          <div className="flex items-baseline gap-1.5 mb-2">
            <span className="text-base font-black text-green-700">
              {formatCurrency(product.effective_price)}
            </span>
            {hasCustomPrice && (
              <span className="text-xs text-gray-400 line-through">
                {formatCurrency(product.default_price)}
              </span>
            )}
          </div>

          <div>
            {outOfStock ? (
              <div className="w-full py-2 bg-gray-100 text-gray-400 text-xs font-bold rounded-xl text-center">
                Out of Stock
              </div>
            ) : qty === 0 ? (
              /* Easy 1-Tap Add to Cart Button */
              <button
                type="button"
                onClick={() => onAdd(product)}
                className="w-full py-2 sm:py-2.5 px-2 sm:px-3 bg-green-600 hover:bg-green-700 active:bg-green-800 active:scale-95 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-xs transition"
              >
                <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
                <span>Add to Cart</span>
              </button>
            ) : (
              /* In-Cart Controls with Direct Manual Number Input */
              <div className="flex items-center justify-between gap-1 bg-green-50 rounded-xl p-1 border border-green-300">
                <button
                  type="button"
                  onClick={() => onRemove(product)}
                  className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg bg-white shadow-2xs hover:bg-red-50 text-red-500 transition-colors active:scale-95 shrink-0"
                  title="Decrease"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <input
                  type="number"
                  min="0"
                  max={stock}
                  value={qty}
                  onChange={(e) => onSetQty(product, e.target.value)}
                  className="w-full min-w-0 h-7 sm:h-8 text-center font-black text-xs sm:text-sm bg-white rounded-lg border border-green-200 focus:outline-none focus:ring-1 focus:ring-green-500 text-gray-900"
                  title="Type quantity (e.g. 5, 10, 15)"
                />
                <button
                  type="button"
                  onClick={() => qty < stock && onAdd(product)}
                  disabled={qty >= stock}
                  className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg bg-green-600 hover:bg-green-700 text-white transition-colors disabled:opacity-40 active:scale-95 shrink-0"
                  title="Add / Increase"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// LIST / LIGHT VIEW ROW (High Density for Fast Scanning)
function ProductRow({ product, qty, onAdd, onRemove, onSetQty }) {
  const stock = Number(product.stock_quantity)
  const outOfStock = stock <= 0
  const hasCustomPrice = product.customer_price !== null && Number(product.customer_price) !== Number(product.default_price)
  const inCart = qty > 0

  return (
    <div className={`bg-white rounded-2xl border p-2.5 sm:p-3 shadow-xs flex items-center justify-between gap-2 sm:gap-3 transition-all ${
      outOfStock
        ? 'opacity-60 border-gray-100'
        : inCart
        ? 'border-green-500 ring-2 ring-green-100 bg-green-50/10'
        : 'border-gray-100 hover:border-green-300'
    }`}>
      {/* Thumbnail & Info */}
      <div
        onClick={() => !outOfStock && qty === 0 && onAdd(product)}
        className={`flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1 ${
          !outOfStock && qty === 0 ? 'cursor-pointer' : ''
        }`}
      >
        <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-gray-50 border border-gray-100 overflow-hidden flex-shrink-0 relative">
          <img
            src={product.image_url || PLACEHOLDER}
            alt={product.name}
            className="w-full h-full object-cover"
            onError={e => { e.target.src = PLACEHOLDER }}
          />
          {inCart && (
            <div className="absolute inset-0 bg-green-600/20 flex items-center justify-center">
              <span className="w-2.5 h-2.5 rounded-full bg-green-600" />
            </div>
          )}
          {hasCustomPrice && (
            <div className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-purple-600" title="Special Rate" />
          )}
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="text-xs sm:text-sm font-bold text-gray-900 truncate leading-tight">{product.name}</p>
            {product.pack_size && (
              <span className="text-[10px] font-semibold text-green-700 bg-green-50 px-1.5 py-0.5 rounded">
                {product.pack_size}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs text-gray-400 mt-0.5">
            <span>{product.category_name || 'Dairy'}</span>
            <span>•</span>
            <span className={product.is_low_stock && !outOfStock ? 'text-amber-600 font-semibold' : outOfStock ? 'text-red-500 font-semibold' : ''}>
              {outOfStock ? 'Out of stock' : `Stock: ${stock} ${product.unit}`}
            </span>
          </div>
        </div>
      </div>

      {/* Price & Action */}
      <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
        <div className="text-right">
          <p className="text-xs sm:text-sm font-bold text-green-700">{formatCurrency(product.effective_price)}</p>
          {hasCustomPrice && (
            <span className="text-[10px] text-gray-400 line-through block">
              {formatCurrency(product.default_price)}
            </span>
          )}
        </div>

        {outOfStock ? (
          <span className="text-[11px] sm:text-xs text-red-500 font-semibold px-2 py-1 bg-red-50 rounded-lg">
            Out of stock
          </span>
        ) : qty === 0 ? (
          <button
            type="button"
            onClick={() => onAdd(product)}
            className="px-3 sm:px-4 py-1.5 sm:py-2 bg-green-600 hover:bg-green-700 active:bg-green-800 active:scale-95 text-white text-xs font-bold rounded-xl flex items-center gap-1 shadow-xs transition"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Add</span>
          </button>
        ) : (
          <div className="flex items-center gap-1 bg-green-50 rounded-xl p-1 border border-green-300">
            <button
              type="button"
              onClick={() => onRemove(product)}
              className="w-7 h-7 flex items-center justify-center rounded-lg bg-white shadow-2xs text-red-500 hover:bg-red-50 active:scale-95 shrink-0"
              title="Decrease"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <input
              type="number"
              min="0"
              max={stock}
              value={qty}
              onChange={(e) => onSetQty(product, e.target.value)}
              className="w-10 sm:w-12 h-7 text-center font-black text-xs bg-white rounded-lg border border-green-200 focus:outline-none focus:ring-1 focus:ring-green-500 text-gray-900"
              title="Type quantity"
            />
            <button
              type="button"
              onClick={() => qty < stock && onAdd(product)}
              disabled={qty >= stock}
              className="w-7 h-7 flex items-center justify-center rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-40 active:scale-95 shrink-0"
              title="Add / Increase"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function CustomerPOSPage() {
  const { customerId } = useParams()
  const navigate = useNavigate()
  const [cart, setCart] = useState({}) // { productId: quantity }
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('ALL')
  const [viewMode, setViewMode] = useState('grid') // 'grid' | 'list'

  // Customer data
  const { data: customer, isLoading: loadingCustomer } = useQuery({
    queryKey: ['customer', customerId],
    queryFn: () => customersApi.get(customerId).then(r => r.data),
  })

  const realCustomerId = customer?.id || customerId

  // Customer effective products (with customer pricing applied)
  const { data: products = [], isLoading: loadingProducts } = useQuery({
    queryKey: ['customer-products', realCustomerId],
    queryFn: () => pricingApi.getCustomerProducts(realCustomerId).then(r => r.data),
    enabled: !!customer?.id || !isNaN(Number(customerId)),
  })

  // Categories list
  const { data: catsData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => productsApi.categories().then(r => r.data),
  })
  const categories = Array.isArray(catsData) ? catsData : (catsData?.results || [])

  const addToCart = (product) => {
    setCart(c => ({ ...c, [product.id]: (c[product.id] || 0) + 1 }))
  }

  const setQuantityInCart = (product, quantity) => {
    setCart(c => {
      if (quantity === '' || quantity === null) {
        return { ...c, [product.id]: '' }
      }
      const num = Number(quantity)
      if (isNaN(num) || num <= 0) {
        const { [product.id]: _, ...rest } = c
        return rest
      }
      const maxStock = Number(product.stock_quantity || 999999)
      return { ...c, [product.id]: Math.min(num, maxStock) }
    })
  }

  const removeFromCart = (product) => {
    setCart(c => {
      const newQty = (c[product.id] || 0) - 1
      if (newQty <= 0) {
        const { [product.id]: _, ...rest } = c
        return rest
      }
      return { ...c, [product.id]: newQty }
    })
  }

  const clearCart = () => setCart({})

  // Filter products by category and search
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesCategory = selectedCategory === 'ALL' || p.category_name === selectedCategory
      const matchesSearch = !search ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.sku && p.sku.toLowerCase().includes(search.toLowerCase())) ||
        (p.pack_size && p.pack_size.toLowerCase().includes(search.toLowerCase()))
      return matchesCategory && matchesSearch
    })
  }, [products, selectedCategory, search])

  const cartItems = products
    .filter(p => Number(cart[p.id]) > 0)
    .map(p => ({ product: p, quantity: Number(cart[p.id]) }))

  const cartCount = Object.values(cart).reduce((a, b) => a + Number(b || 0), 0)
  const cartTotal = cartItems.reduce(
    (sum, item) => sum + item.quantity * Number(item.product.effective_price),
    0
  )

  const handleViewBill = () => {
    if (cartCount === 0) return
    navigate('/pos/bill', { state: { customer, cartItems } })
  }

  if (loadingCustomer) return <PageLoader />

  return (
    <div className="flex flex-col lg:flex-row h-full max-w-7xl mx-auto">
      {/* Left: Product Catalog */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header Bar (Switch Customer button removed as back arrow changes customer) */}
        <div className="flex items-center justify-between gap-3 px-4 py-3 bg-white border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => navigate('/pos')}
              className="p-2 rounded-xl hover:bg-gray-100 transition-colors text-gray-600 shrink-0"
              title="Change Customer"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-base font-bold text-gray-900 truncate">{customer?.name}</p>
                <Badge variant="purple" className="text-[10px] hidden sm:inline-flex">
                  {customer?.customer_type}
                </Badge>
              </div>
              <p className="text-xs text-gray-500 truncate">
                {customer?.customer_code} {customer?.phone && `· ${customer.phone}`}
              </p>
            </div>
          </div>
        </div>

        {/* Filters, Search Bar & Grid/List View Mode Toggle */}
        <div className="p-3 bg-white border-b border-gray-100 space-y-2.5 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search products in parlour catalog..."
                className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-gray-200 bg-gray-50/50 hover:bg-white focus:bg-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500 transition"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Grid vs Light/List View Mode Toggle */}
            <div className="flex items-center bg-gray-100/80 p-1 rounded-xl flex-shrink-0 border border-gray-200/60">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === 'grid' ? 'bg-emerald-50 text-emerald-800 shadow-xs border border-emerald-200/80' : 'text-gray-500 hover:text-gray-900'
                }`}
                title="Grid View"
              >
                <LayoutGrid className="w-4 h-4" />
                <span className="hidden sm:inline">Grid</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === 'list' ? 'bg-emerald-50 text-emerald-800 shadow-xs border border-emerald-200/80' : 'text-gray-500 hover:text-gray-900'
                }`}
                title="Light / List View"
              >
                <List className="w-4 h-4" />
                <span className="hidden sm:inline">List</span>
              </button>
            </div>
          </div>

          {/* Category Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
            <button
              onClick={() => setSelectedCategory('ALL')}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-colors ${
                selectedCategory === 'ALL'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/90 shadow-2xs'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              All Categories ({products.length})
            </button>
            {categories.map(c => (
              <button
                key={c.id}
                onClick={() => setSelectedCategory(c.name)}
                className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-colors ${
                  selectedCategory === c.name
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/90 shadow-2xs'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>

        {/* Product Catalog Display (Grid View OR Light/List View) */}
        <div className="flex-1 overflow-y-auto p-4 pb-36 lg:pb-6">
          {loadingProducts ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
              {[...Array(8)].map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-16 space-y-2">
              <Store className="w-10 h-10 text-gray-300 mx-auto" />
              <p className="text-sm font-semibold text-gray-600">No products found</p>
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="text-xs text-green-600 font-semibold hover:underline"
                >
                  Clear search query
                </button>
              )}
            </div>
          ) : viewMode === 'grid' ? (
            /* Grid View */
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
              {filteredProducts.map(p => (
                <ProductCard
                  key={p.id}
                  product={p}
                  qty={cart[p.id] || 0}
                  onAdd={addToCart}
                  onRemove={removeFromCart}
                  onSetQty={setQuantityInCart}
                />
              ))}
            </div>
          ) : (
            /* Light / List View */
            <div className="space-y-2 max-w-3xl">
              {filteredProducts.map(p => (
                <ProductRow
                  key={p.id}
                  product={p}
                  qty={cart[p.id] || 0}
                  onAdd={addToCart}
                  onRemove={removeFromCart}
                  onSetQty={setQuantityInCart}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Desktop Cart Sidebar */}
      <aside className="hidden lg:flex flex-col w-80 xl:w-96 bg-white border-l border-gray-100 flex-shrink-0 h-full">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-green-600" />
            <h2 className="font-bold text-gray-900 text-base">Current Bill</h2>
          </div>
          {cartCount > 0 && (
            <button
              onClick={clearCart}
              className="text-xs text-red-500 hover:text-red-700 font-medium flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" /> Clear
            </button>
          )}
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cartCount === 0 ? (
            <div className="text-center py-12 text-gray-400 space-y-2">
              <ShoppingCart className="w-8 h-8 mx-auto text-gray-300" />
              <p className="text-sm">Cart is empty</p>
              <p className="text-xs">Click on any product to add it to the bill</p>
            </div>
          ) : (
            cartItems.map(({ product, quantity }) => (
              <div
                key={product.id}
                className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-gray-50 border border-gray-100"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900 truncate leading-tight">{product.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {formatCurrency(product.effective_price)} × {quantity}
                  </p>
                </div>

                <div className="flex items-center gap-1 bg-white rounded-xl border border-gray-200 p-1">
                  <button
                    onClick={() => removeFromCart(product)}
                    className="w-6 h-6 flex items-center justify-center rounded text-gray-600 hover:bg-gray-100"
                    title="Decrease"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <input
                    type="number"
                    min="0"
                    max={product.stock_quantity}
                    value={quantity}
                    onChange={(e) => setQuantityInCart(product, e.target.value)}
                    className="w-10 text-center font-bold text-xs text-gray-900 border-0 focus:ring-1 focus:ring-green-500 rounded bg-gray-50 py-0.5"
                    title="Type quantity directly (e.g. 10, 15)"
                  />
                  <button
                    onClick={() => quantity < product.stock_quantity && addToCart(product)}
                    disabled={quantity >= product.stock_quantity}
                    className="w-6 h-6 flex items-center justify-center rounded text-gray-600 hover:bg-gray-100 disabled:opacity-40"
                    title="Increase"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>

                <span className="text-sm font-bold text-gray-900 min-w-[50px] text-right">
                  {formatCurrency(quantity * Number(product.effective_price))}
                </span>
              </div>
            ))
          )}
        </div>

        {/* Sidebar Footer with Total & Checkout */}
        <div className="p-4 border-t border-gray-100 bg-white space-y-3 shadow-xs">
          <div className="space-y-1.5 text-xs text-gray-600">
            <div className="flex justify-between">
              <span>Items Total ({cartCount})</span>
              <span className="font-semibold text-gray-900">{formatCurrency(cartTotal)}</span>
            </div>
            <div className="flex justify-between text-base font-bold text-gray-900 pt-1.5 border-t border-gray-100">
              <span>Payable</span>
              <span className="text-green-700">{formatCurrency(cartTotal)}</span>
            </div>
          </div>

          <Button
            disabled={cartCount === 0}
            onClick={handleViewBill}
            className="w-full py-3.5 text-sm font-bold shadow-md"
          >
            Review & Complete Bill →
          </Button>
        </div>
      </aside>

      {/* Mobile / Tablet Floating Cart Bar */}
      {cartCount > 0 && (
        <div className="lg:hidden fixed bottom-14 md:bottom-4 left-0 md:left-64 right-0 md:right-4 z-30 p-2.5 sm:p-3 max-w-xl md:mx-auto">
          <button
            onClick={handleViewBill}
            className="w-full bg-green-600 hover:bg-green-700 active:bg-green-800 text-white font-bold py-3.5 rounded-2xl flex items-center justify-between px-4 sm:px-5 transition-all shadow-xl active:scale-[0.99] border border-green-500/30"
          >
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
                <span className="text-xs font-bold">{cartCount}</span>
              </div>
              <span className="text-xs sm:text-sm font-semibold">{cartCount} item{cartCount !== 1 ? 's' : ''}</span>
            </div>
            <span className="text-xs sm:text-sm tracking-wide font-extrabold uppercase">Review Bill →</span>
            <span className="text-sm sm:text-base font-black">{formatCurrency(cartTotal)}</span>
          </button>
        </div>
      )}

      {/* Mobile Floating Button for Switching Customer */}
  
    </div>
  )
}
