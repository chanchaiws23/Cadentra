import { useEffect, useState } from 'react'
import { Award, ChevronDown, Download, FileText, Gift, Sparkles } from 'lucide-react'
import { motivationProgress, type Habit, type PersonalReward, type Reflection, type ReflectionPeriod, type Task } from '@cadentra/domain'
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
  rewards: PersonalReward[]
  onSaveReflection: (input: SaveReflectionInput) => Promise<boolean>
  onExportCsv: () => void
  onExportPdf: () => void
  onCreateReward: (title: string, pointCost: number) => Promise<boolean>
  onRedeemReward: (reward: PersonalReward) => Promise<boolean>
}

export function InsightsView({ tasks, habits, reflections, points, focusMinutes, rewards, onSaveReflection, onExportCsv, onExportPdf, onCreateReward, onRedeemReward }: InsightsViewProps) {
  const { t } = useI18n()
  const [period, setPeriod] = useState<ReflectionPeriod>('daily')
  const [localDate, setLocalDate] = useState(todayKey)
  const existing = reflections.find((entry) => entry.period === period && entry.localDate === localDate)
  const [values, setValues] = useState({ wins: '', blockers: '', nextStep: '' })
  const [saving, setSaving] = useState(false)
  const [rewardTitle, setRewardTitle] = useState('')
  const [rewardCost, setRewardCost] = useState(100)
  const motivation = motivationProgress(tasks, habits, reflections, focusMinutes)

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
        <div className="mt-5 flex flex-wrap justify-between gap-3"><span className="flex flex-wrap gap-2"><button type="button" className="secondary" onClick={onExportCsv}><Download size={16}/>CSV</button><button type="button" className="secondary" onClick={onExportPdf}><FileText size={16}/>PDF</button></span><button className="primary" disabled={saving || !Object.values(values).some((value) => value.trim())}>{saving ? 'กำลังบันทึก…' : existing ? 'อัปเดตการทบทวน' : 'บันทึกการทบทวน'}</button></div>
      </form>
      <section className="border-t border-line pt-6">
        <span className="inline-grid size-10 place-items-center rounded-full bg-[#e0eee8] text-accent"><Sparkles size={18}/></span>
        <h2 className="mt-4 font-display text-2xl">บันทึกล่าสุด</h2>
        <p className="mt-1 text-sm text-muted">ย้อนดูสิ่งที่ช่วยให้คุณกลับมาเริ่มใหม่ได้</p>
        <div className="mt-5 divide-y divide-line border-y border-line">{reflections.length ? reflections.slice(0, 6).map((entry) => <article className="py-4" key={entry.id}><div className="flex justify-between gap-3"><strong className="text-sm">{entry.period === 'daily' ? 'รายวัน' : 'รายสัปดาห์'}</strong><time className="text-xs text-muted">{entry.localDate}</time></div><p className="mt-2 line-clamp-3 text-sm leading-6 text-muted">{entry.wins || entry.blockers || entry.nextStep}</p></article>) : <p className="py-8 text-sm text-muted">ยังไม่มีบันทึก เริ่มจากวันนี้ได้เลย</p>}</div>
      </section>
    </div>
    <section className="mt-10 border-t border-line pt-7">
      <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow">แรงจูงใจที่ไม่ลงโทษ</p><h2 className="font-display text-2xl">Quest, Badge และรางวัลของคุณ</h2></div><strong className="text-accent">{points} XP ใช้ได้</strong></div>
      <div className="mt-6 grid gap-8 lg:grid-cols-2">
        <div><h3 className="flex items-center gap-2 text-sm"><Award size={16}/>ความสำเร็จ</h3><div className="mt-3 divide-y divide-line border-y border-line">{motivation.badges.map((badge) => <div className="flex items-center justify-between gap-4 py-4" key={badge.code}><span><strong className="block text-sm">{badge.title}</strong><small className="text-muted">{badge.description}</small></span><span className={badge.earned ? 'text-xs font-semibold text-accent' : 'text-xs text-muted'}>{badge.earned ? 'ได้รับแล้ว' : 'กำลังทำ'}</span></div>)}</div><div className="mt-5"><div className="flex justify-between text-sm"><strong>Weekly Quest</strong><span>{motivation.quest.current}/{motivation.quest.target}</span></div><p className="mt-1 text-xs text-muted">{motivation.quest.title}</p><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-line"><i className="block h-full bg-accent transition-[width]" style={{ width: `${motivation.quest.current / motivation.quest.target * 100}%` }}/></div></div></div>
        <div><h3 className="flex items-center gap-2 text-sm"><Gift size={16}/>รางวัลส่วนตัว</h3><form className="mt-3 grid grid-cols-[minmax(0,1fr)_100px_auto] gap-2 max-[640px]:grid-cols-1" onSubmit={(event) => { event.preventDefault(); void onCreateReward(rewardTitle.trim(), rewardCost).then((ok) => { if (ok) setRewardTitle('') }) }}><input aria-label="ชื่อรางวัล" className="min-h-11 rounded-lg border border-line bg-paper px-3" placeholder="เช่น เล่นเกม 1 ชั่วโมง" value={rewardTitle} onChange={(event) => setRewardTitle(event.target.value)}/><input aria-label="คะแนนรางวัล" type="number" min="1" className="min-h-11 rounded-lg border border-line bg-paper px-3" value={rewardCost} onChange={(event) => setRewardCost(Number(event.target.value))}/><button className="secondary" disabled={!rewardTitle.trim()}>เพิ่ม</button></form><div className="mt-4 divide-y divide-line border-y border-line">{rewards.length ? rewards.map((reward) => <div className="flex items-center justify-between gap-4 py-4" key={reward.id}><span><strong className={reward.redeemedAt ? 'block text-sm line-through text-muted' : 'block text-sm'}>{reward.title}</strong><small className="text-muted">{reward.pointCost} XP</small></span><button type="button" className="secondary" disabled={Boolean(reward.redeemedAt) || points < reward.pointCost} onClick={() => void onRedeemReward(reward)}>{reward.redeemedAt ? 'ใช้แล้ว' : 'แลกรางวัล'}</button></div>) : <p className="py-7 text-sm text-muted">เพิ่มรางวัลเล็ก ๆ ที่อยากมอบให้ตัวเอง</p>}</div></div>
      </div>
    </section>
  </>
}
