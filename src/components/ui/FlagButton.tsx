import { useEffect, useRef, useState } from 'react'

const FLAG_REASONS = [
  { value: 'inaccurate', label: 'Inaccurate information' },
  { value: 'broken_link', label: 'Broken or dead link' },
  { value: 'spam', label: 'Spam or irrelevant' },
  { value: 'duplicate', label: 'Duplicate entry' },
  { value: 'other', label: 'Other' },
]

interface FlagButtonProps {
  flagged: boolean
  onFlag: (reason: string) => void
  onUnflag: () => void
  canFlag: boolean
}

function FlagIcon({ filled }: { filled: boolean }) {
  return (
    <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 20 20" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v14M3 3l14 5-14 5V3z" />
    </svg>
  )
}

export function FlagButton({ flagged, onFlag, onUnflag, canFlag }: FlagButtonProps) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('inaccurate')
  const [otherText, setOtherText] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onOutsideClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onOutsideClick)
    return () => document.removeEventListener('mousedown', onOutsideClick)
  }, [open])

  if (flagged) {
    return (
      <button
        onClick={e => { e.preventDefault(); e.stopPropagation(); onUnflag() }}
        className="flex items-center gap-1 text-xs text-amber-500 hover:text-amber-400 cursor-pointer transition-colors select-none shrink-0"
      >
        <FlagIcon filled />
        <span>Reported</span>
        <span className="text-amber-700 hover:text-amber-500">· Undo</span>
      </button>
    )
  }

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        onClick={e => {
          e.preventDefault()
          e.stopPropagation()
          if (canFlag) setOpen(o => !o)
        }}
        title={canFlag ? 'Report this' : 'Sign in to report'}
        className={`flex items-center gap-1 text-xs transition-colors select-none ${
          open
            ? 'text-amber-400 cursor-pointer'
            : canFlag
            ? 'text-zinc-600 hover:text-amber-500 cursor-pointer'
            : 'text-zinc-700 cursor-default'
        }`}
      >
        <FlagIcon filled={false} />
      </button>

      {open && (
        <div
          className="absolute right-0 bottom-full mb-2 w-52 bg-zinc-900 border border-zinc-700 rounded-xl p-3 shadow-2xl z-30"
          onClick={e => e.stopPropagation()}
        >
          <p className="text-xs text-zinc-400 font-medium mb-2">Reason for reporting</p>
          <select
            value={reason}
            onChange={e => { setReason(e.target.value); setOtherText('') }}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-amber-500 transition-colors"
          >
            {FLAG_REASONS.map(r => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
          {reason === 'other' && (
            <input
              type="text"
              value={otherText}
              onChange={e => setOtherText(e.target.value)}
              placeholder="Please describe the issue..."
              maxLength={200}
              className="w-full mt-2 bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-amber-500 transition-colors"
            />
          )}
          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={() => setOpen(false)}
              className="flex-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors py-1 cursor-pointer"
            >
              Cancel
            </button>
            <button
              disabled={reason === 'other' && !otherText.trim()}
              onClick={() => { onFlag(reason === 'other' ? `other: ${otherText.trim()}` : reason); setOpen(false) }}
              className="flex-1 text-xs bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 transition-colors rounded-lg py-1 font-medium cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Report
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
