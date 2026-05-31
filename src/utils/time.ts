export function formatTimeAgo(ts: Date): string {
  const ms = Date.now() - ts.getTime()
  const mins = Math.floor(ms / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return ts.toLocaleDateString()
}

export function formatDate(ts: Date): string {
  return ts.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
