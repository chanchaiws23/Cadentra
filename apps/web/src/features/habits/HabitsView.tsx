import { Check, Circle, Flame, Plus } from 'lucide-react'
import type { Habit } from '@cadentra/domain'
import { PageHeading } from '../../components/PageHeading'
import { useI18n } from '../../i18n/LocaleProvider'
import { localDateKey, todayKey } from '../../lib/date'

interface HabitsViewProps {
  habits: Habit[]
  onHabit: (habit: Habit) => void
  onAdd: () => void
}

function recentDays() {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date()
    date.setDate(date.getDate() - (6 - index))
    return { key: localDateKey(date), label: new Intl.DateTimeFormat('th-TH', { weekday: 'short' }).format(date).replace('.', '') }
  })
}

export function HabitsView({ habits, onHabit, onAdd }: HabitsViewProps) {
  const { t } = useI18n()
  const days = recentDays()
  const completedToday = habits.filter((habit) => habit.completedDates.includes(todayKey)).length
  const consistency = habits.length ? Math.round((completedToday / habits.length) * 100) : 0

  return (
    <>
      <PageHeading
        eyebrow={t('habits.eyebrow')}
        title={t('habits.title')}
        detail={t('habits.detail')}
        action={<button className="primary" onClick={onAdd}><Plus size={17}/> {t('action.add')}</button>}
      />
      <div className="habit-hero">
        <div><span>ความสม่ำเสมอวันนี้</span><strong>{consistency}%</strong><p>{completedToday}/{habits.length} นิสัยที่เช็กอินแล้ว</p></div>
        <div className="week-dots">{days.map((day) => <span className={habits.some((habit) => habit.completedDates.includes(day.key)) ? 'filled' : ''} key={day.key}>{day.label}</span>)}</div>
      </div>
      <div className="habit-table">
        <div className="habit-table-head"><span>นิสัย</span><span>เป้าหมาย</span><span>Streak</span><span>วันนี้</span></div>
        {habits.map((habit) => {
          const completed = habit.completedDates.includes(todayKey)
          return (
            <div className="habit-table-row" key={habit.id}>
              <div>
                <span className="habit-symbol"><Flame size={18}/></span>
                <div><strong>{habit.title}</strong><small>{habit.cue || 'ไม่มีเงื่อนไข'}</small></div>
              </div>
              <span>{habit.target} {habit.unit}</span>
              <span><Flame size={14}/> {habit.streak} วัน</span>
              <button
                aria-label={`${completed ? 'ยกเลิกเช็กอิน' : 'เช็กอิน'} ${habit.title}`}
                onClick={() => onHabit(habit)}
                className={completed ? 'done' : ''}
              >
                {completed ? <Check/> : <Circle/>}
              </button>
            </div>
          )
        })}
        {!habits.length && <div className="grid min-h-48 place-items-center text-sm text-muted">ยังไม่มีนิสัย กด “เพิ่ม” เพื่อเริ่มติดตาม</div>}
      </div>
    </>
  )
}
