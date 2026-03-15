'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'

type Mode = 'login' | 'signup'
const MAX_ATTEMPTS  = 5
const BLOCK_MINUTES = 15

export default function AuthPage() {
  const router   = useRouter()
  const supabase = createClient()

  const [mode,       setMode]       = useState<Mode>('login')
  const [firstname,  setFirstname]  = useState('')
  const [lastname,   setLastname]   = useState('')
  const [username,   setUsername]   = useState('')
  const [password,   setPassword]   = useState('')
  const [showPass,   setShowPass]   = useState(false)
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState('')
  const [success,    setSuccess]    = useState('')
  const [attempts,   setAttempts]   = useState(0)
  const [isBlocked,  setIsBlocked]  = useState(false)
  const [blockTimer, setBlockTimer] = useState(0)
  const [fading,     setFading]     = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Fake email yasash: username@autotest.uz
  const fakeEmail = (u: string) => `${u.trim().toLowerCase()}@autotest.uz`

  // Block countdown timer
  useEffect(() => {
    if (!isBlocked) return
    setBlockTimer(BLOCK_MINUTES * 60)
    timerRef.current = setInterval(() => {
      setBlockTimer(t => {
        if (t <= 1) {
          setIsBlocked(false)
          setAttempts(0)
          clearInterval(timerRef.current!)
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [isBlocked])

  function fmt(s: number) {
    return `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`
  }

  function switchMode(next: Mode) {
    if (fading || mode === next) return
    setFading(true)
    setTimeout(() => {
      setMode(next)
      setError('')
      setSuccess('')
      setFading(false)
    }, 160)
  }

  // --- Attempt helpers (server-side route orqali) ---
  async function checkBlocked(u: string): Promise<boolean> {
    const res = await fetch('/api/auth-attempts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'check', email: fakeEmail(u) }),
    })
    const d = await res.json()
    if (d.isBlocked) { setIsBlocked(true); setAttempts(d.attempts) }
    return d.isBlocked
  }

  async function recordFail(u: string) {
    const res = await fetch('/api/auth-attempts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'record', email: fakeEmail(u) }),
    })
    const d = await res.json()
    setAttempts(d.attempts)
    if (d.isBlocked) setIsBlocked(true)
  }

  async function clearAttempts(u: string) {
    await fetch('/api/auth-attempts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'clear', email: fakeEmail(u) }),
    })
  }

  // --- Submit ---
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    if (mode === 'login') {
      const blocked = await checkBlocked(username)
      if (blocked) { setLoading(false); return }

      const { error: err } = await supabase.auth.signInWithPassword({
        email: fakeEmail(username),
        password,
      })

      if (err) {
        await recordFail(username)
        const left = Math.max(0, MAX_ATTEMPTS - (attempts + 1))
        setError(
          left > 0
            ? `Username yoki parol noto'g'ri. Yana ${left} ta urinish.`
            : `5 ta urinish tugadi. ${BLOCK_MINUTES} daqiqa kuting.`
        )
        setLoading(false)
        return
      }

      await clearAttempts(username)
      router.push('/')
      router.refresh()

    } else {
      // --- Signup validatsiya ---
      if (!firstname.trim())   { setError('Ism kiriting');                        setLoading(false); return }
      if (!lastname.trim())    { setError('Familiya kiriting');                   setLoading(false); return }
      if (!username.trim())    { setError('Username kiriting');                   setLoading(false); return }
      if (username.length < 3) { setError('Username kamida 3 ta belgi bo\'lishi kerak'); setLoading(false); return }
      if (password.length < 6) { setError('Parol kamida 6 ta belgi bo\'lishi kerak');    setLoading(false); return }

      // Username band emasmi?
      const { data: exists } = await supabase
        .from('users')
        .select('id')
        .eq('username', username.trim().toLowerCase())
        .maybeSingle()

      if (exists) {
        setError('Bu username band. Boshqa username tanlang.')
        setLoading(false)
        return
      }

      const { error: err } = await supabase.auth.signUp({
        email: fakeEmail(username),
        password,
        options: {
          data: {
            firstname: firstname.trim(),
            lastname:  lastname.trim(),
            username:  username.trim().toLowerCase(),
          },
        },
      })

      if (err) {
        setError(
          err.message.includes('already registered')
            ? 'Bu username allaqachon band'
            : 'Xato yuz berdi. Qayta urinib ko\'ring.'
        )
        setLoading(false)
        return
      }

      // Auto login after signup
      await supabase.auth.signInWithPassword({
        email: fakeEmail(username),
        password,
      })
      router.push('/')
      router.refresh()
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">

      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-blue-100 rounded-full opacity-60 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 w-80 h-80 bg-indigo-100 rounded-full opacity-50 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-sky-50 rounded-full opacity-70 blur-2xl" />
      </div>

      <div className="relative w-full max-w-sm">

        {/* Logo */}
        <div className="flex flex-col items-center mb-7">
          <div className="w-13 h-13 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200 mb-3 p-3">
            <svg width="26" height="26" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Autotest</h1>
          <p className="text-xs text-slate-400 mt-0.5 tracking-widest uppercase">Haydovchilik testlari</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/80 border border-slate-100 overflow-hidden">

          {/* Toggle tabs */}
          <div className="flex border-b border-slate-100">
            {(['login', 'signup'] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => switchMode(m)}
                className={`flex-1 py-3.5 text-sm font-semibold transition-all duration-200 relative ${
                  mode === m
                    ? 'text-blue-600'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {m === 'login' ? 'Kirish' : "Ro'yxatdan o'tish"}
                {mode === m && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-t-full" />
                )}
              </button>
            ))}
          </div>

          <div className="p-6">

            {/* Blocked state */}
            {isBlocked && (
              <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 mb-5 text-center">
                <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <svg width="16" height="16" fill="none" stroke="#f97316" strokeWidth="2" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="12"/>
                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                </div>
                <p className="text-sm font-medium text-orange-700 mb-1">Hisob vaqtincha bloklandi</p>
                <p className="text-3xl font-bold text-orange-500 font-mono tracking-wider my-2">{fmt(blockTimer)}</p>
                <p className="text-xs text-orange-400">5 ta noto'g'ri urinishdan keyin blok</p>
              </div>
            )}

            {/* Error */}
            {error && !isBlocked && (
              <div className="flex items-start gap-2.5 bg-red-50 border border-red-100 text-red-600 rounded-xl px-3.5 py-3 mb-4 text-sm">
                <svg width="15" height="15" className="mt-0.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="15" y1="9" x2="9" y2="15"/>
                  <line x1="9" y1="9" x2="15" y2="15"/>
                </svg>
                {error}
              </div>
            )}

            {/* Success */}
            {success && (
              <div className="flex items-start gap-2.5 bg-green-50 border border-green-100 text-green-700 rounded-xl px-3.5 py-3 mb-4 text-sm">
                <svg width="15" height="15" className="mt-0.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                {success}
              </div>
            )}

            {/* Form */}
            <div className={`transition-all duration-150 ${fading ? 'opacity-0 translate-y-1' : 'opacity-100 translate-y-0'}`}>
              <form onSubmit={handleSubmit} className="space-y-3.5">

                {/* Signup only fields */}
                {mode === 'signup' && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      {/* Firstname */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">
                          Ism
                        </label>
                        <input
                          type="text"
                          placeholder="Ali"
                          value={firstname}
                          onChange={e => setFirstname(e.target.value)}
                          disabled={loading}
                          autoComplete="given-name"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-300 outline-none focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 transition disabled:opacity-50"
                        />
                      </div>
                      {/* Lastname */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">
                          Familiya
                        </label>
                        <input
                          type="text"
                          placeholder="Karimov"
                          value={lastname}
                          onChange={e => setLastname(e.target.value)}
                          disabled={loading}
                          autoComplete="family-name"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-300 outline-none focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 transition disabled:opacity-50"
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* Username */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">
                    Username
                  </label>
                  <div className="relative">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300">
                      <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
                        <circle cx="12" cy="7" r="4"/>
                      </svg>
                    </div>
                    <input
                      type="text"
                      placeholder="ali_karimov"
                      value={username}
                      onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                      disabled={loading || isBlocked}
                      autoComplete="username"
                      required
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-300 outline-none focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 transition disabled:opacity-50"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">
                    Parol
                  </label>
                  <div className="relative">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300">
                      <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                        <path d="M7 11V7a5 5 0 0110 0v4"/>
                      </svg>
                    </div>
                    <input
                      type={showPass ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      disabled={loading || isBlocked}
                      autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                      required
                      minLength={6}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-10 py-2.5 text-sm text-slate-800 placeholder-slate-300 outline-none focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 transition disabled:opacity-50"
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowPass(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition p-0.5"
                    >
                      {showPass ? (
                        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
                          <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
                          <line x1="1" y1="1" x2="23" y2="23"/>
                        </svg>
                      ) : (
                        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                          <circle cx="12" cy="12" r="3"/>
                        </svg>
                      )}
                    </button>
                  </div>

                  {/* Attempt dots */}
                  {mode === 'login' && attempts > 0 && !isBlocked && (
                    <div className="flex gap-1 mt-2">
                      {[...Array(MAX_ATTEMPTS)].map((_, i) => (
                        <div
                          key={i}
                          className={`flex-1 h-1 rounded-full transition-all duration-300 ${
                            i < attempts ? 'bg-red-400' : 'bg-slate-200'
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading || isBlocked}
                  className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold py-2.5 rounded-xl text-sm transition-all duration-200 shadow-md shadow-blue-200 hover:shadow-lg hover:shadow-blue-300 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 flex items-center justify-center gap-2 mt-1"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                      </svg>
                      {mode === 'login' ? 'Kirilmoqda...' : "Ro'yxatdan o'tilmoqda..."}
                    </>
                  ) : (
                    mode === 'login' ? 'Kirish →' : "Ro'yxatdan o'tish →"
                  )}
                </button>

              </form>
            </div>
          </div>
        </div>

        {/* Back link */}
        <p className="text-center mt-5 text-xs text-slate-400">
          <a href="/" className="hover:text-blue-500 transition-colors">← Test sahifasiga qaytish</a>
        </p>
      </div>
    </div>
  )
}