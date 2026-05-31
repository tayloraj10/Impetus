import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  children: ReactNode
}

const variants = {
  primary: 'bg-emerald-500 hover:bg-emerald-400 text-black font-semibold',
  secondary: 'bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700',
  ghost: 'hover:bg-zinc-800 text-zinc-300 hover:text-zinc-100',
  danger: 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30',
}

const sizes = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
}

export function Button({ variant = 'primary', size = 'md', className = '', children, ...props }: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center gap-2 rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
