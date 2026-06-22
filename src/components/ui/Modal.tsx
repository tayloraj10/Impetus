import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  size?: 'md' | 'lg'
  /** Highlights the modal card with an amber outline — use to flag unsaved changes. */
  dirty?: boolean
}

export function Modal({ open, onClose, title, children, size = 'md', dirty = false }: ModalProps) {
  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" onClick={e => e.stopPropagation()}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative z-10 w-full ${size === 'lg' ? 'max-w-2xl' : 'max-w-lg'} bg-zinc-900 border rounded-2xl shadow-2xl flex flex-col max-h-[90vh] transition-colors ${
        dirty ? 'border-amber-500 shadow-amber-500/10' : 'border-zinc-800'
      }`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 flex-shrink-0">
          <h2 className="text-lg font-semibold text-zinc-100">{title}</h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-100 transition-colors text-xl leading-none cursor-pointer"
          >
            ×
          </button>
        </div>
        <div className="px-6 py-5 overflow-y-auto">{children}</div>
      </div>
    </div>,
    document.body,
  )
}
