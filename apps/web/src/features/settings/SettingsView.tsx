import { useEffect, useState } from 'react'
import { Save, ShieldCheck } from 'lucide-react'
import type { UserProfile } from '@cadentra/domain'
import type { UpdateProfileInput } from '@cadentra/data'
import { PageHeading } from '../../components/PageHeading'

interface SettingsViewProps {
  profile: UserProfile | null
  email: string
  onSave: (input: UpdateProfileInput) => Promise<boolean>
}

function initialValues(profile: UserProfile | null, email: string): UpdateProfileInput {
  return profile ? {
    displayName: profile.displayName,
    timezone: profile.timezone,
    locale: profile.locale,
    gamificationEnabled: profile.gamificationEnabled,
    healthAiConsent: profile.healthAiConsent,
  } : {
    displayName: email.split('@')[0] ?? '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    locale: 'th',
    gamificationEnabled: true,
    healthAiConsent: false,
  }
}

export function SettingsView({ profile, email, onSave }: SettingsViewProps) {
  const [values, setValues] = useState(() => initialValues(profile, email))
  const [saving, setSaving] = useState(false)

  useEffect(() => setValues(initialValues(profile, email)), [email, profile])

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSaving(true)
    await onSave({ ...values, displayName: values.displayName.trim(), timezone: values.timezone.trim() })
    setSaving(false)
  }

  return (
    <>
      <PageHeading eyebrow="การตั้งค่าส่วนตัว" title="ตั้งค่า" detail="ข้อมูลในหน้านี้บันทึกลงโปรไฟล์ Supabase ของคุณ"/>
      <form className="mx-auto max-w-3xl space-y-8" onSubmit={submit}>
        <section className="rounded-2xl border border-line bg-surface p-6 max-[640px]:p-4">
          <h2 className="font-display text-xl">โปรไฟล์</h2>
          <p className="mt-1 text-sm text-muted">ข้อมูลที่ใช้แสดงใน Cadentra และจัดเวลาให้ตรงกับคุณ</p>
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <label className="text-sm font-semibold text-ink">ชื่อที่แสดง<input className="mt-2 block min-h-11 w-full rounded-lg border border-line bg-paper px-3.5 font-normal outline-none focus:border-accent focus:ring-3 focus:ring-[#246b5015]" value={values.displayName} onChange={(event) => setValues((current) => ({ ...current, displayName: event.target.value }))} required/></label>
            <label className="text-sm font-semibold text-ink">อีเมล<input className="mt-2 block min-h-11 w-full rounded-lg border border-line bg-[#efeee8] px-3.5 font-normal text-muted" value={email} disabled/></label>
            <label className="text-sm font-semibold text-ink">เขตเวลา<input className="mt-2 block min-h-11 w-full rounded-lg border border-line bg-paper px-3.5 font-normal outline-none focus:border-accent focus:ring-3 focus:ring-[#246b5015]" value={values.timezone} onChange={(event) => setValues((current) => ({ ...current, timezone: event.target.value }))} placeholder="Asia/Bangkok" required/></label>
            <label className="text-sm font-semibold text-ink">ภาษา<select className="mt-2 block min-h-11 w-full rounded-lg border border-line bg-paper px-3.5 font-normal outline-none focus:border-accent focus:ring-3 focus:ring-[#246b5015]" value={values.locale} onChange={(event) => setValues((current) => ({ ...current, locale: event.target.value as 'th' | 'en' }))}><option value="th">ไทย</option><option value="en">English</option></select></label>
          </div>
        </section>

        <section className="rounded-2xl border border-line bg-surface p-6 max-[640px]:p-4">
          <h2 className="font-display text-xl">แรงจูงใจและความเป็นส่วนตัว</h2>
          <div className="mt-5 divide-y divide-line">
            <label className="flex cursor-pointer items-start justify-between gap-5 py-4"><span><strong className="block text-sm">เปิดคะแนนและเลเวล</strong><small className="mt-1 block leading-5 text-muted">ซ่อนหรือแสดง gamification โดยไม่ลบประวัติคะแนน</small></span><input aria-label="เปิดคะแนนและเลเวล" type="checkbox" className="mt-1 size-5 accent-accent" checked={values.gamificationEnabled} onChange={(event) => setValues((current) => ({ ...current, gamificationEnabled: event.target.checked }))}/></label>
            <label className="flex cursor-pointer items-start justify-between gap-5 py-4"><span><strong className="flex items-center gap-2 text-sm"><ShieldCheck size={16}/>อนุญาตให้ AI ใช้ข้อมูลสุขภาพสรุป</strong><small className="mt-1 block max-w-xl leading-5 text-muted">ปิดเป็นค่าเริ่มต้น ข้อมูลสุขภาพจะไม่ถูกส่งให้ AI จนกว่าคุณจะเปิดยินยอมนี้</small></span><input aria-label="อนุญาตให้ AI ใช้ข้อมูลสุขภาพสรุป" type="checkbox" className="mt-1 size-5 accent-accent" checked={values.healthAiConsent} onChange={(event) => setValues((current) => ({ ...current, healthAiConsent: event.target.checked }))}/></label>
          </div>
        </section>

        <div className="flex justify-end"><button className="primary" disabled={saving || !values.displayName.trim() || !values.timezone.trim()}>{saving ? 'กำลังบันทึก…' : <><Save size={16}/>บันทึกการตั้งค่า</>}</button></div>
      </form>
    </>
  )
}
