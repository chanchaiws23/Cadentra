import { useEffect, useState } from 'react'
import { Check, ChevronDown, Circle, Flame, Play, Sparkles, Zap } from 'lucide-react'
import type { Habit, Task } from '@cadentra/domain'
import { PageHeading } from '../../components/PageHeading'
import { useI18n } from '../../i18n/LocaleContext'
import { formatMinutes, formatTime, todayKey } from '../../lib/date'

interface TodayViewProps {
  tasks: Task[]
  habits: Habit[]
  rate: number
  completedHabits: number
  focusMinutes: number
  displayName: string
  onTask: (task: Task) => boolean | Promise<boolean>
  onHabit: (habit: Habit) => void
  onCoach: () => void
  onOpenCalendar: () => void
  onStartFocus: (task: Task) => void
}

export function TodayView({ tasks, habits, rate, completedHabits, focusMinutes, displayName, onTask, onHabit, onCoach, onOpenCalendar, onStartFocus }: TodayViewProps) {
  const { t } = useI18n()
  const remainingTasks = tasks.filter((task) => task.status !== 'done').length
  const nextTask = tasks.find((task) => task.status !== 'done')
  const now = new Date()
  const dateLabel = new Intl.DateTimeFormat('th-TH', { weekday: 'long', day: 'numeric', month: 'long' }).format(now)
  const greeting = now.getHours() < 12 ? 'สวัสดีตอนเช้า' : now.getHours() < 18 ? 'สวัสดีตอนบ่าย' : 'สวัสดีตอนเย็น'

  return (
    <>
      <PageHeading
        eyebrow={dateLabel}
        title={`${greeting}, ${displayName}`}
        detail={remainingTasks ? `เหลืองานในวันนี้ ${remainingTasks} รายการ` : 'วันนี้ยังไม่มีงานค้างอยู่'}
        action={<button className="coach-button" onClick={onCoach}><Sparkles size={17}/> {t('action.coach')}</button>}
      />
      <div className="progress-line"><span style={{ width: `${rate}%` }}/></div>
      <div className="daily-summary">
        <div><strong>{rate}%</strong><span>{t('today.plan')}</span></div>
        <div><strong>{tasks.filter((task) => task.status === 'done').length}/{tasks.length}</strong><span>{t('today.tasks')}</span></div>
        <div><strong>{completedHabits}/{habits.length}</strong><span>{t('today.habits')}</span></div>
        <div><strong>{formatMinutes(focusMinutes)}</strong><span>{t('today.focusTime')}</span></div>
      </div>
      <div className="today-grid">
        <section className="timeline-section">
          <div className="section-title">
            <div><h2>{t('today.schedule')}</h2><p>{Intl.DateTimeFormat().resolvedOptions().timeZone}</p></div>
            <button className="text-button" onClick={onOpenCalendar}>{t('action.schedule')} <ChevronDown size={15}/></button>
          </div>
          <div className="timeline">
            {tasks.map((task) => <TimelineItem key={task.id} task={task} onToggle={() => onTask(task)}/>) }
            {!tasks.length && <div className="grid min-h-40 place-items-center text-sm text-muted">ยังไม่มีงานในวันนี้ กด “เพิ่ม” เพื่อวางงานแรก</div>}
          </div>
        </section>
        <aside className="context-panel">
          <div className="section-title"><div><h2>{t('today.rhythm')}</h2><p>{completedHabits}/{habits.length} {t('today.completed')}</p></div></div>
          <div className="habit-list compact-list">
            {habits.map((habit) => <HabitRow key={habit.id} habit={habit} onToggle={() => onHabit(habit)}/>)}
            {!habits.length && <p className="py-6 text-sm text-muted">ยังไม่มีนิสัยที่ติดตาม</p>}
          </div>
          <div className="next-focus">
            <span className="focus-icon"><Zap size={18}/></span>
            <div><small>{t('today.nextFocus')}</small><strong>{nextTask?.title ?? 'ยังไม่ได้เลือกงาน'}</strong></div>
            <button aria-label="เริ่มโฟกัส" disabled={!nextTask} onClick={() => nextTask && onStartFocus(nextTask)}><Play size={16} fill="currentColor"/></button>
          </div>
          <blockquote>{t('today.quote')}</blockquote>
        </aside>
      </div>
    </>
  )
}

function TimelineItem({ task, onToggle }: { task: Task; onToggle: () => boolean | Promise<boolean> }) {
  const [status, setStatus] = useState(task.status)
  const [busy, setBusy] = useState(false)
  useEffect(() => setStatus(task.status), [task.status])
  const done = status === 'done'
  const toggle = async () => {
    if (busy) return
    const previous = status
    setStatus(done ? 'planned' : 'done')
    setBusy(true)
    const saved = await onToggle()
    if (!saved) setStatus(previous)
    setBusy(false)
  }
  return (
    <div className={`timeline-item ${status}`}>
      <time>{formatTime(task.start)}</time><span className="time-dot"/>
      <button type="button" className="timeline-content timeline-action" onClick={() => void toggle()} disabled={busy} aria-pressed={done} aria-label={`${done ? 'ยกเลิกสำเร็จ' : 'ทำสำเร็จ'} ${task.title}`}>
        <span className="check-button" aria-hidden="true">
          {done ? <Check size={15}/> : <Circle size={15}/>}
        </span>
        <div>
          <strong>{task.title}</strong>
          <small>{busy ? 'กำลังบันทึก…' : <>{formatTime(task.start)}–{formatTime(task.end)} · {task.category}{task.recurring ? ' · ทำซ้ำ' : ''}</>}</small>
        </div>
        <span className={`priority ${task.priority}`}>{task.priority === 'high' ? 'สำคัญ' : task.priority === 'medium' ? 'ปกติ' : 'ยืดหยุ่น'}</span>
      </button>
    </div>
  )
}

function HabitRow({ habit, onToggle }: { habit: Habit; onToggle: () => void }) {
  const complete = habit.completedDates.includes(todayKey)
  return (
    <button className={complete ? 'habit-row complete' : 'habit-row'} onClick={onToggle}>
      <span className="habit-check">{complete && <Check size={15}/>}</span>
      <span><strong>{habit.title}</strong><small>{habit.cue || 'ไม่มีเงื่อนไข'} · {habit.target} {habit.unit}</small></span>
      <em><Flame size={13}/>{habit.streak}</em>
    </button>
  )
}
