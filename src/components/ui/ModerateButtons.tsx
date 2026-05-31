import { useState } from 'react'
import { useAuth } from '../../hooks/useAuth'

interface Props {
  onSoftDelete: (userId: string, displayName: string) => Promise<void>
  onHardDelete?: () => Promise<void>
}

export function ModerateButtons({ onSoftDelete, onHardDelete }: Props) {
  const { user } = useAuth()
  const [softConfirm, setSoftConfirm] = useState(false)
  const [softWorking, setSoftWorking] = useState(false)
  const [hardConfirm, setHardConfirm] = useState(false)
  const [hardWorking, setHardWorking] = useState(false)

  async function handleSoft(e: React.MouseEvent) {
    e.stopPropagation()
    if (!softConfirm) { setSoftConfirm(true); setHardConfirm(false); return }
    setSoftWorking(true)
    try {
      await onSoftDelete(user?.uid ?? '', user?.displayName ?? 'Admin')
    } finally {
      setSoftWorking(false)
      setSoftConfirm(false)
    }
  }

  async function handleHard(e: React.MouseEvent) {
    e.stopPropagation()
    if (!hardConfirm) { setHardConfirm(true); setSoftConfirm(false); return }
    setHardWorking(true)
    try { await onHardDelete!() } finally { setHardWorking(false); setHardConfirm(false) }
  }

  const busy = softWorking || hardWorking

  return (
    <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
      <button
        onClick={handleSoft}
        disabled={busy}
        onBlur={() => setSoftConfirm(false)}
        title="Remove (hidden, recoverable)"
        className={`text-xs px-2 py-0.5 rounded transition-colors cursor-pointer disabled:opacity-50 ${
          softConfirm
            ? 'text-amber-400 bg-amber-500/10 border border-amber-700'
            : 'text-zinc-600 hover:text-amber-400'
        }`}
      >
        {softWorking ? '…' : softConfirm ? 'Confirm?' : 'Remove'}
      </button>
      {onHardDelete && (
        <button
          onClick={handleHard}
          disabled={busy}
          onBlur={() => setHardConfirm(false)}
          title="Delete permanently"
          className={`text-xs px-2 py-0.5 rounded transition-colors cursor-pointer disabled:opacity-50 ${
            hardConfirm
              ? 'text-red-400 bg-red-500/10 border border-red-700'
              : 'text-zinc-600 hover:text-red-400'
          }`}
        >
          {hardWorking ? '…' : hardConfirm ? 'Confirm?' : 'Delete'}
        </button>
      )}
    </div>
  )
}
