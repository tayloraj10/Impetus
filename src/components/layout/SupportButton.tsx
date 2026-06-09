import { useEffect, useRef, useState } from 'react'
import { SUPPORT_EMAIL } from '../../config/app'

export function SupportButton() {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onOutsideClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    function onEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onOutsideClick)
    document.addEventListener('keydown', onEscape)
    return () => {
      document.removeEventListener('mousedown', onOutsideClick)
      document.removeEventListener('keydown', onEscape)
    }
  }, [open])

  useEffect(() => {
    if (!open) setCopied(false)
  }, [open])

  async function copySupportEmail() {
    try {
      await navigator.clipboard.writeText(SUPPORT_EMAIL)
    } catch {
      const input = document.createElement('textarea')
      input.value = SUPPORT_EMAIL
      input.style.position = 'fixed'
      input.style.opacity = '0'
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      document.body.removeChild(input)
    }
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div ref={ref} className="relative mt-1.5">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-label="Contact support"
        aria-expanded={open}
        className={`transition-colors cursor-pointer shrink-0 ${open ? 'text-zinc-300' : 'text-zinc-600 hover:text-zinc-400'}`}
      >
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50 w-max max-w-[calc(100vw-2rem)] rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2.5 shadow-xl">
          <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500 whitespace-nowrap">
            Contact support
          </p>
          <div className="mt-1.5 flex items-center gap-2">
            <span className="text-sm text-zinc-100 whitespace-nowrap">{SUPPORT_EMAIL}</span>
            <button
              type="button"
              onClick={copySupportEmail}
              className={`shrink-0 rounded border px-2 py-0.5 text-xs lowercase transition-colors cursor-pointer ${
                copied
                  ? 'border-emerald-500/40 text-emerald-400'
                  : 'border-zinc-600 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200'
              }`}
            >
              {copied ? 'copied' : 'copy'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
