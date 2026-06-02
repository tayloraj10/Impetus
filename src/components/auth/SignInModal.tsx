import { useState, useRef, useEffect } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import {
  signInWithGoogle, signInWithEmail, createAccountWithEmail,
  createPhoneVerifier, sendPhoneOTP, confirmPhoneOTP, updateDisplayName,
  sendEmailSignInLink,
} from '../../services/authService'
import type { RecaptchaVerifier, ConfirmationResult } from '../../services/authService'
import { useAuth } from '../../hooks/useAuth'

interface Props {
  open: boolean
  onClose: () => void
}

type Step = 'main' | 'phone' | 'otp' | 'profile' | 'email-link' | 'email-link-confirm'
type Tab = 'signin' | 'register'

function friendlyError(code: string): string {
  switch (code) {
    case 'auth/wrong-password':
    case 'auth/invalid-credential': return 'Incorrect email or password'
    case 'auth/user-not-found': return 'No account found with this email'
    case 'auth/email-already-in-use': return 'An account with this email already exists'
    case 'auth/weak-password': return 'Password must be at least 6 characters'
    case 'auth/invalid-email': return 'Invalid email address'
    case 'auth/invalid-verification-code': return 'Incorrect verification code'
    case 'auth/invalid-phone-number': return 'Invalid phone number — include country code (e.g. +1)'
    case 'auth/too-many-requests': return 'Too many attempts. Try again later'
    case 'auth/popup-closed-by-user': return ''
    default: return 'Something went wrong. Try again'
  }
}

function formatUSPhone(digits: string): string {
  if (digits.length <= 3) return digits
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
}

export function SignInModal({ open, onClose }: Props) {
  const [tab, setTab] = useState<Tab>('signin')
  const [step, setStep] = useState<Step>('main')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const [phoneDigits, setPhoneDigits] = useState('')
  const [otp, setOtp] = useState('')
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(null)
  const verifierRef = useRef<RecaptchaVerifier | null>(null)
  const recaptchaContainerRef = useRef<HTMLDivElement>(null)

  const [profileName, setProfileName] = useState('')
  const [linkEmail, setLinkEmail] = useState('')
  const [linkSent, setLinkSent] = useState(false)
  const [confirmEmail, setConfirmEmail] = useState('')

  const { user, emailLinkPending, completeEmailLink } = useAuth()

  // When modal opens and there's a pending email link, jump straight to confirm step
  useEffect(() => {
    if (open && emailLinkPending) {
      setStep('email-link-confirm')
    }
  }, [open, emailLinkPending])

  // Create the RecaptchaVerifier when the phone step becomes active.
  // Do NOT call render() — signInWithPhoneNumber calls verifier.verify() internally,
  // which handles reCAPTCHA execution. Calling render() manually causes a
  // "reCAPTCHA has already been rendered" crash in React StrictMode (double-invoke).
  useEffect(() => {
    if (step !== 'phone' || !recaptchaContainerRef.current) return
    const verifier = createPhoneVerifier(recaptchaContainerRef.current)
    verifierRef.current = verifier
    return () => {
      verifier.clear()
      verifierRef.current = null
    }
  }, [step])

  useEffect(() => {
    if (!open) {
      verifierRef.current?.clear()
      verifierRef.current = null
    }
  }, [open])

  function reset() {
    setTab('signin')
    setStep('main')
    setError('')
    setLoading(false)
    setName('')
    setEmail('')
    setPassword('')
    setPhoneDigits('')
    setOtp('')
    setConfirmation(null)
    setProfileName('')
    setLinkEmail('')
    setLinkSent(false)
    setConfirmEmail('')
    verifierRef.current?.clear()
    verifierRef.current = null
  }

  function handleClose() {
    reset()
    onClose()
  }

  async function handleGoogleSignIn() {
    setLoading(true)
    setError('')
    try {
      await signInWithGoogle()
      handleClose()
    } catch (e: any) {
      const msg = friendlyError(e.code)
      if (msg) setError(msg)
      setLoading(false)
    }
  }

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      if (tab === 'signin') {
        await signInWithEmail(email, password)
      } else {
        await createAccountWithEmail(email, password, name.trim())
      }
      handleClose()
    } catch (e: any) {
      setError(friendlyError(e.code))
      setLoading(false)
    }
  }

  async function handleSendOTP(e: React.FormEvent) {
    e.preventDefault()
    if (!verifierRef.current) return
    setLoading(true)
    setError('')
    try {
      const result = await sendPhoneOTP(`+1${phoneDigits}`, verifierRef.current)
      setConfirmation(result)
      setStep('otp')
    } catch (e: any) {
      // reCAPTCHA can't be reused after a failed attempt — create a fresh verifier
      // (no render() call — signInWithPhoneNumber handles that on the next attempt)
      verifierRef.current?.clear()
      verifierRef.current = null
      if (recaptchaContainerRef.current) {
        verifierRef.current = createPhoneVerifier(recaptchaContainerRef.current)
      }
      setError(friendlyError(e.code) || e.message || 'Failed to send code')
    } finally {
      setLoading(false)
    }
  }

  async function handleVerifyOTP(e: React.FormEvent) {
    e.preventDefault()
    if (!confirmation) return
    setLoading(true)
    setError('')
    try {
      const signedInUser = await confirmPhoneOTP(confirmation, otp)
      if (!signedInUser.displayName) {
        setStep('profile')
        setLoading(false)
      } else {
        handleClose()
      }
    } catch (e: any) {
      setError(friendlyError(e.code))
      setLoading(false)
    }
  }

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault()
    if (!user || !profileName.trim()) return
    setLoading(true)
    setError('')
    try {
      await updateDisplayName(user, profileName.trim())
      handleClose()
    } catch (e: any) {
      setError(e.message || 'Failed to save')
      setLoading(false)
    }
  }

  async function handleSendEmailLink(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await sendEmailSignInLink(linkEmail)
      setLinkSent(true)
    } catch (e: any) {
      setError(friendlyError(e.code))
    } finally {
      setLoading(false)
    }
  }

  async function handleConfirmEmailLink(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await completeEmailLink(confirmEmail)
      handleClose()
    } catch (e: any) {
      setError(friendlyError(e.code))
      setLoading(false)
    }
  }

  const modalTitle =
    step === 'phone' ? 'Sign in with phone'
    : step === 'otp' ? 'Enter your code'
    : step === 'profile' ? 'One last thing'
    : step === 'email-link' ? 'Email sign-in link'
    : step === 'email-link-confirm' ? 'Confirm your email'
    : tab === 'signin' ? 'Sign in'
    : 'Create an account'

  const inputClass = 'w-full bg-zinc-800 border border-zinc-700 hover:border-zinc-600 focus:border-emerald-500 rounded-lg px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none transition-colors'

  return (
    <Modal open={open} onClose={handleClose} title={modalTitle}>
      {step === 'main' && (
        <div className="space-y-5">
          <div className="flex rounded-lg bg-zinc-800 p-1 gap-1">
            {(['signin', 'register'] as Tab[]).map(t => (
              <button
                key={t}
                onClick={() => { setTab(t); setError('') }}
                className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-all cursor-pointer ${
                  tab === t
                    ? 'bg-zinc-700 text-zinc-100 shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {t === 'signin' ? 'Sign in' : 'Create account'}
              </button>
            ))}
          </div>

          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-zinc-600 text-sm text-zinc-200 transition-all cursor-pointer disabled:opacity-50"
          >
            <GoogleIcon />
            Continue with Google
          </button>

          <div className="relative flex items-center gap-3">
            <div className="flex-1 h-px bg-zinc-800" />
            <span className="text-xs text-zinc-600 shrink-0">or</span>
            <div className="flex-1 h-px bg-zinc-800" />
          </div>

          <form onSubmit={handleEmailSubmit} className="space-y-3">
            {tab === 'register' && (
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Your name"
                required
                className={inputClass}
              />
            )}
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Email address"
              required
              className={inputClass}
            />
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Password"
              required
              minLength={6}
              className={inputClass}
            />
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <Button type="submit" className="w-full justify-center" disabled={loading}>
              {loading ? 'Loading…' : tab === 'signin' ? 'Sign in' : 'Create account'}
            </Button>
          </form>

          <div className="flex flex-col items-center gap-2">
            <button
              onClick={() => { setStep('email-link'); setError('') }}
              className="text-sm text-zinc-500 hover:text-emerald-400 transition-colors cursor-pointer"
            >
              Sign in without a password (email link)
            </button>
            <button
              onClick={() => { setStep('phone'); setError('') }}
              className="text-sm text-zinc-500 hover:text-emerald-400 transition-colors cursor-pointer"
            >
              Use phone number
            </button>
          </div>
        </div>
      )}

      {step === 'phone' && (
        <form onSubmit={handleSendOTP} className="space-y-4">
          <p className="text-sm text-zinc-400">
            We'll send a 6-digit verification code via SMS.
          </p>
          <div className="flex items-center bg-zinc-800 border border-zinc-700 hover:border-zinc-600 focus-within:border-emerald-500 rounded-lg overflow-hidden transition-colors">
            <span className="px-3 text-sm text-zinc-400 border-r border-zinc-700 select-none shrink-0">+1</span>
            <input
              type="tel"
              value={formatUSPhone(phoneDigits)}
              onChange={e => setPhoneDigits(e.target.value.replace(/\D/g, '').slice(0, 10))}
              placeholder="(555) 000-0000"
              required
              autoFocus
              inputMode="numeric"
              className="flex-1 bg-transparent px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none"
            />
          </div>
          <div ref={recaptchaContainerRef} />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <div className="flex gap-3">
            <Button type="button" variant="secondary" onClick={() => { setStep('main'); setError('') }}>
              Back
            </Button>
            <Button type="submit" className="flex-1 justify-center" disabled={loading || phoneDigits.length < 10}>
              {loading ? 'Sending…' : 'Send code'}
            </Button>
          </div>
        </form>
      )}

      {step === 'otp' && (
        <form onSubmit={handleVerifyOTP} className="space-y-4">
          <p className="text-sm text-zinc-400">
            Enter the 6-digit code sent to <span className="text-zinc-200">+1 {formatUSPhone(phoneDigits)}</span>.
          </p>
          <input
            type="text"
            value={otp}
            onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="000000"
            required
            inputMode="numeric"
            autoFocus
            className={`${inputClass} text-center text-2xl font-mono tracking-[0.35em] placeholder-zinc-700`}
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <Button type="submit" className="w-full justify-center" disabled={loading || otp.length < 6}>
            {loading ? 'Verifying…' : 'Verify'}
          </Button>
          <div className="text-center">
            <button
              type="button"
              onClick={() => { setStep('phone'); setOtp(''); setPhoneDigits(''); setError('') }}
              className="text-sm text-zinc-500 hover:text-emerald-400 transition-colors cursor-pointer"
            >
              Wrong number? Go back
            </button>
          </div>
        </form>
      )}

      {step === 'profile' && (
        <form onSubmit={handleProfileSave} className="space-y-4">
          <p className="text-sm text-zinc-400">What should we call you?</p>
          <input
            type="text"
            value={profileName}
            onChange={e => setProfileName(e.target.value)}
            placeholder="Your name"
            required
            autoFocus
            className={inputClass}
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <Button type="submit" className="w-full justify-center" disabled={loading || !profileName.trim()}>
            {loading ? 'Saving…' : 'Continue'}
          </Button>
        </form>
      )}

      {step === 'email-link' && !linkSent && (
        <form onSubmit={handleSendEmailLink} className="space-y-4">
          <p className="text-sm text-zinc-400">
            Enter your email and we'll send you a one-click sign-in link — no password needed.
          </p>
          <input
            type="email"
            value={linkEmail}
            onChange={e => setLinkEmail(e.target.value)}
            placeholder="Email address"
            required
            autoFocus
            className={inputClass}
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <div className="flex gap-3">
            <Button type="button" variant="secondary" onClick={() => { setStep('main'); setError('') }}>
              Back
            </Button>
            <Button type="submit" className="flex-1 justify-center" disabled={loading}>
              {loading ? 'Sending…' : 'Send sign-in link'}
            </Button>
          </div>
        </form>
      )}

      {step === 'email-link' && linkSent && (
        <div className="space-y-4 text-center">
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto">
            <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <p className="text-zinc-100 font-medium">Check your inbox</p>
            <p className="text-sm text-zinc-400 mt-1">
              We sent a sign-in link to <span className="text-zinc-200">{linkEmail}</span>.
              Click it to sign in — the link expires in 1 hour.
            </p>
          </div>
          <p className="text-xs text-zinc-600">
            Open the link in this browser for the best experience.
          </p>
          <Button variant="ghost" size="sm" onClick={handleClose} className="mx-auto">
            Close
          </Button>
        </div>
      )}

      {step === 'email-link-confirm' && (
        <form onSubmit={handleConfirmEmailLink} className="space-y-4">
          <p className="text-sm text-zinc-400">
            To finish signing in, enter the email address you used to request the link.
          </p>
          <input
            type="email"
            value={confirmEmail}
            onChange={e => setConfirmEmail(e.target.value)}
            placeholder="Email address"
            required
            autoFocus
            className={inputClass}
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <Button type="submit" className="w-full justify-center" disabled={loading || !confirmEmail}>
            {loading ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
      )}
    </Modal>
  )
}

function GoogleIcon() {
  return (
    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  )
}
