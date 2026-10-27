import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { dashboardApi } from '../../api'

export function NandiniLogo({ size = 'md', className = '', showSubtitle = true, customLogo = null }) {
  const isSm = size === 'sm'
  const isLg = size === 'lg'

  // Fetch store info from backend (shared across owner & employee)
  const { data: serverStoreInfo } = useQuery({
    queryKey: ['store-info'],
    queryFn: () => dashboardApi.getStoreInfo().then(r => r.data).catch(() => null),
    staleTime: 60000,
  })

  const [localInfo, setLocalInfo] = useState(() => {
    try {
      const saved = localStorage.getItem('nandini_store_info')
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })

  useEffect(() => {
    const handleStorage = () => {
      try {
        const saved = localStorage.getItem('nandini_store_info')
        setLocalInfo(saved ? JSON.parse(saved) : null)
      } catch {}
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  // Sync server store info to local state if available
  useEffect(() => {
    if (serverStoreInfo) {
      setLocalInfo(serverStoreInfo)
      try {
        localStorage.setItem('nandini_store_info', JSON.stringify(serverStoreInfo))
      } catch {}
    }
  }, [serverStoreInfo])

  const store = serverStoreInfo || localInfo
  const logoSrc = customLogo || store?.shopLogo
  const shopName = store?.parlourName || 'Nandini Milk'
  const subTitle = store?.subBranch || 'KMF Official'

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {logoSrc ? (
        <div className={`relative rounded-2xl overflow-hidden border border-green-200 shadow-xs flex-shrink-0 bg-white flex items-center justify-center p-0.5 ${
          isSm ? 'w-8 h-8' : isLg ? 'w-12 h-12' : 'w-10 h-10'
        }`}>
          <img src={logoSrc} alt="Shop Logo" className="w-full h-full object-contain rounded-xl" />
        </div>
      ) : (
        /* Nandini Blue-Green-White Shield / Emblem */
        <div className={`relative flex items-center justify-center rounded-2xl bg-gradient-to-br from-blue-700 via-blue-600 to-green-600 shadow-sm flex-shrink-0 ${
          isSm ? 'w-8 h-8' : isLg ? 'w-12 h-12' : 'w-10 h-10'
        }`}>
          <svg
            viewBox="0 0 40 40"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={isSm ? 'w-5 h-5' : isLg ? 'w-7 h-7' : 'w-6 h-6'}
          >
            <circle cx="20" cy="20" r="17" stroke="#ffffff" strokeOpacity="0.3" strokeWidth="1.5" strokeDasharray="3 2" />
            <path
              d="M12 14C12 11.5 15 10 20 10C25 10 28 11.5 28 14C28 15.5 27 17 25 18C23.5 18.8 22 20 22 22V24H18V22C18 20 16.5 18.8 15 18C13 17 12 15.5 12 14Z"
              fill="#ffffff"
            />
            <path
              d="M20 22C17 26 15 28 15 30C15 32.76 17.24 35 20 35C22.76 35 25 32.76 25 30C25 28 23 26 20 22Z"
              fill="#4ade80"
            />
            <circle cx="18.5" cy="29.5" r="1.5" fill="#ffffff" />
          </svg>
        </div>
      )}

      <div className="leading-tight min-w-0">
        <span className={`font-black tracking-tight text-gray-900 truncate block ${
          isSm ? 'text-sm' : isLg ? 'text-xl' : 'text-base'
        }`}>
          {shopName}
        </span>
        {showSubtitle && (
          <span className="text-[10px] font-bold text-green-700 tracking-wide uppercase truncate block">
            {subTitle}
          </span>
        )}
      </div>
    </div>
  )
}
