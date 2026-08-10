import { Check, ChevronDown, Circle, Flame, Play, Sparkles, Zap } from 'lucide-react'
import type { Habit, Task } from '@cadentra/domain'
import { PageHeading } from '../../components/PageHeading'
import { useI18n } from '../../i18n/LocaleProvider'
import { formatTime, todayKey } from '../../lib/date'

interface TodayViewProps {
  tasks: Task[]
  habits: Habit[]
  rate: number
  completedHabits: number
  onTask: (task: Task) => void
  onHabit: (habit: Habit) => void
  onCoach: () => void
}

export function TodayView({ tasks, habits, rate, completedHabits, onTask, onHabit, onCoach }: TodayViewProps) {
  const { t } = useI18n()

  return (
    <>
      <PageHeading
        eyebrow={t('today.eyebrow')}
        title={t('today.title')}
        detail={t('today.detail')}
        action={<button className="coach-button" onClick={onCoach}><Sparkles size={17}/> {t('action.coach')}</button>}
      />
      <div className="progress-line"><span style={{ width: `${rate}%` }}/></div>
      <div className="daily-summary">
        <div><strong>{rate}%</strong><span>{t('today.plan')}</span></div>
        <div><strong>{tasks.filter((task) => task.status === 'done').length}/{tasks.length}</strong><span>{t('today.tasks')}</span></div>
        <div><strong>{completedHabits}/{habits.length}</strong><span>{t('today.habits')}</span></div>
        <div><strong>1ชม. 30น.</strong><span>{t('today.focusTime')}</span></div>
      </div>
      <div className="today-grid">
        <section className="timeline-section">
          <div className="section-title">
            <div><h2>{t('today.schedule')}</h2><p>{t('today.timezone')}</p></div>
            <button className="text-button">{t('action.schedule')} <ChevronDown size={15}/></button>
          </div>
          <div className="timeline">
            {tasks.map((task) => <TimelineItem key={task.id} task={task} onToggle={() => onTask(task)}/>) }
          </div>
        </section>
        <aside className="context-panel">
          <div className="section-title"><div><h2>{t('today.rhythm')}</h2><p>{completedHabits}/{habits.length} {t('today.completed')}</p></div></div>
          <div className="habit-list compact-list">
            {habits.map((habit) => <HabitRow key={habit.id} habit={habit} onToggle={() => onHabit(habit)}/>)}
          </div>
          <div className="next-focus">
            <span className="focus-icon"><Zap size={18}/></span>
            <div><small>{t('today.nextFocus')}</small><strong>Deep work · 45 นาที</strong></div>
            <button aria-label="เริ่มโฟกัส"><Play size={16} fill="currentColor"/></button>
          </div>
          <blockquote>{t('today.quote')}</blockquote>
        </aside>
      </div>
    </>
  )
}

function TimelineItem({ task, onToggle }: { task: Task; onToggle: () => void }) {
  return (
    <div className={`timeline-item ${task.status}`}>
      <time>{formatTime(task.start)}</time><span className="time-dot"/>
      <div className="timeline-content">
        <button className="check-button" onClick={onToggle} aria-label={task.status === 'done' ? 'ยกเลิกสำเร็จ' : 'ทำสำเร็จ'}>
          {task.status === 'done' ? <Check size={15}/> : <Circle size={15}/>}
        </button>
        <div>
          <strong>{task.title}</strong>
          <small>{formatTime(task.start)}–{formatTime(task.end)} · {task.category}{task.recurring ? ' · ทำซ้ำ' : ''}</small>
        </div>
        <span className={`priority ${task.priority}`}>{task.priority === 'high' ? 'สำคัญ' : task.priority === 'medium' ? 'ปกติ' : 'ยืดหยุ่น'}</span>
      </div>
    </div>
  )
}

function HabitRow({ habit, onToggle }: { habit: Habit; onToggle: () => void }) {
  const complete = habit.completedDates.includes(todayKey)

  return (
    <button className={complete ? 'habit-row complete' : 'habit-row'} onClick={onToggle}>
      <span className="habit-check">{complete && <Check size={15}/>}</span>
      <span><strong>{habit.title}</strong><small>{habit.cue} · {habit.target} {habit.unit}</small></span>
      <em><Flame size={13}/>{habit.streak}</em>
    </button>
  )
}
