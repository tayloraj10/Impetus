import { useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { Modal } from './Modal'

export const MODERATION_REASONS = [
  'Spam or self-promotion',
  'Inaccurate or misleading',
  'Inappropriate content',
  'Duplicate submission',
  'Broken link or outdated',
  'Does not fit this topic',
  'Other',
] as const

const SELECT_CLASS = 'w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500 transition-colors'

interface Props {
  onSoftDelete: (userId: string, displayName: string, reason: string) => Promise<void>
  onHardDelete?: () => Promise<void>
}

export function ModerateButtons({ onSoftDelete, onHardDelete }: Props) {
  const { user } = useAuth()
  const [modalOpen, setModalOpen] = useState(false)
  const [reason, setReason] = useState<string>(MODERATION_REASONS[0])
  const [otherText, setOtherText] = useState('')
  const [softWorking, setSoftWorking] = useState(false)
  const [hardConfirm, setHardConfirm] = useState(false)
  const [hardWorking, setHardWorking] = useState(false)

  function openModal(e: React.MouseEvent) {
    e.stopPropagation()
    setReason(MODERATION_REASONS[0])
    setOtherText('')
    setModalOpen(true)
  }

  function closeModal() {
    if (softWorking) return
    setModalOpen(false)
  }

  async function handleConfirm() {
    const finalReason = reason === 'Other' ? (otherText.trim() || 'Other') : reason
    setSoftWorking(true)
    try {
      await onSoftDelete(user?.uid ?? '', user?.displayName ?? 'Admin', finalReason)
      setModalOpen(false)
    } finally {
      setSoftWorking(false)
    }
  }

  async function handleHard(e: React.MouseEvent) {
    e.stopPropagation()
    if (!hardConfirm) { setHardConfirm(true); return }
    setHardWorking(true)
    try { await onHardDelete!() } finally { setHardWorking(false); setHardConfirm(false) }
  }

  const canConfirm = reason !== 'Other' || otherText.trim().length > 0

  return (
    <>
      <Modal open={modalOpen} onClose={closeModal} title="Remove content">
        <div className="space-y-4">
          <p className="text-sm text-zinc-400">
            Select a reason — this will be shown to the submitter.
          </p>
          <div>
            <label className="block text-xs text-zinc-400 mb-1.5">Reason</label>
            <select value={reason} onChange={e => setReason(e.target.value)} className={SELECT_CLASS}>
              {MODERATION_REASONS.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          {reason === 'Other' && (
            <div>
              <label className="block text-xs text-zinc-400 mb-1.5">Details</label>
              <textarea
                rows={2}
                value={otherText}
                onChange={e => setOtherText(e.target.value)}
                placeholder="Describe the reason..."
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 resize-none transition-colors"
              />
            </div>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <button
              onClick={closeModal}
              disabled={softWorking}
              className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sm text-zinc-300 font-medium transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={softWorking || !canConfirm}
              className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-sm text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {softWorking ? 'Removing…' : 'Remove'}
            </button>
          </div>
        </div>
      </Modal>

      <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
        <button
          onClick={openModal}
          disabled={hardWorking}
          title="Remove (hidden, recoverable)"
          className="text-xs px-2 py-0.5 rounded transition-colors cursor-pointer disabled:opacity-50 text-zinc-600 hover:text-amber-400"
        >
          Remove
        </button>
        {onHardDelete && (
          <button
            onClick={handleHard}
            disabled={softWorking || hardWorking}
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
    </>
  )
}
