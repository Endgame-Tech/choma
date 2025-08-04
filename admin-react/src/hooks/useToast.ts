import { useState, useCallback } from 'react'

export interface ToastConfig {
  message: string
  type: 'success' | 'error' | 'warning' | 'info'
  duration?: number
}

export interface Toast extends ToastConfig {
  id: string
}

export const useToast = () => {
  const [toasts, setToasts] = useState<Toast[]>([])

  const showToast = useCallback((config: ToastConfig) => {
    const id = Date.now().toString()
    const toast: Toast = {
      ...config,
      id,
      duration: config.duration || 3000
    }

    setToasts(prev => [...prev, toast])

    // Auto-remove toast after duration
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, toast.duration + 300) // Add 300ms for fade-out animation
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }, [])

  const success = useCallback((message: string, duration?: number) => {
    showToast({ message, type: 'success', duration })
  }, [showToast])

  const error = useCallback((message: string, duration?: number) => {
    showToast({ message, type: 'error', duration })
  }, [showToast])

  const warning = useCallback((message: string, duration?: number) => {
    showToast({ message, type: 'warning', duration })
  }, [showToast])

  const info = useCallback((message: string, duration?: number) => {
    showToast({ message, type: 'info', duration })
  }, [showToast])

  return {
    toasts,
    showToast,
    removeToast,
    success,
    error,
    warning,
    info
  }
}