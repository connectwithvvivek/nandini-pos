import { useState, useCallback } from 'react'

const toasts = []
let listeners = []

function notify() {
  listeners.forEach(fn => fn([...toasts]))
}

export function addToast(message, type = 'success') {
  const id = Date.now()
  toasts.push({ id, message, type })
  notify()
  setTimeout(() => {
    const idx = toasts.findIndex(t => t.id === id)
    if (idx !== -1) { toasts.splice(idx, 1); notify() }
  }, 3500)
}

import { useEffect, useRef } from 'react'

export function useToasts() {
  const [items, setItems] = useState([...toasts])
  useEffect(() => {
    listeners.push(setItems)
    return () => { listeners = listeners.filter(l => l !== setItems) }
  }, [])
  return items
}
