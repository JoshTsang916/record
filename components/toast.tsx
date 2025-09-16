"use client"
import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'

type ToastItem = {
  id: string
  message: string
  actionLabel?: string
  onAction?: () => void
  duration?: number
}

const ToastCtx = createContext<{
  show: (t: Omit<ToastItem, 'id'>) => void
} | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const timers = useRef<Map<string, any>>(new Map())

  const show = useCallback((t: Omit<ToastItem, 'id'>) => {
    const id = Math.random().toString(36).slice(2)
    const item: ToastItem = { id, duration: 3000, ...t }
    setItems(prev => [...prev, item])
    const to = setTimeout(() => {
      setItems(prev => prev.filter(x => x.id !== id))
      timers.current.delete(id)
    }, item.duration)
    timers.current.set(id, to)
  }, [])

  const ctx = useMemo(() => ({ show }), [show])

  return (
    <ToastCtx.Provider value={ctx}>
      {children}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2">
        {items.map(it => (
          <div key={it.id} className="rounded-md border border-gray-200 bg-white/95 dark:bg-gray-900/95 dark:border-gray-800 shadow px-3 py-2 text-sm flex items-center gap-3">
            <div className="max-w-[60vw] break-words whitespace-pre-wrap">{it.message}</div>
            {it.actionLabel && it.onAction && (
              <button className="text-blue-600 dark:text-blue-400 underline text-xs" onClick={() => { it.onAction?.(); setItems(prev => prev.filter(x => x.id !== it.id)) }}>
                {it.actionLabel}
              </button>
            )}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastCtx)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

