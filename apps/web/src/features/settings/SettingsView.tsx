import { useEffect, useState } from 'react'
import { CalendarDays, Download, RefreshCw, Save, ShieldCheck, Trash2, Unlink } from 'lucide-react'
import type { CalendarConnection, NotificationRule, UserProfile } from '@cadentra/domain'
import type { UpdateProfileInput } from '@cadentra/data'
import { PageHeading } from '../../components/PageHeading'

interface SettingsViewProps {
  profile: UserProfile | null
  email: string
  onSave: (input: UpdateProfileInput) => Promise<boolean>
  notificationRule: NotificationRule | null
  notificationPermission: NotificationPermission | 'unsupported'
  onSaveNotificationRule: (input: Omit<NotificationRule, 'userId'>) => Promise<boolean>
  onRequestNotificationPermission: () => Promise<void>
  onSendTestNotification: () => Promise<void>
  calendarConnection: CalendarConnection | null
  onConnectGoogleCalendar: () => Promise<void>
  onSyncGoogleCalendar: () => Promise<void>
  onDisconnectGoogleCalendar: () => Promise<void>
  onExport: () => Promise<boolean>
  onDelete: () => Promise<boolean>
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

export function SettingsView({ profile, email, notificationRule, notificationPermission, onSave, onSaveNotificationRule, onRequestNotificationPermission, onSendTestNotification, calendarConnection, onConnectGoogleCalendar, onSyncGoogleCalendar, onDisconnectGoogleCalendar, onExport, onDelete }: SettingsViewProps) {
  const [values, setValues] = useState(() => initialValues(profile, email))
  const [saving, setSaving] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteConfirmation, setDeleteConfirmation] = useState('')
  const [calendarBusy, setCalendarBusy] = useState(false)
  const [notificationValues, setNotificationValues] = useState(() => notificationRule ? { ...notificationRule } : { enabled: false, quietStart: '22:00', quietEnd: '07:00', dailyLimit: 6, focusBreakMinutes: 45 })

  useEffect(() => setValues(initialValues(profile, email)), [email, profile])
  useEffect(() => { if (notificationRule) setNotificationValues(notificationRule) }, [notificationRule])

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSaving(true)
    await Promise.all([onSave({ ...values, displayName: values.displayName.trim(), timezone: values.timezone.trim() }), onSaveNotificationRule(notificationValues)])
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
          <h2 className="font-display text-xl">Google Calendar</h2>
          <p className="mt-1 text-sm text-muted">นำเข้านัดหมายแบบอ่านอย่างเดียว เพื่อเห็นเวลาที่ไม่ว่างร่วมกับแผน Cadentra</p>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-y border-line py-5">
            <span className="flex min-w-0 items-center gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#e0eee8] text-accent"><CalendarDays size={18}/></span><span className="min-w-0"><strong className="block truncate text-sm">{calendarConnection?.accountId ?? 'ยังไม่ได้เชื่อมต่อ'}</strong><small className="mt-1 block text-muted">{calendarConnection?.lastSyncedAt ? `ซิงก์ล่าสุด ${new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(calendarConnection.lastSyncedAt))}` : 'ข้อมูลจาก Google จะไม่ถูกแก้ไขโดย Cadentra'}</small></span></span>
            {calendarConnection ? <span className="flex flex-wrap gap-2"><button type="button" className="secondary" disabled={calendarBusy} onClick={() => { setCalendarBusy(true); void onSyncGoogleCalendar().finally(() => setCalendarBusy(false)) }}><RefreshCw size={16}/>{calendarBusy ? 'กำลังซิงก์…' : 'ซิงก์ตอนนี้'}</button><button type="button" className="secondary text-[#9b493f]" disabled={calendarBusy} onClick={() => { setCalendarBusy(true); void onDisconnectGoogleCalendar().finally(() => setCalendarBusy(false)) }}><Unlink size={16}/>ยกเลิกการเชื่อมต่อ</button></span> : <button type="button" className="primary" disabled={calendarBusy} onClick={() => { setCalendarBusy(true); void onConnectGoogleCalendar().finally(() => setCalendarBusy(false)) }}>เชื่อมต่อ Google Calendar</button>}
          </div>
        </section>

        <section className="rounded-2xl border border-line bg-surface p-6 max-[640px]:p-4">
          <h2 className="font-display text-xl">การแจ้งเตือน</h2>
          <p className="mt-1 text-sm text-muted">กำหนดขอบเขตการเตือนเพื่อให้ช่วยได้โดยไม่รบกวนเกินไป</p>
          <div className="mt-5 divide-y divide-line">
            <label className="flex cursor-pointer items-start justify-between gap-5 py-4"><span><strong className="block text-sm">เปิดการแจ้งเตือนบนอุปกรณ์นี้</strong><small className="mt-1 block text-muted">สิทธิ์ปัจจุบัน: {notificationPermission}</small></span><input aria-label="เปิดการแจ้งเตือนบนอุปกรณ์นี้" type="checkbox" className="mt-1 size-5 accent-accent" checked={notificationValues.enabled} onChange={(event) => setNotificationValues((current) => ({ ...current, enabled: event.target.checked }))}/></label>
            <div className="grid gap-4 py-5 sm:grid-cols-2"><label className="text-sm font-semibold">Quiet hours เริ่ม<input aria-label="Quiet hours เริ่ม" type="time" className="mt-2 block min-h-11 w-full rounded-lg border border-line bg-paper px-3" value={notificationValues.quietStart} onChange={(event) => setNotificationValues((current) => ({ ...current, quietStart: event.target.value }))}/></label><label className="text-sm font-semibold">Quiet hours สิ้นสุด<input aria-label="Quiet hours สิ้นสุด" type="time" className="mt-2 block min-h-11 w-full rounded-lg border border-line bg-paper px-3" value={notificationValues.quietEnd} onChange={(event) => setNotificationValues((current) => ({ ...current, quietEnd: event.target.value }))}/></label><label className="text-sm font-semibold">จำกัดต่อวัน<input aria-label="จำกัดการแจ้งเตือนต่อวัน" type="number" min="1" max="20" className="mt-2 block min-h-11 w-full rounded-lg border border-line bg-paper px-3" value={notificationValues.dailyLimit} onChange={(event) => setNotificationValues((current) => ({ ...current, dailyLimit: Number(event.target.value) }))}/></label><label className="text-sm font-semibold">เตือนพักหลังโฟกัส<input aria-label="เตือนพักหลังโฟกัส" type="number" min="15" max="180" className="mt-2 block min-h-11 w-full rounded-lg border border-line bg-paper px-3" value={notificationValues.focusBreakMinutes} onChange={(event) => setNotificationValues((current) => ({ ...current, focusBreakMinutes: Number(event.target.value) }))}/><small className="mt-1 block text-muted">นาที</small></label></div>
            <div className="flex flex-wrap gap-2 pt-4"><button type="button" className="secondary" onClick={() => void onRequestNotificationPermission()}>ลงทะเบียน Push บนอุปกรณ์นี้</button><button type="button" className="secondary" disabled={notificationPermission !== 'granted'} onClick={() => void onSendTestNotification()}>ส่งการแจ้งเตือนทดสอบ</button></div>
          </div>
        </section>

        <section className="rounded-2xl border border-line bg-surface p-6 max-[640px]:p-4">
          <h2 className="font-display text-xl">แรงจูงใจและความเป็นส่วนตัว</h2>
          <div className="mt-5 divide-y divide-line">
            <label className="flex cursor-pointer items-start justify-between gap-5 py-4"><span><strong className="block text-sm">เปิดคะแนนและเลเวล</strong><small className="mt-1 block leading-5 text-muted">ซ่อนหรือแสดง gamification โดยไม่ลบประวัติคะแนน</small></span><input aria-label="เปิดคะแนนและเลเวล" type="checkbox" className="mt-1 size-5 accent-accent" checked={values.gamificationEnabled} onChange={(event) => setValues((current) => ({ ...current, gamificationEnabled: event.target.checked }))}/></label>
            <label className="flex cursor-pointer items-start justify-between gap-5 py-4"><span><strong className="flex items-center gap-2 text-sm"><ShieldCheck size={16}/>อนุญาตให้ AI ใช้ข้อมูลสุขภาพสรุป</strong><small className="mt-1 block max-w-xl leading-5 text-muted">ปิดเป็นค่าเริ่มต้น ข้อมูลสุขภาพจะไม่ถูกส่งให้ AI จนกว่าคุณจะเปิดยินยอมนี้</small></span><input aria-label="อนุญาตให้ AI ใช้ข้อมูลสุขภาพสรุป" type="checkbox" className="mt-1 size-5 accent-accent" checked={values.healthAiConsent} onChange={(event) => setValues((current) => ({ ...current, healthAiConsent: event.target.checked }))}/></label>
          </div>
        </section>

        <section className="rounded-2xl border border-line bg-surface p-6 max-[640px]:p-4">
          <h2 className="font-display text-xl">ข้อมูลและบัญชี</h2>
          <div className="mt-5 divide-y divide-line">
            <div className="flex items-center justify-between gap-5 py-4 max-[640px]:items-start max-[640px]:flex-col"><span><strong className="block text-sm">ส่งออกข้อมูลทั้งหมด</strong><small className="mt-1 block leading-5 text-muted">ดาวน์โหลด JSON ที่รวบรวมข้อมูลของคุณผ่าน RLS โดยไม่รวม credentials</small></span><button type="button" className="secondary shrink-0" disabled={exporting} onClick={() => { setExporting(true); void onExport().finally(() => setExporting(false)) }}><Download size={16}/>{exporting ? 'กำลังเตรียม…' : 'ดาวน์โหลด JSON'}</button></div>
            <div className="py-5"><strong className="block text-sm text-[#9b493f]">ลบบัญชีถาวร</strong><small className="mt-1 block max-w-2xl leading-5 text-muted">ระบบจะลบผู้ใช้ ข้อมูลในฐานข้อมูล token references และไฟล์ในโฟลเดอร์ของบัญชี การดำเนินการนี้ย้อนกลับไม่ได้</small><label className="mt-4 block text-sm font-semibold">พิมพ์อีเมลของคุณเพื่อยืนยัน<input className="mt-2 block min-h-11 w-full rounded-lg border border-[#d9b7af] bg-paper px-3.5 font-normal outline-none focus:border-[#9b493f] focus:ring-3 focus:ring-[#9b493f15]" value={deleteConfirmation} onChange={(event) => setDeleteConfirmation(event.target.value)} placeholder={email}/></label><button type="button" className="mt-4 inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[#9b493f] px-4 text-sm font-semibold text-white transition hover:bg-[#863d35] disabled:cursor-not-allowed disabled:opacity-40" disabled={deleting || deleteConfirmation !== email} onClick={() => { setDeleting(true); void onDelete().finally(() => setDeleting(false)) }}><Trash2 size={16}/>{deleting ? 'กำลังลบ…' : 'ลบบัญชีและข้อมูลทั้งหมด'}</button></div>
          </div>
        </section>

        <div className="flex justify-end"><button className="primary" disabled={saving || !values.displayName.trim() || !values.timezone.trim()}>{saving ? 'กำลังบันทึก…' : <><Save size={16}/>บันทึกการตั้งค่า</>}</button></div>
      </form>
    </>
  )
}
