import { useState } from 'react'
import * as AlertDialog from '@radix-ui/react-alert-dialog'
import { AlertTriangle, CalendarRange, Check, ChevronLeft, ChevronRight, Clock3, GripVertical, Minus, Plus } from 'lucide-react'
import { conflictingTaskIds, findScheduleConflicts, type ExternalCalendarEvent, type Task } from '@cadentra/domain'
import { PageHeading } from '../../components/PageHeading'
import { useI18n } from '../../i18n/LocaleContext'
import { formatTime, localDateKey } from '../../lib/date'
import { shiftSchedule } from './schedule'

interface CalendarViewProps {
  tasks: Task[]
  externalEvents: ExternalCalendarEvent[]
  onTask: (task: Task) => void
  onReschedule: (task: Task, start: string, end: string) => void | Promise<void>
}

interface ScheduleProposal {
  task: Task
  start: string
  end: string
  conflicts: Task[]
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

function SchedulePreview({ proposal, onCancel, onConfirm }: { proposal: ScheduleProposal; onCancel: () => void; onConfirm: () => void }) {
  const dateLabel = (value: string) => new Intl.DateTimeFormat('th-TH', { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(value))
  const oldRange = `${dateLabel(proposal.task.start)} · ${formatTime(proposal.task.start)}–${formatTime(proposal.task.end)}`
  const newRange = `${dateLabel(proposal.start)} · ${formatTime(proposal.start)}–${formatTime(proposal.end)}`
  return (
    <AlertDialog.Root open onOpenChange={(open) => !open && onCancel()}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-[70] bg-[#20231f66] backdrop-blur-[3px]"/>
        <AlertDialog.Content className="fixed top-1/2 left-1/2 z-[71] w-[min(460px,calc(100%-32px))] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-line bg-surface p-6 text-ink shadow-[0_30px_90px_rgba(32,35,31,0.28)]">
          <span className="mb-4 grid size-10 place-items-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]"><CalendarRange size={20}/></span>
          <AlertDialog.Title className="font-display m-0 text-[24px] font-medium">ตรวจสอบเวลาใหม่</AlertDialog.Title>
          <AlertDialog.Description className="mt-2 mb-0 text-[13px] leading-6 text-muted">{proposal.task.title}</AlertDialog.Description>
          <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3 border-y border-line py-4 text-center">
            <div><small className="block text-[10px] text-muted">เวลาเดิม</small><strong className="mt-1 block text-[13px]">{oldRange}</strong></div>
            <ChevronRight size={16} className="text-muted"/>
            <div><small className="block text-[10px] text-muted">เวลาใหม่</small><strong className="mt-1 block text-[13px] text-[var(--accent)]">{newRange}</strong></div>
          </div>
          {proposal.conflicts.length > 0 ? (
            <div className="mt-4 flex gap-3 bg-[#f4ece6] px-4 py-3 text-[12px] text-[#75452e]" role="alert">
              <AlertTriangle size={16} className="mt-0.5 shrink-0"/><p className="m-0"><strong>เวลาชน {proposal.conflicts.length} งาน</strong><br/>{proposal.conflicts.map((task) => task.title).join(', ')}</p>
            </div>
          ) : <p className="mt-4 mb-0 text-[12px] text-[var(--accent)]">ช่วงเวลานี้ไม่มีงานชนกัน</p>}
          <div className="mt-6 flex justify-end gap-2.5 max-[480px]:flex-col-reverse">
            <AlertDialog.Cancel asChild><button className="secondary max-[480px]:w-full" onClick={onCancel}>ยกเลิก</button></AlertDialog.Cancel>
            <AlertDialog.Action asChild><button className="primary max-[480px]:w-full" onClick={onConfirm}>{proposal.conflicts.length ? 'ยืนยันแม้เวลาชน' : 'บันทึกเวลาใหม่'}</button></AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  )
}

export function CalendarView({ tasks, externalEvents, onTask, onReschedule }: CalendarViewProps) {
  const { t } = useI18n()
  const [mode, setMode] = useState<'day' | 'week' | 'month'>('week')
  const [selectedDate, setSelectedDate] = useState(() => localDateKey(new Date()))
  const weekDays = currentWorkWeek()
  const today = localDateKey(new Date())
  const visibleTasks = tasks.filter((task) => weekDays.some((day) => day.key === localDateKey(task.start)))
  const visibleExternalEvents = externalEvents.filter((event) => weekDays.some((day) => day.key === localDateKey(event.start)))
  const conflictIds = conflictingTaskIds(visibleTasks)
  const [selectedId, setSelectedId] = useState<string>()
  const [proposal, setProposal] = useState<ScheduleProposal>()
  const selectedTask = visibleTasks.find((task) => task.id === selectedId)
  const weekLabel = `${new Intl.DateTimeFormat('th-TH', { day: 'numeric', month: 'short' }).format(weekDays[0].date)} – ${new Intl.DateTimeFormat('th-TH', { day: 'numeric', month: 'short' }).format(weekDays[4].date)}`

  const preview = (task: Task, next: Pick<Task, 'start' | 'end'>) => {
    if (task.recurrenceRule) return
    setProposal({ task, ...next, conflicts: findScheduleConflicts(tasks, next, task.id) })
  }

  const previewDrop = (task: Task, date: Date, hour: number) => {
    const oldStart = new Date(task.start)
    const start = new Date(date)
    start.setHours(hour, 0, 0, 0)
    const duration = new Date(task.end).getTime() - oldStart.getTime()
    preview(task, { start: start.toISOString(), end: new Date(start.getTime() + duration).toISOString() })
  }

  const selectedDayIndex = selectedTask ? weekDays.findIndex((day) => day.key === localDateKey(selectedTask.start)) : -1
  const selectedHour = selectedTask ? new Date(selectedTask.start).getHours() : 0
  const selectedEndHour = selectedTask ? new Date(selectedTask.end).getHours() + new Date(selectedTask.end).getMinutes() / 60 : 0
  const dayTasks = tasks.filter((task) => localDateKey(task.start) === selectedDate).sort((a, b) => a.start.localeCompare(b.start))
  const dayExternalEvents = externalEvents.filter((event) => localDateKey(event.start) === selectedDate).sort((a, b) => a.start.localeCompare(b.start))
  const monthAnchor = new Date()
  const monthStart = new Date(monthAnchor.getFullYear(), monthAnchor.getMonth(), 1)
  const gridStart = new Date(monthStart)
  gridStart.setDate(1 - monthStart.getDay())
  const monthDays = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart)
    date.setDate(gridStart.getDate() + index)
    return date
  })
  const headingLabel = mode === 'month'
    ? new Intl.DateTimeFormat('th-TH', { month: 'long', year: 'numeric' }).format(monthAnchor)
    : mode === 'day'
      ? new Intl.DateTimeFormat('th-TH', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(`${selectedDate}T12:00:00`))
      : weekLabel

  return (
    <>
      <PageHeading eyebrow={headingLabel} title={t('calendar.title')} detail="ลากงานเพื่อย้ายเวลา หรือเลือกงานเพื่อปรับอย่างละเอียด" action={<div className="segmented" role="group" aria-label="มุมมองปฏิทิน"><button aria-pressed={mode === 'day'} className={mode === 'day' ? 'active' : ''} onClick={() => { setSelectedDate(today); setMode('day') }}>วัน</button><button aria-pressed={mode === 'week'} className={mode === 'week' ? 'active' : ''} onClick={() => setMode('week')}>สัปดาห์</button><button aria-pressed={mode === 'month'} className={mode === 'month' ? 'active' : ''} onClick={() => setMode('month')}>เดือน</button></div>}/>

      {selectedTask && (
        <section className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-3 border-y border-[var(--line)] py-3" aria-label={`แก้ตาราง ${selectedTask.title}`}>
          <div className="mr-auto min-w-40"><strong className="block text-[13px]">{selectedTask.title}</strong><small className="text-[10px] text-muted">{formatTime(selectedTask.start)}–{formatTime(selectedTask.end)}</small></div>
          {selectedTask.recurrenceRule ? <p className="m-0 text-[11px] text-muted">งานประจำต้องแก้จากการตั้งค่าทั้งชุด</p> : (
            <>
              <div className="flex items-center gap-1" aria-label="ย้ายวัน">
                <button className="filter-button px-2!" disabled={selectedDayIndex <= 0} onClick={() => preview(selectedTask, shiftSchedule(selectedTask, 0, -1))} aria-label="ย้ายไปวันก่อน"><ChevronLeft size={14}/></button>
                <span className="px-1 text-[10px] text-muted">วัน</span>
                <button className="filter-button px-2!" disabled={selectedDayIndex >= 4} onClick={() => preview(selectedTask, shiftSchedule(selectedTask, 0, 1))} aria-label="ย้ายไปวันถัดไป"><ChevronRight size={14}/></button>
              </div>
              <div className="flex items-center gap-1" aria-label="ย้ายเวลา">
                <button className="filter-button px-2!" disabled={selectedHour <= 8} onClick={() => preview(selectedTask, shiftSchedule(selectedTask, -15))} aria-label="ย้ายก่อน 15 นาที"><Minus size={14}/></button>
                <span className="px-1 text-[10px] text-muted"><Clock3 size={13}/></span>
                <button className="filter-button px-2!" disabled={selectedEndHour >= 18} onClick={() => preview(selectedTask, shiftSchedule(selectedTask, 15))} aria-label="ย้ายหลัง 15 นาที"><Plus size={14}/></button>
              </div>
              <div className="flex items-center gap-1" aria-label="ปรับระยะเวลา">
                <button className="filter-button px-2!" onClick={() => preview(selectedTask, shiftSchedule(selectedTask, 0, 0, -15))} aria-label="ลดระยะเวลา 15 นาที"><Minus size={14}/></button>
                <span className="px-1 text-[10px] text-muted">ระยะเวลา</span>
                <button className="filter-button px-2!" disabled={selectedEndHour >= 18} onClick={() => preview(selectedTask, shiftSchedule(selectedTask, 0, 0, 15))} aria-label="เพิ่มระยะเวลา 15 นาที"><Plus size={14}/></button>
              </div>
            </>
          )}
          <button className="text-button text-[11px]" onClick={() => onTask(selectedTask)}><Check size={14}/>{selectedTask.status === 'done' ? 'เปิดอีกครั้ง' : 'ทำเสร็จ'}</button>
        </section>
      )}

      {mode === 'day' && <section className="calendar-agenda" aria-label={`ตารางวันที่ ${selectedDate}`}>
        {!dayTasks.length && !dayExternalEvents.length && <div className="calendar-empty"><CalendarRange size={24}/><strong>วันนี้ยังไม่มีรายการ</strong><small>กด “เพิ่ม” เพื่อวางงานลงในตาราง</small></div>}
        {dayTasks.map((task) => <button type="button" key={task.id} className={task.status === 'done' ? 'done' : ''} onClick={() => setSelectedId(task.id)}><time>{formatTime(task.start)}</time><span><strong>{task.title}</strong><small>{formatTime(task.start)}–{formatTime(task.end)} · {task.category}</small></span><em className={`priority ${task.priority}`}>{task.priority}</em></button>)}
        {dayExternalEvents.map((event) => <div key={event.id}><time>{event.allDay ? 'ทั้งวัน' : formatTime(event.start)}</time><span><strong>{event.title}</strong><small>Google Calendar · อ่านอย่างเดียว</small></span><CalendarRange size={16}/></div>)}
      </section>}

      {mode === 'month' && <section className="calendar-month" aria-label="ปฏิทินรายเดือน">
        {['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'].map((label) => <strong className="calendar-month-weekday" key={label}>{label}</strong>)}
        {monthDays.map((date) => {
          const key = localDateKey(date)
          const count = tasks.filter((task) => localDateKey(task.start) === key).length + externalEvents.filter((event) => localDateKey(event.start) === key).length
          return <button type="button" key={key} className={`${date.getMonth() === monthAnchor.getMonth() ? '' : 'outside'} ${key === today ? 'today' : ''}`} onClick={() => { setSelectedDate(key); setMode('day') }} aria-label={`${new Intl.DateTimeFormat('th-TH', { dateStyle: 'long' }).format(date)}${count ? ` มี ${count} รายการ` : ' ไม่มีรายการ'}`}><span>{date.getDate()}</span>{count > 0 && <em>{count}</em>}</button>
        })}
      </section>}

      {mode === 'week' && <>{!visibleTasks.length && !visibleExternalEvents.length && <p className="mb-4 text-sm text-muted">ยังไม่มีงานหรือนัดหมายในสัปดาห์นี้</p>}
      <div className="calendar-board">
        <div className="calendar-corner">{Intl.DateTimeFormat().resolvedOptions().timeZone}</div>
        {weekDays.map(({ date, key }) => <div className={key === today ? 'calendar-day active' : 'calendar-day'} key={key}>{new Intl.DateTimeFormat('th-TH', { weekday: 'short' }).format(date)}<strong>{date.getDate()}</strong></div>)}
        {Array.from({ length: 10 }, (_, row) => <div className="calendar-hour" key={row}>{8 + row}:00</div>)}
        <div className="calendar-grid-lines">
          {Array.from({ length: 50 }, (_, index) => {
            const dayIndex = index % 5
            const hour = 8 + Math.floor(index / 5)
            return <button key={index} tabIndex={-1} className="border-r border-b border-[var(--line)] bg-transparent p-0 hover:bg-[var(--accent-soft)]" aria-label={`ย้ายไป ${weekDays[dayIndex].key} เวลา ${hour}:00`} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); const task = visibleTasks.find((entry) => entry.id === event.dataTransfer.getData('text/task-id')); if (task) previewDrop(task, weekDays[dayIndex].date, hour) }}/>
          })}
        </div>
        {visibleTasks.map((task) => {
          const start = new Date(task.start)
          const dayIndex = weekDays.findIndex((day) => day.key === localDateKey(task.start))
          const duration = (new Date(task.end).getTime() - start.getTime()) / 3_600_000
          return (
            <button key={task.id} draggable={!task.recurrenceRule} className={`calendar-block ${task.status} ${selectedId === task.id ? 'ring-2 ring-[var(--accent)] ring-offset-1' : ''} ${conflictIds.has(task.id) ? 'border-l-[#b66a3c]! bg-[#f2e4db]! text-[#8f4f2e]!' : ''}`} onClick={() => setSelectedId(task.id)} onDragStart={(event) => { event.dataTransfer.setData('text/task-id', task.id); event.dataTransfer.effectAllowed = 'move' }} style={{ gridColumn: dayIndex + 2, gridRow: `${Math.max(3, start.getHours() - 8 + 3)} / span ${Math.max(1, Math.round(duration))}` }}>
              <span className="flex items-center gap-1">{!task.recurrenceRule && <GripVertical size={10}/>} {conflictIds.has(task.id) && <AlertTriangle size={10} aria-label="เวลาชน"/>}{task.title}</span><small>{formatTime(task.start)}</small>
            </button>
          )
        })}
        {visibleExternalEvents.map((event) => {
          const start = new Date(event.start)
          const dayIndex = weekDays.findIndex((day) => day.key === localDateKey(event.start))
          const duration = event.allDay ? 1 : (new Date(event.end).getTime() - start.getTime()) / 3_600_000
          return <div key={event.id} className="calendar-block border-l-[#6b7280]! bg-[#ececea]! text-[#4d534e]!" title="นำเข้าจาก Google Calendar · อ่านอย่างเดียว" style={{ gridColumn: dayIndex + 2, gridRow: `${event.allDay ? 3 : Math.max(3, start.getHours() - 8 + 3)} / span ${Math.max(1, Math.round(duration))}` }}><span className="flex items-center gap-1"><CalendarRange size={10}/>{event.title}</span><small>{event.allDay ? 'ทั้งวัน · Google' : `${formatTime(event.start)} · Google`}</small></div>
        })}
      </div></>}

      {proposal && (
        <SchedulePreview
          proposal={proposal}
          onCancel={() => setProposal(undefined)}
          onConfirm={() => { void onReschedule(proposal.task, proposal.start, proposal.end); setProposal(undefined) }}
        />
      )}
    </>
  )
}
