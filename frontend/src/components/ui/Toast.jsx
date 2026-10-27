import { useEffect } from 'react'
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react'
import { useToasts } from '../../hooks/useToast'
import { cn } from '../../lib/utils'

const icons = {
  success: <CheckCircle className="w-5 h-5 text-green-500" />,
  error: <AlertCircle className="w-5 h-5 text-red-500" />,
  info: <Info className="w-5 h-5 text-blue-500" />,
}

export function ToastContainer() {
  const toasts = useToasts()
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map(t => (
        <div key={t.id} className={cn(
          'flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border bg-white pointer-events-auto',
          'animate-in slide-in-from-right-4 duration-200',
          t.type === 'error' ? 'border-red-200' : t.type === 'info' ? 'border-blue-200' : 'border-green-200'
        )}>
          {icons[t.type] || icons.success}
          <span className="text-sm font-medium text-gray-800 flex-1">{t.message}</span>
        </div>
      ))}
    </div>
  )
}
