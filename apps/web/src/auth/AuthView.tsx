import { useState, type FormEvent, type ReactNode } from 'react'
import { ArrowRight, CheckCircle2, Eye, EyeOff, LoaderCircle } from 'lucide-react'
import { useAuth } from './AuthContext'

type AuthFormMode = 'sign-in' | 'sign-up'

export function AuthView() {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState<AuthFormMode>('sign-in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [working, setWorking] = useState(false)
  const [error, setError] = useState('')
  const [confirmationEmail, setConfirmationEmail] = useState('')

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    if (password.length < 8) {
      setError('รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร')
      return
    }

    setWorking(true)
    const result = mode === 'sign-in' ? await signIn(email.trim(), password) : await signUp(email.trim(), password)
    setWorking(false)

    if (!result.ok) {
      setError(result.message)
      return
    }
    if (result.value.confirmationRequired) setConfirmationEmail(email.trim())
  }

  if (confirmationEmail) {
    return (
      <AuthFrame>
        <div className="max-w-sm" role="status">
          <span className="grid size-11 place-items-center rounded-xl bg-accent-soft text-accent"><CheckCircle2 size={21}/></span>
          <p className="mt-6 text-[10px] font-bold tracking-[0.13em] text-accent uppercase">ตรวจสอบอีเมล</p>
          <h1 className="font-display mt-2 text-[34px] leading-tight tracking-[-0.035em]">ยืนยันบัญชีของคุณ</h1>
          <p className="mt-3 text-sm leading-6 text-muted">เราส่งลิงก์ยืนยันไปที่ <strong className="font-semibold text-ink">{confirmationEmail}</strong> แล้ว เปิดลิงก์นั้นเพื่อเข้าสู่ Cadentra</p>
          <button className="mt-7 text-sm font-semibold text-accent" onClick={() => setConfirmationEmail('')}>กลับไปหน้าเข้าสู่ระบบ →</button>
        </div>
      </AuthFrame>
    )
  }

  return (
    <AuthFrame>
      <div className="w-full max-w-sm">
        <p className="text-[10px] font-bold tracking-[0.13em] text-accent uppercase">{mode === 'sign-in' ? 'ยินดีต้อนรับกลับ' : 'เริ่มต้นจังหวะของคุณ'}</p>
        <h1 className="font-display mt-2 text-[36px] leading-tight tracking-[-0.04em]">{mode === 'sign-in' ? 'เข้าสู่ Cadentra' : 'สร้างบัญชี Cadentra'}</h1>
        <p className="mt-3 text-sm leading-6 text-muted">{mode === 'sign-in' ? 'กลับมาจัดวันของคุณต่อจากจุดเดิม' : 'เก็บตาราง งาน และนิสัยของคุณไว้ในพื้นที่ส่วนตัว'}</p>

        <form className="mt-8 space-y-4" onSubmit={submit}>
          <label className="block text-xs font-semibold text-ink">
            อีเมล
            <input className="mt-2 block min-h-11 w-full rounded-lg border border-line bg-surface px-3.5 text-sm font-normal outline-none transition focus:border-accent focus:ring-3 focus:ring-[#246b5015]" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com"/>
          </label>
          <label className="block text-xs font-semibold text-ink">
            รหัสผ่าน
            <span className="relative mt-2 block">
              <input className="block min-h-11 w-full rounded-lg border border-line bg-surface px-3.5 pr-11 text-sm font-normal outline-none transition focus:border-accent focus:ring-3 focus:ring-[#246b5015]" type={showPassword ? 'text' : 'password'} autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'} required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="อย่างน้อย 8 ตัวอักษร"/>
              <button className="absolute inset-y-0 right-0 grid w-11 place-items-center text-muted" type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}>{showPassword ? <EyeOff size={17}/> : <Eye size={17}/>}</button>
            </span>
          </label>

          {error && <p className="rounded-lg bg-[#f3e5e1] px-3.5 py-2.5 text-xs leading-5 text-[#873e35]" role="alert">{error}</p>}

          <button className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 text-sm font-semibold text-white transition hover:bg-[#195b42] disabled:cursor-wait disabled:opacity-60" disabled={working}>
            {working ? <LoaderCircle className="animate-spin" size={17}/> : <>{mode === 'sign-in' ? 'เข้าสู่ระบบ' : 'สร้างบัญชี'}<ArrowRight size={16}/></>}
          </button>
        </form>

        <button className="mt-6 text-sm text-muted" type="button" onClick={() => { setMode((value) => value === 'sign-in' ? 'sign-up' : 'sign-in'); setError('') }}>
          {mode === 'sign-in' ? 'ยังไม่มีบัญชี? ' : 'มีบัญชีอยู่แล้ว? '}<strong className="font-semibold text-accent">{mode === 'sign-in' ? 'สร้างบัญชี' : 'เข้าสู่ระบบ'}</strong>
        </button>
      </div>
    </AuthFrame>
  )
}

function AuthFrame({ children }: { children: ReactNode }) {
  return (
    <main className="grid min-h-dvh grid-cols-[minmax(300px,0.8fr)_minmax(420px,1.2fr)] bg-paper text-ink max-[820px]:grid-cols-1">
      <section className="flex flex-col justify-between border-r border-line bg-[#ecebe4] p-10 max-[820px]:hidden">
        <div className="flex items-center gap-3 text-lg font-semibold"><span className="grid size-8 place-items-center rounded-[9px] bg-ink font-display text-lg text-white">C</span>Cadentra</div>
        <blockquote className="font-display max-w-sm text-[28px] leading-[1.45] tracking-[-0.025em]">“วินัยที่ยั่งยืน เริ่มจากวันที่กลับมาเริ่มใหม่ได้”</blockquote>
        <p className="text-xs text-muted">ตาราง · งาน · นิสัย · โฟกัส</p>
      </section>
      <section className="flex min-h-dvh items-center justify-center px-8 py-12 max-[480px]:px-5">
        <div className="w-full max-w-sm">
          <div className="mb-12 hidden items-center gap-3 text-lg font-semibold max-[820px]:flex"><span className="grid size-8 place-items-center rounded-[9px] bg-ink font-display text-lg text-white">C</span>Cadentra</div>
          {children}
        </div>
      </section>
    </main>
  )
}
