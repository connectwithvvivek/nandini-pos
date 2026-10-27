import { useState, useEffect } from 'react'
import { Calendar, Clock } from 'lucide-react'

export function LiveDateTime({ className = '', showSeconds = true }) {
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const dateStr = time.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

  const timeStr = time.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: showSeconds ? '2-digit' : undefined,
    hour12: true,
  })

  return (
    <div className={`inline-flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-gray-50 border border-gray-200/80 text-xs text-gray-700 font-medium ${className}`}>
      <div className="flex items-center gap-1.5 text-gray-600">
        <Calendar className="w-3.5 h-3.5 text-green-600" />
        <span>{dateStr}</span>
      </div>
      <span className="text-gray-300">|</span>
      <div className="flex items-center gap-1.5 font-mono text-gray-900 font-semibold">
        <Clock className="w-3.5 h-3.5 text-green-600 animate-pulse" />
        <span>{timeStr}</span>
      </div>
    </div>
  )
}

