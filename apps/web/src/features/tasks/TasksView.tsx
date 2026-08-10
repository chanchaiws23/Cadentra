import { useState } from 'react'
import { AlertTriangle, Check, Circle, Minus, Plus, Repeat2, Trash2 } from 'lucide-react'
import type { Task } from '@cadentra/domain'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { PageHeading } from '../../components/PageHeading'
import { useI18n } from '../../i18n/LocaleProvider'
import { formatTime, localDateKey, todayKey } from '../../lib/date'

interface TasksViewProps {
  tasks: Task[]
  onTask: (task: Task) => void
  onDelete: (task: Task) => void
  onAdd: () => void
}

interface RecurringSeries {
  id: string
  tasks: Task[]
  representative: Task
  today?: Task
  duplicateCount: number
}

const weekdayLabels = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.']
const priorityLabels = { high: 'สำคัญ', medium: 'ปกติ', low: 'ยืดหยุ่น' }

function startOfCurrentWeek(): Date {
  const date = new Date()
  date.setHours(12, 0, 0, 0)
  const distanceFromMonday = (date.getDay() + 6) % 7
  date.setDate(date.getDate() - distanceFromMonday)
  return date
}

function currentWeek() {
  const monday = startOfCurrentWeek()
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday)
    date.setDate(monday.getDate() + index)
    return { key: localDateKey(date), label: weekdayLabels[date.getDay()], day: date.getDay() }
  })
}

function scheduleLabel(task: Task): string {
  if (task.recurrenceRule === 'FREQ=DAILY') return 'ทุกวัน'
  if (task.recurrenceRule === 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR') return 'จ.–ศ.'
  if (task.recurrenceRule === 'FREQ=WEEKLY') {
    return `ทุกวัน${new Intl.DateTimeFormat('th-TH', { weekday: 'long' }).format(new Date(task.start))}`
  }
  return 'งานประจำ'
}

function scheduledDays(series: RecurringSeries) {
  const week = currentWeek()
  const rule = series.representative.recurrenceRule
  if (rule === 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR') return week.slice(0, 5)
  if (rule === 'FREQ=WEEKLY') {
    const scheduledDay = new Date(series.representative.start).getDay()
    return week.filter((day) => day.day === scheduledDay)
  }
  return week
}

function occurrenceState(task: Task | undefined, dateKey: string): { label: string; className: string; icon: 'check' | 'minus' | 'circle' } {
  if (!task) return { label: 'ไม่ได้นับ', className: 'border-[#d8dad3] bg-[var(--paper)] text-[#b8bbb2]', icon: 'circle' }
  if (task?.status === 'done') return { label: 'ทำแล้ว', className: 'border-[var(--accent)] bg-[var(--accent)] text-white', icon: 'check' }
  if (dateKey === todayKey) return { label: 'วันนี้', className: 'border-[var(--accent)] bg-[var(--paper)] text-[var(--accent)] ring-4 ring-[var(--accent-soft)]', icon: 'circle' }
  if (dateKey < todayKey) return { label: 'พลาด', className: 'border-[#c98a68] bg-[var(--paper)] text-[#a45b38]', icon: 'minus' }
  return { label: 'รอทำ', className: 'border-[#cfd1c9] bg-[var(--paper)] text-[#a2a69d]', icon: 'circle' }
}

function taskDateLabel(task: Task): string {
  if (localDateKey(task.start) === todayKey) return 'วันนี้'
  return new Intl.DateTimeFormat('th-TH', { day: 'numeric', month: 'short' }).format(new Date(task.start))
}

function createRecurringSeries(tasks: Task[]): RecurringSeries[] {
  const grouped = new Map<string, Task[]>()
  tasks.filter((task) => task.recurrenceRule).forEach((task) => {
    const id = task.sourceTaskId ?? task.id
    grouped.set(id, [...(grouped.get(id) ?? []), task])
  })

  const rawSeries = [...grouped.entries()].map(([id, seriesTasks]) => {
    const sorted = [...seriesTasks].sort((a, b) => (a.occurrenceDate ?? localDateKey(a.start)).localeCompare(b.occurrenceDate ?? localDateKey(b.start)))
    const today = sorted.find((task) => (task.occurrenceDate ?? localDateKey(task.start)) === todayKey)
    const representative = today ?? sorted.find((task) => (task.occurrenceDate ?? localDateKey(task.start)) > todayKey) ?? sorted.at(-1)!
    return { id, tasks: sorted, representative, today }
  })

  const signatureCounts = new Map<string, number>()
  const signature = (series: Omit<RecurringSeries, 'duplicateCount'>) => [
    series.representative.title.trim().toLocaleLowerCase('th-TH'),
    series.representative.recurrenceRule,
    formatTime(series.representative.start),
  ].join('|')

  rawSeries.forEach((series) => signatureCounts.set(signature(series), (signatureCounts.get(signature(series)) ?? 0) + 1))
  return rawSeries.map((series) => ({ ...series, duplicateCount: signatureCounts.get(signature(series)) ?? 1 }))
}

function RecurringTaskRow({ series, onTask, onDelete }: { series: RecurringSeries; onTask: (task: Task) => void; onDelete: (task: Task) => void }) {
  const task = series.representative
  const days = scheduledDays(series)
  const occurrenceByDate = new Map(series.tasks.map((occurrence) => [occurrence.occurrenceDate ?? localDateKey(occurrence.start), occurrence]))
  const todayStatus = series.today
    ? series.today.status === 'done' ? 'วันนี้ทำแล้ว' : series.today.status === 'in_progress' ? 'กำลังทำวันนี้' : 'รอทำวันนี้'
    : 'ไม่มีรอบวันนี้'
  const completedDays = days.filter((day) => occurrenceByDate.get(day.key)?.status === 'done').length

  return (
    <article className="border-b border-[var(--line)] py-5 first:border-t">
      <div className="grid grid-cols-[36px_minmax(0,1fr)_auto_auto] items-start gap-x-3 max-[620px]:grid-cols-[36px_minmax(0,1fr)_auto]">
        <button
          type="button"
          className={`mt-0.5 grid size-8 place-items-center rounded-full border transition-[transform,background-color] hover:scale-105 ${series.today?.status === 'done' ? 'border-[var(--accent)] bg-[var(--accent)] text-white' : 'border-[#aeb3aa] text-[#74786f] hover:border-[var(--accent)] hover:text-[var(--accent)]'} disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:scale-100`}
          aria-label={`เปลี่ยนสถานะวันนี้ ${task.title}`}
          disabled={!series.today}
          onClick={() => series.today && onTask(series.today)}
        >
          {series.today?.status === 'done' ? <Check size={16}/> : <Circle size={16}/>}
        </button>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <strong className="text-[15px] font-semibold text-[var(--ink)]">{task.title}</strong>
            {series.duplicateCount > 1 && <span className="rounded-full bg-[#f3e4d9] px-2 py-0.5 text-[10px] font-semibold text-[#9a4f2c]">ซ้ำ {series.duplicateCount} ชุด</span>}
          </div>
          <p className="mt-1 mb-0 text-[12px] text-muted"><span className="font-semibold text-[var(--accent)]">{scheduleLabel(task)} · {formatTime(task.start)}</span><span className="mx-1.5 text-[#c6c8c0]">/</span>{task.category}</p>
        </div>

        <div className="min-w-24 text-right max-[620px]:col-span-2 max-[620px]:col-start-2 max-[620px]:mt-2 max-[620px]:text-left">
          <p className="m-0 text-[12px] font-semibold text-[var(--ink)]">{completedDays}/{days.length} วัน</p>
          <p className="mt-0.5 mb-0 text-[10px] text-muted">{todayStatus}</p>
        </div>

        <ConfirmDialog
          trigger={<button type="button" className="grid size-8 place-items-center rounded-lg text-muted transition-colors hover:bg-[#f1e5e1] hover:text-[#9b493f] max-[620px]:col-start-3 max-[620px]:row-start-1" aria-label={`ลบงานประจำ ${task.title}`}><Trash2 size={15}/></button>}
          title="ลบงานประจำทั้งชุดหรือไม่"
          description={`“${task.title}” และรอบทั้งหมดในอนาคตจะถูกนำออกจากตาราง`}
          confirmLabel="ลบทั้งชุด"
          tone="danger"
          onConfirm={() => onDelete(task)}
        />
      </div>

      <div className="relative mt-5 ml-11 max-w-[520px]" aria-label={`ตารางสัปดาห์ของ ${task.title}`}>
        {days.length > 1 && <span className="absolute top-3 right-[9%] left-[9%] h-px bg-[var(--line)]" aria-hidden="true"/>}
        <div className="relative grid" style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}>
          {days.map((day) => {
            const state = occurrenceState(occurrenceByDate.get(day.key), day.key)
            return (
              <span key={day.key} className="flex min-w-0 flex-col items-center" aria-label={`${day.label} ${state.label}`}>
                <span className={`z-[1] grid size-6 place-items-center rounded-full border-2 transition-colors ${state.className}`}>
                  {state.icon === 'check' ? <Check size={13}/> : state.icon === 'minus' ? <Minus size={12}/> : <span className="size-1.5 rounded-full bg-current"/>}
                </span>
                <span className={`mt-2 text-[11px] font-semibold ${day.key === todayKey ? 'text-[var(--accent)]' : 'text-[#62665e]'}`}>{day.label}</span>
                <span className="mt-0.5 text-[9px] text-muted max-[420px]:sr-only">{state.label}</span>
              </span>
            )
          })}
        </div>
      </div>
    </article>
  )
}

export function TasksView({ tasks, onTask, onDelete, onAdd }: TasksViewProps) {
  const { t } = useI18n()
  const [taskFilter, setTaskFilter] = useState<'open' | 'done'>('open')
  const recurringSeries = createRecurringSeries(tasks)
  const oneTimeTasks = tasks.filter((task) => !task.recurrenceRule)
  const openTasks = oneTimeTasks.filter((task) => task.status !== 'done').sort((a, b) => a.start.localeCompare(b.start))
  const doneTasks = oneTimeTasks.filter((task) => task.status === 'done').sort((a, b) => b.start.localeCompare(a.start))
  const visibleTasks = taskFilter === 'open' ? openTasks : doneTasks
  const duplicateSeriesCount = recurringSeries.filter((series) => series.duplicateCount > 1).length

  return (
    <>
      <PageHeading
        eyebrow={t('tasks.eyebrow')}
        title={t('tasks.title')}
        detail="ติดตามงานประจำและจัดการงานครั้งเดียว"
        action={<button className="primary" onClick={onAdd}><Plus size={17}/> {t('action.add')}</button>}
      />

      {!tasks.length && <div className="grid min-h-48 place-items-center text-sm text-muted">ยังไม่มีงาน กด “เพิ่ม” เพื่อสร้างงานแรก</div>}

      {recurringSeries.length > 0 && (
        <section aria-labelledby="recurring-heading">
          <div className="flex items-end justify-between gap-4 border-b border-[var(--line)] pb-3">
            <div>
              <div className="flex items-center gap-2">
                <Repeat2 size={16} className="text-[var(--accent)]"/>
                <h2 id="recurring-heading" className="m-0 text-[16px] font-semibold">งานประจำ</h2>
                <span className="text-[11px] text-muted">{recurringSeries.length} ชุด</span>
              </div>
              <p className="mt-1 mb-0 text-[11px] text-muted">ความคืบหน้าสัปดาห์นี้</p>
            </div>
          </div>

          {duplicateSeriesCount > 0 && (
            <div className="mt-4 flex items-start gap-3 border-l-2 border-[#b66a3c] bg-[#f4ece6] px-4 py-3 text-[12px] text-[#75452e]" role="alert">
              <AlertTriangle size={16} className="mt-0.5 shrink-0"/>
              <p className="m-0"><strong>พบงานประจำที่เหมือนกัน {duplicateSeriesCount} ชุด</strong><br/>ข้อมูลยังถูกแยกไว้เพื่อป้องกันการลบผิดชุด คุณสามารถกดถังขยะเพื่อลบชุดที่เกินได้</p>
            </div>
          )}

          <div>{recurringSeries.map((series) => <RecurringTaskRow key={series.id} series={series} onTask={onTask} onDelete={onDelete}/>)}</div>
        </section>
      )}

      {oneTimeTasks.length > 0 && (
        <section className={recurringSeries.length ? 'mt-10' : ''} aria-labelledby="one-time-heading">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] pb-3">
            <div className="flex items-center gap-2">
              <h2 id="one-time-heading" className="m-0 text-[16px] font-semibold">งานครั้งเดียว</h2>
              <span className="text-[11px] text-muted">{oneTimeTasks.length} งาน</span>
            </div>
            <div className="inline-flex rounded-lg bg-[#e8e7e0] p-1" role="group" aria-label="กรองสถานะงาน">
              <button type="button" aria-pressed={taskFilter === 'open'} onClick={() => setTaskFilter('open')} className={`rounded-md border-0 px-3 py-1.5 text-[11px] transition-colors ${taskFilter === 'open' ? 'bg-[var(--surface)] font-semibold text-[var(--ink)] shadow-sm' : 'bg-transparent text-muted'}`}>ต้องทำ <span className="ml-1">{openTasks.length}</span></button>
              <button type="button" aria-pressed={taskFilter === 'done'} onClick={() => setTaskFilter('done')} className={`rounded-md border-0 px-3 py-1.5 text-[11px] transition-colors ${taskFilter === 'done' ? 'bg-[var(--surface)] font-semibold text-[var(--ink)] shadow-sm' : 'bg-transparent text-muted'}`}>เสร็จแล้ว <span className="ml-1">{doneTasks.length}</span></button>
            </div>
          </div>
          <div>
            {visibleTasks.map((task) => (
              <div className={`grid grid-cols-[32px_minmax(0,1fr)_auto_auto] items-center gap-3 border-b border-[var(--line)] px-1 py-4 transition-colors hover:bg-[#eeede7] max-[560px]:grid-cols-[32px_minmax(0,1fr)_auto] ${task.status === 'done' ? 'text-muted' : ''}`} key={task.id}>
                <button className={`grid size-7 place-items-center rounded-full border-0 bg-transparent p-0 text-[#8b8f86] ${task.status === 'done' ? 'bg-[var(--accent)] text-white' : ''}`} aria-label={`เปลี่ยนสถานะ ${task.title}`} onClick={() => onTask(task)}>
                  {task.status === 'done' ? <Check size={15}/> : <Circle size={17}/>}
                </button>
                <div className="min-w-0">
                  <strong className={`block truncate text-[13px] font-semibold ${task.status === 'done' ? 'line-through' : 'text-[var(--ink)]'}`}>{task.title}</strong>
                  <small className="mt-1 block text-[11px] text-muted">{taskDateLabel(task)} · {formatTime(task.start)} · {task.category}</small>
                </div>
                <span className={`text-[10px] font-semibold ${task.priority === 'high' ? 'text-[#9a4f2c]' : 'text-muted'} max-[560px]:hidden`}>{priorityLabels[task.priority]}</span>
                <ConfirmDialog
                  trigger={<button type="button" className="grid size-8 place-items-center rounded-lg text-muted transition-colors hover:bg-[#f1e5e1] hover:text-[#9b493f] max-[560px]:col-start-3 max-[560px]:row-start-1" aria-label={`ลบงาน ${task.title}`}><Trash2 size={15}/></button>}
                  title="ลบงานนี้หรือไม่"
                  description={`“${task.title}” จะถูกนำออกจากตาราง`}
                  confirmLabel="ลบงาน"
                  tone="danger"
                  onConfirm={() => onDelete(task)}
                />
              </div>
            ))}
            {!visibleTasks.length && <p className="m-0 py-10 text-center text-[12px] text-muted">{taskFilter === 'open' ? 'ไม่มีงานค้างอยู่' : 'ยังไม่มีงานที่เสร็จแล้ว'}</p>}
          </div>
        </section>
      )}
    </>
  )
}
