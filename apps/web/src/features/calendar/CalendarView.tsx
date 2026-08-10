import type { Task } from '@cadentra/domain'
import { PageHeading } from '../../components/PageHeading'
import { useI18n } from '../../i18n/LocaleProvider'
import { formatTime } from '../../lib/date'

interface CalendarViewProps {
  tasks: Task[]
  onTask: (task: Task) => void
}

const weekDays = ['จ. 3', 'อ. 4', 'พ. 5', 'พฤ. 6', 'ศ. 7']

export function CalendarView({ tasks, onTask }: CalendarViewProps) {
  const { t } = useI18n()

  return (
    <>
      <PageHeading
        eyebrow={t('calendar.eyebrow')}
        title={t('calendar.title')}
        detail={t('calendar.detail')}
        action={<div className="segmented"><button>วัน</button><button className="active">สัปดาห์</button><button>เดือน</button></div>}
      />
      <div className="calendar-board">
        <div className="calendar-corner">GMT+7</div>
        {weekDays.map((day, index) => (
          <div className={index === 1 ? 'calendar-day active' : 'calendar-day'} key={day}>
            {day}<strong>{index + 3}</strong>
          </div>
        ))}
        {Array.from({ length: 10 }, (_, row) => <div className="calendar-hour" key={row}>{8 + row}:00</div>)}
        <div className="calendar-grid-lines">{Array.from({ length: 50 }, (_, index) => <i key={index}/>)}</div>
        {tasks.map((task) => {
          const start = new Date(task.start)
          const duration = (new Date(task.end).getTime() - start.getTime()) / 3_600_000
          return (
            <button
              key={task.id}
              className={`calendar-block ${task.status}`}
              onClick={() => onTask(task)}
              style={{ gridColumn: 3, gridRow: `${start.getHours() - 8 + 3} / span ${Math.max(1, Math.round(duration))}` }}
            >
              {task.title}<small>{formatTime(task.start)}</small>
            </button>
          )
        })}
      </div>
    </>
  )
}
