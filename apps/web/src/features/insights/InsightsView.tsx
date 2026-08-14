import { useEffect, useState } from 'react'
import { ChevronDown, Download, Sparkles } from 'lucide-react'
import type { Habit, Reflection, ReflectionPeriod, Task } from '@cadentra/domain'
import type { SaveReflectionInput } from '@cadentra/data'
import { PageHeading } from '../../components/PageHeading'
import { useI18n } from '../../i18n/LocaleProvider'
import { formatMinutes, todayKey } from '../../lib/date'

interface InsightsViewProps {
  tasks: Task[]
  habits: Habit[]
  reflections: Reflection[]
  points: number
  focusMinutes: number
  onSaveReflection: (input: SaveReflectionInput) => Promise<boolean>
  onExportCsv: () => void
}

export function InsightsView({ tasks, habits, reflections, points, focusMinutes, onSaveReflection, onExportCsv }: InsightsViewProps) {
  const { t } = useI18n()
  const [period, setPeriod] = useState<ReflectionPeriod>('daily')
  const [localDate, setLocalDate] = useState(todayKey)
  const existing = reflections.find((entry) => entry.period === period && entry.localDate === localDate)
  const [values, setValues] = useState({ wins: '', blockers: '', nextStep: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => setValues(existing ? { wins: existing.wins, blockers: existing.blockers, nextStep: existing.nextStep } : { wins: '', blockers: '', nextStep: '' }), [existing])

  const completedTasks = tasks.filter((task) => task.status === 'done').length
  const completedToday = habits.filter((habit) => habit.completedDates.includes(todayKey)).length
  const consistency = habits.length ? Math.round((completedToday / habits.length) * 100) : 0
  const save = async (event: React.FormEvent) => {
    event.preventDefault()
    setSaving(true)
    await onSaveReflection({ period, localDate, ...values })
    setSaving(false)
  }

  return <>
    <PageHeading eyebrow={t('insights.eyebrow')} title={t('insights.title')} detail={t('insights.detail')} action={<button className="filter-button">สัปดาห์นี้ <ChevronDown size={14}/></button>}/>
    <div className="insight-strip"><div><small>ความสม่ำเสมอวันนี้</small><strong>{consistency}%</strong><em>{completedToday}/{habits.length} นิสัย</em></div><div><small>เวลาโฟกัสวันนี้</small><strong>{formatMinutes(focusMinutes)}</strong><em>จาก Focus sessions</em></div><div><small>งานสำเร็จ</small><strong>{completedTasks}</strong><em>จาก {tasks.length} งาน</em></div><div><small>คะแนนสะสม</small><strong>{points}</strong><em>จากกิจกรรมที่บันทึก</em></div></div>
    <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1.25fr)_minmax(280px,.75fr)]">
      <form className="border-t border-line pt-6" onSubmit={save}>
        <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="eyebrow">ทบทวนอย่างอ่อนโยน</p><h2 className="font-display text-2xl">{period === 'daily' ? 'Daily Reflection' : 'Weekly Review'}</h2></div><div className="flex gap-2"><button type="button" className={period === 'daily' ? 'primary compact' : 'secondary'} onClick={() => setPeriod('daily')}>รายวัน</button><button type="button" className={period === 'weekly' ? 'primary compact' : 'secondary'} onClick={() => setPeriod('weekly')}>รายสัปดาห์</button></div></div>
        <label className="mt-5 block text-sm font-semibold">วันที่<input aria-label="วันที่ทบทวน" type="date" className="mt-2 block min-h-11 w-full rounded-lg border border-line bg-paper px-3 sm:max-w-56" value={localDate} onChange={(event) => setLocalDate(event.target.value)}/></label>
        <div className="mt-5 divide-y divide-line border-y border-line">
          <label className="block py-5 text-sm font-semibold">อะไรไปได้ดี<textarea aria-label="สิ่งที่ทำได้ดี" className="mt-2 min-h-24 w-full resize-y rounded-lg border border-line bg-paper p-3 font-normal" value={values.wins} onChange={(event) => setValues((current) => ({ ...current, wins: event.target.value }))}/></label>
          <label className="block py-5 text-sm font-semibold">อะไรขัดจังหวะหรือทำให้เลื่อน<textarea aria-label="อุปสรรค" className="mt-2 min-h-24 w-full resize-y rounded-lg border border-line bg-paper p-3 font-normal" value={values.blockers} onChange={(event) => setValues((current) => ({ ...current, blockers: event.target.value }))}/></label>
          <label className="block py-5 text-sm font-semibold">ก้าวเล็ก ๆ ถัดไป<textarea aria-label="ก้าวถัดไป" className="mt-2 min-h-24 w-full resize-y rounded-lg border border-line bg-paper p-3 font-normal" value={values.nextStep} onChange={(event) => setValues((current) => ({ ...current, nextStep: event.target.value }))}/></label>
        </div>
        <div className="mt-5 flex flex-wrap justify-between gap-3"><button type="button" className="secondary" onClick={onExportCsv}><Download size={16}/>ส่งออก CSV</button><button className="primary" disabled={saving || !Object.values(values).some((value) => value.trim())}>{saving ? 'กำลังบันทึก…' : existing ? 'อัปเดตการทบทวน' : 'บันทึกการทบทวน'}</button></div>
      </form>
      <section className="border-t border-line pt-6">
        <span className="inline-grid size-10 place-items-center rounded-full bg-[#e0eee8] text-accent"><Sparkles size={18}/></span>
        <h2 className="mt-4 font-display text-2xl">บันทึกล่าสุด</h2>
        <p className="mt-1 text-sm text-muted">ย้อนดูสิ่งที่ช่วยให้คุณกลับมาเริ่มใหม่ได้</p>
        <div className="mt-5 divide-y divide-line border-y border-line">{reflections.length ? reflections.slice(0, 6).map((entry) => <article className="py-4" key={entry.id}><div className="flex justify-between gap-3"><strong className="text-sm">{entry.period === 'daily' ? 'รายวัน' : 'รายสัปดาห์'}</strong><time className="text-xs text-muted">{entry.localDate}</time></div><p className="mt-2 line-clamp-3 text-sm leading-6 text-muted">{entry.wins || entry.blockers || entry.nextStep}</p></article>) : <p className="py-8 text-sm text-muted">ยังไม่มีบันทึก เริ่มจากวันนี้ได้เลย</p>}</div>
      </section>
    </div>
  </>
}
