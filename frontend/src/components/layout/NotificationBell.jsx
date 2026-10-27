import { useState, useRef, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Bell, AlertTriangle, Clock, CheckCircle2, X } from 'lucide-react'
import { dashboardApi, shiftsApi } from '../../api'

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const menuRef = useRef(null)

  // Fetch low stock count and today metrics
  const { data: dashboardData } = useQuery({
    queryKey: ['notifications-dashboard'],
    queryFn: () => dashboardApi.today().then(r => r.data).catch(() => null),
    refetchInterval: 30000,
  })

  // Fetch current active shift
  const { data: currentShift } = useQuery({
    queryKey: ['notifications-shift'],
    queryFn: () => shiftsApi.current().then(r => r.data).catch(() => null),
    refetchInterval: 30000,
  })

  const lowStockCount = dashboardData?.low_stock_count || 0
  const hasNotifications = lowStockCount > 0 || !currentShift

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        className="relative p-2 rounded-xl text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors"
        title="Notifications"
        aria-label="View notifications"
      >
        <Bell className="w-4 h-4" />
        {hasNotifications && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-500 ring-2 ring-white animate-pulse" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 sm:w-88 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden animate-in fade-in duration-150">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50/70">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-green-700" />
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wide">Notifications & Alerts</h3>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-200/60"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="p-3 space-y-2 max-h-80 overflow-y-auto text-xs">
            {/* Low stock alert */}
            {lowStockCount > 0 ? (
              <Link
                to="/inventory"
                onClick={() => setOpen(false)}
                className="flex items-start gap-2.5 p-2.5 rounded-xl bg-amber-50/80 border border-amber-200 hover:bg-amber-100/80 transition-colors"
              >
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-amber-900">Low Stock Alert</p>
                  <p className="text-amber-800 text-[11px] mt-0.5">
                    {lowStockCount} product{lowStockCount !== 1 ? 's are' : ' is'} below minimum threshold. Tap to view and replenish stock.
                  </p>
                </div>
              </Link>
            ) : (
              <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-green-50/60 border border-green-100 text-green-800">
                <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                <p className="text-[11px] font-medium">All products have healthy inventory levels.</p>
              </div>
            )}

            {/* Shift alert */}
            {currentShift ? (
              <Link
                to="/shift"
                onClick={() => setOpen(false)}
                className="flex items-start gap-2.5 p-2.5 rounded-xl bg-gray-50 border border-gray-100 hover:bg-gray-100 transition-colors"
              >
                <Clock className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="font-bold text-gray-900">{currentShift.shift_name}</p>
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  </div>
                  <p className="text-gray-500 text-[11px] mt-0.5">
                    Active session: {currentShift.shift_start_time} – {currentShift.shift_end_time}
                  </p>
                </div>
              </Link>
            ) : (
              <Link
                to="/shift"
                onClick={() => setOpen(false)}
                className="flex items-start gap-2.5 p-2.5 rounded-xl bg-blue-50/70 border border-blue-200 hover:bg-blue-100/70 transition-colors"
              >
                <Clock className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-blue-900">Counter Shift Inactive</p>
                  <p className="text-blue-800 text-[11px] mt-0.5">
                    No active shift open. Start your shift before processing sales.
                  </p>
                </div>
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

