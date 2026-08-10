import { AlertTriangle } from 'lucide-react'
import { conflictingTaskIds, type Task } from '@cadentra/domain'
import { PageHeading } from '../../components/PageHeading'
import { useI18n } from '../../i18n/LocaleProvider'
import { formatTime, localDateKey } from '../../lib/date'

interface CalendarViewProps {
  tasks: Task[]
  onTask: (task: Task) => void
}

function currentWorkWeek() {
  const today = new Date()
  const monday = new Date(today)
  const day = today.getDay() || 7
  monday.setDate(today.getDate() - day + 1)
  monday.setHours(0, 0, 0, 0)
  return Array.from({ length: 5 }, (_, index) => {
    const date = new Date(monday)
    date.setDate(monday.getDate() + index)
    return { date, key: localDateKey(date) }
  })
}

export function CalendarView({ tasks, onTask }: CalendarViewProps) {
  const { t } = useI18n()
  const weekDays = currentWorkWeek()
  const today = localDateKey(new Date())
  const visibleTasks = tasks.filter((task) => weekDays.some((day) => day.key === localDateKey(task.start)))
  const conflictIds = conflictingTaskIds(visibleTasks)
  const weekLabel = `${new Intl.DateTimeFormat('th-TH', { day: 'numeric', month: 'short' }).format(weekDays[0].date)} – ${new Intl.DateTimeFormat('th-TH', { day: 'numeric', month: 'short' }).format(weekDays[4].date)}`

  return (
    <>
      <PageHeading
        eyebrow={weekLabel}
        title={t('calendar.title')}
        detail={t('calendar.detail')}
        action={<div className="segmented"><button>วัน</button><button className="active">สัปดาห์</button><button>เดือน</button></div>}
      />
      {!visibleTasks.length && <p className="mb-4 text-sm text-muted">ยังไม่มีงานที่กำหนดเวลาในสัปดาห์นี้</p>}
      <div className="calendar-board">
        <div className="calendar-corner">{Intl.DateTimeFormat().resolvedOptions().timeZone}</div>
        {weekDays.map(({ date, key }) => (
          <div className={key === today ? 'calendar-day active' : 'calendar-day'} key={key}>
            {new Intl.DateTimeFormat('th-TH', { weekday: 'short' }).format(date)}<strong>{date.getDate()}</strong>
          </div>
        ))}
        {Array.from({ length: 10 }, (_, row) => <div className="calendar-hour" key={row}>{8 + row}:00</div>)}
        <div className="calendar-grid-lines">{Array.from({ length: 50 }, (_, index) => <i key={index}/>)}</div>
        {visibleTasks.map((task) => {
          const start = new Date(task.start)
          const dayIndex = weekDays.findIndex((day) => day.key === localDateKey(task.start))
          const duration = (new Date(task.end).getTime() - start.getTime()) / 3_600_000
          return (
            <button
              key={task.id}
              className={`calendar-block ${task.status} ${conflictIds.has(task.id) ? 'border-l-[#b66a3c]! bg-[#f2e4db]! text-[#8f4f2e]!' : ''}`}
              onClick={() => onTask(task)}
              style={{ gridColumn: dayIndex + 2, gridRow: `${Math.max(3, start.getHours() - 8 + 3)} / span ${Math.max(1, Math.round(duration))}` }}
            >
              <span className="flex items-center gap-1">{conflictIds.has(task.id) && <AlertTriangle size={10} aria-label="เวลาชน"/>}{task.title}</span><small>{formatTime(task.start)}</small>
            </button>
          )
        })}
      </div>
    </>
  )
}
