import { cn } from '../../lib/utils'

export function Button({ className, variant = 'primary', size = 'md', children, ...props }) {
  const base = 'inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2'
  const variants = {
    primary: 'bg-green-600 hover:bg-green-700 active:bg-green-800 text-white focus:ring-green-500',
    secondary: 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 focus:ring-gray-300',
    danger: 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500',
    ghost: 'hover:bg-gray-100 text-gray-700 focus:ring-gray-300',
    outline: 'border border-green-600 text-green-600 hover:bg-green-50 focus:ring-green-500',
  }
  const sizes = {
    sm: 'px-3 py-1.5 text-sm min-h-[36px]',
    md: 'px-4 py-2.5 text-sm min-h-[44px]',
    lg: 'px-6 py-3 text-base min-h-[52px]',
    xl: 'px-8 py-4 text-lg min-h-[60px]',
  }
  return (
    <button className={cn(base, variants[variant], sizes[size], className)} {...props}>
      {children}
    </button>
  )
}
