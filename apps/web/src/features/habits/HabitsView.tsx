import { useEffect, useState } from 'react'
import { Check, Circle, Flame, Plus } from 'lucide-react'
import type { Habit, HabitType } from '@cadentra/domain'
import { PageHeading } from '../../components/PageHeading'
import { useI18n } from '../../i18n/LocaleProvider'
import { localDateKey, todayKey } from '../../lib/date'

interface HabitsViewProps {
  habits: Habit[]
  onHabitValue: (habit: Habit, value: number | null) => void
  onAdd: () => void
}

const typeLabels: Record<HabitType, string> = {
  boolean: 'ทำ / ไม่ทำ',
  count: 'จำนวนครั้ง',
  duration: 'ระยะเวลา',
  number: 'ตัวเลข',
}

function todayValue(habit: Habit) {
  return habit.checkIns.find((entry) => entry.localDate === todayKey)?.value ?? 0
}

function recentDays() {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date()
    date.setDate(date.getDate() - (6 - index))
    return { key: localDateKey(date), label: new Intl.DateTimeFormat('th-TH', { weekday: 'short' }).format(date).replace('.', '') }
  })
}

export function HabitsView({ habits, onHabitValue, onAdd }: HabitsViewProps) {
  const { t } = useI18n()
  const days = recentDays()
  const [draftValues, setDraftValues] = useState<Record<string, string>>({})
  const completedToday = habits.filter((habit) => habit.completedDates.includes(todayKey)).length
  const consistency = habits.length ? Math.round((completedToday / habits.length) * 100) : 0

  useEffect(() => {
    setDraftValues(Object.fromEntries(habits.map((habit) => [habit.id, String(todayValue(habit) || '')])))
  }, [habits])

  return (
    <>
      <PageHeading
        eyebrow={t('habits.eyebrow')}
        title={t('habits.title')}
        detail={t('habits.detail')}
        action={<button className="primary" onClick={onAdd}><Plus size={17}/> {t('action.add')}</button>}
      />
      <div className="habit-hero">
        <div><span>ความสม่ำเสมอวันนี้</span><strong>{consistency}%</strong><p>{completedToday}/{habits.length} นิสัยถึงเป้าหมายแล้ว</p></div>
        <div className="week-dots" aria-label="ภาพรวม 7 วัน">{days.map((day) => <span className={habits.some((habit) => habit.completedDates.includes(day.key)) ? 'filled' : ''} key={day.key}>{day.label}</span>)}</div>
      </div>
      <div className="habit-table">
        <div className="habit-table-head"><span>นิสัย</span><span>เป้าหมาย</span><span>ต่อเนื่อง</span><span>ความคืบหน้าวันนี้</span></div>
        {habits.map((habit) => {
          const value = todayValue(habit)
          const completed = value >= habit.target
          const progress = Math.min(100, Math.round((value / habit.target) * 100))
          return (
            <div className={`habit-table-row ${completed ? 'complete' : ''}`} key={habit.id}>
              <div className="habit-identity">
                <span className="habit-symbol"><Flame size={18}/></span>
                <div><strong>{habit.title}</strong><small>{habit.cue || 'ไม่มีเงื่อนไข'} · {typeLabels[habit.type]}</small></div>
              </div>
              <span className="habit-target">{habit.target} {habit.unit}</span>
              <span className="habit-streak"><Flame size={14}/> {habit.streak} วัน</span>
              <div className="habit-today">
                {habit.type === 'boolean' ? (
                  <button
                    type="button"
                    aria-label={`${completed ? 'ยกเลิกเช็กอิน' : 'เช็กอิน'} ${habit.title}`}
                    onClick={() => onHabitValue(habit, completed ? null : habit.target)}
                    className={`habit-toggle ${completed ? 'done' : ''}`}
                  >
                    {completed ? <Check/> : <Circle/>}<span>{completed ? 'ทำแล้ว' : 'เช็กอิน'}</span>
                  </button>
                ) : (
                  <form className="habit-value-form" onSubmit={(event) => {
                    event.preventDefault()
                    const nextValue = Number(draftValues[habit.id] || 0)
                    onHabitValue(habit, nextValue > 0 ? nextValue : null)
                  }}>
                    <label><span className="sr-only">ค่าของ {habit.title}</span><input aria-label={`ค่าของ ${habit.title}`} type="number" min="0" step="any" value={draftValues[habit.id] ?? ''} onChange={(event) => setDraftValues((current) => ({ ...current, [habit.id]: event.target.value }))}/><em>{habit.unit}</em></label>
                    <button type="submit">บันทึก</button>
                  </form>
                )}
                <div className="habit-progress" aria-label={`${progress}%`}><span style={{ width: `${progress}%` }}/></div>
                <small>{value} / {habit.target} {habit.unit}</small>
              </div>
            </div>
          )
        })}
        {!habits.length && <div className="grid min-h-48 place-items-center text-sm text-muted">ยังไม่มีนิสัย กด “เพิ่ม” เพื่อเริ่มติดตาม</div>}
      </div>
    </>
  )
}
