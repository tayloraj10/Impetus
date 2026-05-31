interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'green' | 'amber' | 'blue' | 'red' | 'purple'
  size?: 'sm' | 'md'
}

const variants = {
  default: 'bg-zinc-800 text-zinc-300 border-zinc-700',
  green: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  amber: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  blue: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  red: 'bg-red-500/10 text-red-400 border-red-500/30',
  purple: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
}

export function Badge({ children, variant = 'default', size = 'sm' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center border rounded-full font-medium tracking-wide uppercase ${
      size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-3 py-1 text-xs'
    } ${variants[variant]}`}>
      {children}
    </span>
  )
}
