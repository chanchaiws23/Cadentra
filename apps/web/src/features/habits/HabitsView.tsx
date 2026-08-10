import { Check, Circle, Flame, Plus } from 'lucide-react'
import type { Habit } from '@cadentra/domain'
import { PageHeading } from '../../components/PageHeading'
import { useI18n } from '../../i18n/LocaleProvider'
import { todayKey } from '../../lib/date'

interface HabitsViewProps {
  habits: Habit[]
  onHabit: (habit: Habit) => void
}

const weekDays = ['จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส', 'อา']

export function HabitsView({ habits, onHabit }: HabitsViewProps) {
  const { t } = useI18n()

  return (
    <>
      <PageHeading
        eyebrow={t('habits.eyebrow')}
        title={t('habits.title')}
        detail={t('habits.detail')}
        action={<button className="primary"><Plus size={17}/> {t('action.add')}</button>}
      />
      <div className="habit-hero">
        <div><span>ความสม่ำเสมอสัปดาห์นี้</span><strong>82%</strong><p>ดีขึ้น 9% จากสัปดาห์ก่อน</p></div>
        <div className="week-dots">{weekDays.map((day, index) => <span className={index < 5 ? 'filled' : ''} key={day}>{day}</span>)}</div>
      </div>
      <div className="habit-table">
        <div className="habit-table-head"><span>นิสัย</span><span>เป้าหมาย</span><span>Streak</span><span>วันนี้</span></div>
        {habits.map((habit) => {
          const completed = habit.completedDates.includes(todayKey)
          return (
            <div className="habit-table-row" key={habit.id}>
              <div>
                <span className="habit-symbol"><Flame size={18}/></span>
                <div><strong>{habit.title}</strong><small>{habit.cue}</small></div>
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
      </div>
    </>
  )
}
