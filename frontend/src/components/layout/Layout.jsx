import { useState, useRef, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import {
  LayoutDashboard, ShoppingCart, Users, Package, Warehouse,
  Receipt, Clock, UserCog, BarChart2, Settings, LogOut, Store,
  Menu, X, MoreHorizontal, CreditCard, Search, User
} from 'lucide-react'
import { cn } from '../../lib/utils'
import { NandiniLogo } from '../ui/NandiniLogo'
import { LiveDateTime } from '../ui/LiveDateTime'
import { NotificationBell } from './NotificationBell'

function TopSearchBar({ autoFocus = false, onSearchDone = null, className = '' }) {
  const [query, setQuery] = useState('')
  const inputRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus()
    }
  }, [autoFocus])

  const handleSearch = (e) => {
    e.preventDefault()
    const q = query.trim()
    if (!q) return
    if (onSearchDone) onSearchDone()
    if (q.toUpperCase().startsWith('INV-')) {
      navigate(`/sales?bill_number=${encodeURIComponent(q)}`)
    } else if (q.toUpperCase().startsWith('CUST-')) {
      navigate(`/customers/${encodeURIComponent(q)}`)
    } else if (/^\d+$/.test(q) && q.length >= 4) {
      navigate(`/customers?search=${encodeURIComponent(q)}`)
    } else {
      navigate(`/sales?search=${encodeURIComponent(q)}`)
    }
  }

  return (
    <form onSubmit={handleSearch} className={cn("flex-1 max-w-md mx-2 sm:mx-6 relative", className)}>
      <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search bills (INV-...), phone, customers..."
        className="w-full pl-9 pr-8 py-1.5 sm:py-2 text-xs bg-gray-50/90 hover:bg-gray-100/70 focus:bg-white rounded-xl border border-gray-200/80 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition text-gray-800 placeholder-gray-400 shadow-2xs"
      />
      {query && (
        <button
          type="button"
          onClick={() => setQuery('')}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
          title="Clear search"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </form>
  )
}

function RoundProfileMenu({ user, onLogout }) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef(null)
  const initial = user?.full_name?.[0]?.toUpperCase() || (user?.is_owner ? 'O' : 'E')

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="relative w-9 h-9 rounded-full ring-2 ring-emerald-500/30 hover:ring-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-black text-sm flex items-center justify-center transition shadow-2xs cursor-pointer active:scale-95"
        title={`${user?.full_name || 'Profile'} (${user?.is_owner ? 'Owner' : 'Cashier'})`}
        aria-label="User Profile Menu"
      >
        <span>{initial} </span>
       
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-gray-100 py-2.5 px-3 z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
            <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 font-black text-base flex items-center justify-center ring-2 ring-emerald-200 shrink-0">
              {initial}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-gray-900 truncate leading-tight">{user?.full_name}</p>
              <p className="text-[11px] text-gray-400 truncate">{user?.phone || user?.username}</p>
           
            </div>
          </div>

          <div className="py-2 space-y-1">
            <NavLink
              to="/settings"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-gray-700 hover:bg-emerald-50/70 hover:text-emerald-900 transition"
            >
              <Settings className="w-4 h-4 text-gray-400" />
              <span>Profile & Settings</span>
            </NavLink>
          </div>

          <div className="pt-2 border-t border-gray-100">
            <button
              onClick={() => {
                setOpen(false)
                onLogout()
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 transition"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

const ownerNav = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/pos', icon: ShoppingCart, label: 'POS' },
  { to: '/shift', icon: Clock, label: 'My Shift' },
  { to: '/pending-bills', icon: Receipt, label: 'Pending Bills' },
  { to: '/credit', icon: CreditCard, label: 'Credit' },
  { to: '/customers', icon: Users, label: 'Customers' },
  { to: '/products', icon: Package, label: 'Products' },
  { to: '/inventory', icon: Warehouse, label: 'Inventory' },
  { to: '/sales', icon: Receipt, label: 'Sales' },
  { to: '/shifts', icon: Clock, label: 'All Shifts' },
  { to: '/employees', icon: UserCog, label: 'Employees' },
  { to: '/reports', icon: BarChart2, label: 'Reports' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

const employeeNav = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/pos', icon: ShoppingCart, label: 'POS' },
  { to: '/pending-bills', icon: CreditCard, label: 'Pending Bills' },
  { to: '/customers', icon: Users, label: 'Customers' },
  { to: '/sales', icon: Receipt, label: 'Bills' },
  { to: '/shift', icon: Clock, label: 'My Shift' },
  { to: '/settings', icon: Settings, label: 'Profile' },
]

export function OwnerLayout({ children }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false)
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Desktop Sidebar (Left side, clean w-60) */}
      <aside className="hidden md:flex flex-col w-56 lg:w-60 bg-white border-r border-gray-200/80 flex-shrink-0 z-30 shadow-sm">
        {/* Brand Header with Nandini Logo */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <NandiniLogo size="md" />
        </div>

        {/* Sidebar Nav Items */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {ownerNav.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => cn(
                'flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all',
                isActive
                  ? 'bg-emerald-50 text-emerald-800 font-bold border border-emerald-200/90 shadow-2xs'
                  : 'text-gray-600 hover:bg-emerald-50/50 hover:text-emerald-900'
              )}
            >
              {({ isActive }) => (
                <>
                  <Icon className={cn("w-4 h-4 flex-shrink-0", isActive ? "text-emerald-700" : "text-gray-400")} />
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User Card & Logout */}
        <div className="p-3 border-t border-gray-100 bg-gray-50/60">
          <div className="flex items-center gap-2.5 px-2 py-1.5 mb-2">
            <div className="w-8 h-8 bg-green-100 text-green-800 font-bold rounded-full flex items-center justify-center flex-shrink-0 text-xs">
              {user?.full_name?.[0]?.toUpperCase() || 'O'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-gray-900 truncate leading-tight">{user?.full_name}</p>
              <span className="text-[10px] font-semibold text-green-700 bg-green-100/80 px-1.5 py-0.5 rounded">
                Owner
              </span>
            </div>
            <NavLink
              to="/settings"
              title="Settings"
              className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            >
              <Settings className="w-4 h-4" />
            </NavLink>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 transition-colors w-full border border-red-100"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Desktop Top Header: Context on Left, Top Search Bar, Notification + Time + Profile Menu on Right */}
        <header className="hidden md:flex items-center justify-between px-4 lg:px-6 py-2.5 bg-white border-b border-gray-200/80 flex-shrink-0 z-20">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span className="text-xs font-bold text-gray-700 uppercase tracking-wider truncate">
              Nandini Milk Parlour
            </span>
          </div>

          {/* Top Search Bar */}
          <TopSearchBar />

          {/* Right Header: Notification + Time to right side + Round Profile Section */}
          <div className="flex items-center gap-3 shrink-0">
            <NotificationBell />
            <LiveDateTime />
            <div className="h-5 w-px bg-gray-200" />
            <RoundProfileMenu user={user} onLogout={handleLogout} />
          </div>
        </header>

        {/* Mobile Header: Drawer Hamburger on Left, Logo, Search + Notification + Profile on Right */}
        <header className="md:hidden flex items-center justify-between px-3 sm:px-4 py-2 bg-white border-b border-gray-200/80 flex-shrink-0 z-20 shadow-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMobileDrawerOpen(true)}
              className="p-2 -ml-1 rounded-xl text-gray-700 hover:bg-gray-100 active:scale-95 transition"
              title="Open Menu"
              aria-label="Open Navigation Drawer"
            >
              <Menu className="w-5 h-5" />
            </button>
            <NandiniLogo size="sm" showSubtitle={false} />
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setMobileSearchOpen(prev => !prev)}
              className={cn(
                "p-2 rounded-xl text-gray-600 hover:bg-gray-100 active:scale-95 transition",
                mobileSearchOpen && "bg-emerald-50 text-emerald-800"
              )}
              title="Search bills & customers"
              aria-label="Search"
            >
              <Search className="w-4 h-4" />
            </button>
            <NotificationBell />
            <RoundProfileMenu user={user} onLogout={handleLogout} />
          </div>
        </header>

        {/* Expandable Mobile Search Bar */}
        {mobileSearchOpen && (
          <div className="md:hidden px-3 py-2 bg-gray-50 border-b border-gray-200/90 flex-shrink-0 z-10 animate-in slide-in-from-top duration-150 shadow-2xs">
            <TopSearchBar
              autoFocus
              onSearchDone={() => setMobileSearchOpen(false)}
              className="w-full max-w-none mx-0"
            />
          </div>
        )}

        {/* Scrollable Main Children */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden pb-24 md:pb-6">
          {children}
        </main>

        {/* Mobile Bottom Navigation Bar (High z-index, touch-friendly) */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-200 z-40 shadow-lg px-1 py-1">
          <div className="flex items-center justify-around">
            <NavLink
              to="/dashboard"
              className={({ isActive }) => cn(
                'flex-1 flex flex-col items-center justify-center py-1.5 rounded-xl text-[11px] font-bold transition-all min-h-[44px]',
                isActive ? 'text-emerald-800 bg-emerald-50/90' : 'text-gray-500 hover:text-gray-900'
              )}
            >
              <LayoutDashboard className="w-5 h-5 mb-0.5" />
              <span>Dashboard</span>
            </NavLink>
            <NavLink
              to="/pos"
              className={({ isActive }) => cn(
                'flex-1 flex flex-col items-center justify-center py-1.5 rounded-xl text-[11px] font-bold transition-all min-h-[44px]',
                isActive ? 'text-emerald-800 bg-emerald-50/90' : 'text-gray-500 hover:text-gray-900'
              )}
            >
              <ShoppingCart className="w-5 h-5 mb-0.5" />
              <span>POS</span>
            </NavLink>
            <NavLink
              to="/customers"
              className={({ isActive }) => cn(
                'flex-1 flex flex-col items-center justify-center py-1.5 rounded-xl text-[11px] font-bold transition-all min-h-[44px]',
                isActive ? 'text-emerald-800 bg-emerald-50/90' : 'text-gray-500 hover:text-gray-900'
              )}
            >
              <Users className="w-5 h-5 mb-0.5" />
              <span>Customers</span>
            </NavLink>
            <NavLink
              to="/inventory"
              className={({ isActive }) => cn(
                'flex-1 flex flex-col items-center justify-center py-1.5 rounded-xl text-[11px] font-bold transition-all min-h-[44px]',
                isActive ? 'text-emerald-800 bg-emerald-50/90' : 'text-gray-500 hover:text-gray-900'
              )}
            >
              <Warehouse className="w-5 h-5 mb-0.5" />
              <span>Stock</span>
            </NavLink>
            <button
              type="button"
              onClick={() => setMobileDrawerOpen(true)}
              className="flex-1 flex flex-col items-center justify-center py-1.5 rounded-xl text-[11px] font-bold text-gray-500 hover:text-gray-900 transition-all min-h-[44px]"
            >
              <MoreHorizontal className="w-5 h-5 mb-0.5" />
              <span>More</span>
            </button>
          </div>
        </nav>
      </div>

      {/* Mobile Side Drawer Navigation */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileDrawerOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-white shadow-2xl flex flex-col z-50 animate-in slide-in-from-left duration-200">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <NandiniLogo size="sm" />
              <button
                onClick={() => setMobileDrawerOpen(false)}
                className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 border-b border-gray-100 bg-gray-50/70 flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 text-green-800 font-bold rounded-2xl flex items-center justify-center text-sm shrink-0">
                {user?.full_name?.[0]?.toUpperCase() || 'O'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-900 truncate">{user?.full_name}</p>
                <span className="text-[10px] font-bold text-green-800 bg-green-100 px-2 py-0.5 rounded-full">
                  Owner
                </span>
              </div>
            </div>

            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
              {ownerNav.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={() => setMobileDrawerOpen(false)}
                  className={({ isActive }) => cn(
                    'flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-semibold transition-all min-h-[44px]',
                    isActive
                      ? 'bg-emerald-50 text-emerald-800 font-bold border border-emerald-200/90 shadow-2xs'
                      : 'text-gray-600 hover:bg-emerald-50/50 hover:text-emerald-900'
                  )}
                >
                  {({ isActive }) => (
                    <>
                      <Icon className={cn("w-4 h-4 flex-shrink-0", isActive ? "text-emerald-700" : "text-gray-400")} />
                      <span>{label}</span>
                    </>
                  )}
                </NavLink>
              ))}
            </nav>

            <div className="p-4 border-t border-gray-100 bg-gray-50/50">
              <button
                onClick={handleLogout}
                className="flex items-center justify-center gap-2 px-3 py-3 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 transition-colors w-full border border-red-200 min-h-[44px]"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </aside>
        </div>
      )}
    </div>
  )
}

export function EmployeeLayout({ children }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false)
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Desktop Left Sidebar for Employee (w-56 to w-60) */}
      <aside className="hidden md:flex flex-col w-56 lg:w-60 bg-white border-r border-gray-200/80 flex-shrink-0 z-30 shadow-sm">
        {/* Brand Header with Shop Logo */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <NandiniLogo size="md" />
        </div>

        {/* Sidebar Nav Items */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {employeeNav.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => cn(
                'flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all',
                isActive
                  ? 'bg-emerald-50 text-emerald-800 font-bold border border-emerald-200/90 shadow-2xs'
                  : 'text-gray-600 hover:bg-emerald-50/50 hover:text-emerald-900'
              )}
            >
              {({ isActive }) => (
                <>
                  <Icon className={cn("w-4 h-4 flex-shrink-0", isActive ? "text-emerald-700" : "text-gray-400")} />
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Cashier Info & Logout at bottom of Left Sidebar */}
        <div className="p-3 border-t border-gray-100 bg-gray-50/60">
          <div className="flex items-center gap-2.5 px-2 py-1.5 mb-2">
            <div className="w-8 h-8 bg-green-100 text-green-800 font-bold rounded-full flex items-center justify-center flex-shrink-0 text-xs">
              {user?.full_name?.[0]?.toUpperCase() || 'E'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-gray-900 truncate leading-tight">{user?.full_name}</p>
              <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100/80 px-1.5 py-0.5 rounded">
                Cashier
              </span>
            </div>
            <NavLink
              to="/settings"
              title="Change Password"
              className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            >
              <Settings className="w-4 h-4" />
            </NavLink>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 transition-colors w-full border border-red-100"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Header: Drawer Hamburger on Left, Logo, Search + Notification + Profile on Right */}
        <header className="md:hidden flex items-center justify-between px-3 sm:px-4 py-2 bg-white border-b border-gray-200/80 flex-shrink-0 z-20 shadow-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMobileDrawerOpen(true)}
              className="p-2 -ml-1 rounded-xl text-gray-700 hover:bg-gray-100 active:scale-95 transition"
              title="Open Menu"
              aria-label="Open Navigation Drawer"
            >
              <Menu className="w-5 h-5" />
            </button>
            <NandiniLogo size="sm" showSubtitle={false} />
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setMobileSearchOpen(prev => !prev)}
              className={cn(
                "p-2 rounded-xl text-gray-600 hover:bg-gray-100 active:scale-95 transition",
                mobileSearchOpen && "bg-emerald-50 text-emerald-800"
              )}
              title="Search bills & customers"
              aria-label="Search"
            >
              <Search className="w-4 h-4" />
            </button>
            <NotificationBell />
            <RoundProfileMenu user={user} onLogout={handleLogout} />
          </div>
        </header>

        {/* Expandable Mobile Search Bar */}
        {mobileSearchOpen && (
          <div className="md:hidden px-3 py-2 bg-gray-50 border-b border-gray-200/90 flex-shrink-0 z-10 animate-in slide-in-from-top duration-150 shadow-2xs">
            <TopSearchBar
              autoFocus
              onSearchDone={() => setMobileSearchOpen(false)}
              className="w-full max-w-none mx-0"
            />
          </div>
        )}

        {/* Desktop Top Header: Title on Left, Top Search Bar, Notification + LiveDateTime + Profile on Right */}
        <header className="hidden md:flex items-center justify-between px-4 lg:px-6 py-2.5 bg-white border-b border-gray-200/80 flex-shrink-0 z-20">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span className="text-xs font-bold text-gray-700 uppercase tracking-wider truncate">
              Nandini Milk Parlour
            </span>
          </div>

          {/* Top Search Bar */}
          <TopSearchBar />

          {/* Right Header: Notification + Time to right side + Round Profile Section */}
          <div className="flex items-center gap-3 shrink-0">
            <NotificationBell />
            <LiveDateTime />
            <div className="h-5 w-px bg-gray-200" />
            <RoundProfileMenu user={user} onLogout={handleLogout} />
          </div>
        </header>

        {/* Scrollable Main Children */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden pb-24 md:pb-6">
          {children}
        </main>

        {/* Mobile Fixed Bottom Navigation */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-200 z-40 shadow-lg px-1 py-1">
          <div className="flex items-center justify-around">
            <NavLink
              to="/dashboard"
              className={({ isActive }) => cn(
                'flex-1 flex flex-col items-center justify-center py-1.5 rounded-xl text-[11px] font-bold transition-all min-h-[44px]',
                isActive ? 'text-emerald-800 bg-emerald-50/90' : 'text-gray-500 hover:text-gray-900'
              )}
            >
              <LayoutDashboard className="w-5 h-5 mb-0.5" />
              <span>Dashboard</span>
            </NavLink>
            <NavLink
              to="/pos"
              className={({ isActive }) => cn(
                'flex-1 flex flex-col items-center justify-center py-1.5 rounded-xl text-[11px] font-bold transition-all min-h-[44px]',
                isActive ? 'text-emerald-800 bg-emerald-50/90' : 'text-gray-500 hover:text-gray-900'
              )}
            >
              <ShoppingCart className="w-5 h-5 mb-0.5" />
              <span>POS</span>
            </NavLink>
            <NavLink
              to="/pending-bills"
              className={({ isActive }) => cn(
                'flex-1 flex flex-col items-center justify-center py-1.5 rounded-xl text-[11px] font-bold transition-all min-h-[44px]',
                isActive ? 'text-emerald-800 bg-emerald-50/90' : 'text-gray-500 hover:text-gray-900'
              )}
            >
              <CreditCard className="w-5 h-5 mb-0.5" />
              <span>Pending</span>
            </NavLink>
            <NavLink
              to="/sales"
              className={({ isActive }) => cn(
                'flex-1 flex flex-col items-center justify-center py-1.5 rounded-xl text-[11px] font-bold transition-all min-h-[44px]',
                isActive ? 'text-emerald-800 bg-emerald-50/90' : 'text-gray-500 hover:text-gray-900'
              )}
            >
              <Receipt className="w-5 h-5 mb-0.5" />
              <span>Bills</span>
            </NavLink>
            <button
              type="button"
              onClick={() => setMobileDrawerOpen(true)}
              className="flex-1 flex flex-col items-center justify-center py-1.5 rounded-xl text-[11px] font-bold text-gray-500 hover:text-gray-900 transition-all min-h-[44px]"
            >
              <MoreHorizontal className="w-5 h-5 mb-0.5" />
              <span>More</span>
            </button>
          </div>
        </nav>
      </div>

      {/* Mobile Drawer for Employee */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileDrawerOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-white shadow-2xl flex flex-col z-50 animate-in slide-in-from-left duration-200">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <NandiniLogo size="sm" />
              <button
                onClick={() => setMobileDrawerOpen(false)}
                className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 border-b border-gray-100 bg-gray-50/70 flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 text-green-800 font-bold rounded-2xl flex items-center justify-center text-sm shrink-0">
                {user?.full_name?.[0]?.toUpperCase() || 'E'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-900 truncate">{user?.full_name}</p>
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                  Cashier
                </span>
              </div>
            </div>

            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
              {employeeNav.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={() => setMobileDrawerOpen(false)}
                  className={({ isActive }) => cn(
                    'flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-semibold transition-all min-h-[44px]',
                    isActive
                      ? 'bg-emerald-50 text-emerald-800 font-bold border border-emerald-200/90 shadow-2xs'
                      : 'text-gray-600 hover:bg-emerald-50/50 hover:text-emerald-900'
                  )}
                >
                  {({ isActive }) => (
                    <>
                      <Icon className={cn("w-4 h-4 flex-shrink-0", isActive ? "text-emerald-700" : "text-gray-400")} />
                      <span>{label}</span>
                    </>
                  )}
                </NavLink>
              ))}
            </nav>

            <div className="p-4 border-t border-gray-100 bg-gray-50/50">
              <button
                onClick={handleLogout}
                className="flex items-center justify-center gap-2 px-3 py-3 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 transition-colors w-full border border-red-200 min-h-[44px]"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </aside>
        </div>
      )}
    </div>
  )
}
