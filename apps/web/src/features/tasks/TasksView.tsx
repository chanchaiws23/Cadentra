import { AlertTriangle, Check, Circle, Plus, Repeat2, Trash2 } from 'lucide-react'
import type { ItemStatus, Task } from '@cadentra/domain'
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

const groups: ItemStatus[] = ['in_progress', 'planned', 'done']
const groupLabels: Partial<Record<ItemStatus, string>> = {
  in_progress: 'กำลังทำ',
  planned: 'วางแผนแล้ว',
  done: 'สำเร็จ',
}

const weekdayLabels = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.']

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

function occurrenceState(task: Task | undefined, dateKey: string): { label: string; className: string } {
  if (task?.status === 'done') return { label: 'ทำแล้ว', className: 'border-[var(--accent)] bg-[var(--accent)] text-white' }
  if (dateKey === todayKey) return { label: 'วันนี้', className: 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]' }
  if (dateKey < todayKey) return { label: 'ยังไม่ทำ', className: 'border-[#decfc4] bg-[#f4ece6] text-[#8b5d43]' }
  return { label: 'รอทำ', className: 'border-[var(--line)] bg-transparent text-muted' }
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

  return (
    <article className="grid grid-cols-[32px_minmax(0,1fr)_auto] gap-x-3 gap-y-3 border-b border-[var(--line)] py-5 first:border-t max-[620px]:grid-cols-[32px_minmax(0,1fr)]">
      <button
        type="button"
        className={`mt-0.5 grid size-7 place-items-center rounded-full border transition-colors ${series.today?.status === 'done' ? 'border-[var(--accent)] bg-[var(--accent)] text-white' : 'border-[#aeb3aa] text-[#74786f]'} disabled:cursor-not-allowed disabled:opacity-35`}
        aria-label={`เปลี่ยนสถานะวันนี้ ${task.title}`}
        disabled={!series.today}
        onClick={() => series.today && onTask(series.today)}
      >
        {series.today?.status === 'done' ? <Check size={15}/> : <Circle size={15}/>}
      </button>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <strong className="text-[14px] font-semibold text-[var(--ink)]">{task.title}</strong>
          {series.duplicateCount > 1 && <span className="rounded-full bg-[#f3e4d9] px-2 py-0.5 text-[10px] font-semibold text-[#9a4f2c]">ซ้ำ {series.duplicateCount} ชุด</span>}
        </div>
        <p className="mt-1 mb-0 text-[12px] font-medium text-[var(--accent)]">{scheduleLabel(task)} · {formatTime(task.start)}</p>
        <p className="mt-0.5 mb-0 text-[11px] text-muted">{todayStatus} · {task.category}</p>

        <div className="mt-3 flex flex-wrap gap-1.5" aria-label={`ตารางสัปดาห์ของ ${task.title}`}>
          {days.map((day) => {
            const state = occurrenceState(occurrenceByDate.get(day.key), day.key)
            return (
              <span key={day.key} className={`inline-flex min-w-10 flex-col items-center rounded-lg border px-2 py-1.5 ${state.className}`} aria-label={`${day.label} ${state.label}`}>
                <span className="text-[11px] font-semibold">{day.label}</span>
                <span className="mt-0.5 text-[8px] opacity-80">{state.label}</span>
              </span>
            )
          })}
        </div>
      </div>

      <ConfirmDialog
        trigger={<button type="button" className="grid size-8 place-items-center rounded-lg text-muted transition-colors hover:bg-[#f1e5e1] hover:text-[#9b493f] max-[620px]:col-start-2 max-[620px]:row-start-1 max-[620px]:justify-self-end" aria-label={`ลบงานประจำ ${task.title}`}><Trash2 size={15}/></button>}
        title="ลบงานประจำทั้งชุดหรือไม่"
        description={`“${task.title}” และรอบทั้งหมดในอนาคตจะถูกนำออกจากตาราง`}
        confirmLabel="ลบทั้งชุด"
        tone="danger"
        onConfirm={() => onDelete(task)}
      />
    </article>
  )
}

export function TasksView({ tasks, onTask, onDelete, onAdd }: TasksViewProps) {
  const { t } = useI18n()
  const recurringSeries = createRecurringSeries(tasks)
  const oneTimeTasks = tasks.filter((task) => !task.recurrenceRule)
  const duplicateSeriesCount = recurringSeries.filter((series) => series.duplicateCount > 1).length

  return (
    <>
      <PageHeading
        eyebrow={t('tasks.eyebrow')}
        title={t('tasks.title')}
        detail="เห็นงานประจำทั้งสัปดาห์ และจัดการงานครั้งเดียวได้ในที่เดียว"
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
              <p className="mt-1 mb-0 text-[11px] text-muted">เช็กสถานะของวันนี้ได้จากปุ่มด้านหน้า โดยไม่กระทบวันอื่น</p>
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
          <div className="flex items-center gap-2 border-b border-[var(--line)] pb-3">
            <h2 id="one-time-heading" className="m-0 text-[16px] font-semibold">งานครั้งเดียว</h2>
            <span className="text-[11px] text-muted">{oneTimeTasks.length} งาน</span>
          </div>
          <div className="task-groups">
            {groups.map((group) => {
              const groupTasks = oneTimeTasks.filter((task) => task.status === group)
              if (!groupTasks.length) return null
              return (
                <section key={group}>
                  <div className="group-heading"><h2>{groupLabels[group]}</h2><span>{groupTasks.length}</span></div>
                  {groupTasks.map((task) => (
                    <div className="task-row" key={task.id}>
                      <button className="check-button" aria-label={`เปลี่ยนสถานะ ${task.title}`} onClick={() => onTask(task)}>
                        {task.status === 'done' ? <Check size={15}/> : <Circle size={15}/>}
                      </button>
                      <div><strong>{task.title}</strong><small>{task.category} · {formatTime(task.start)}</small></div>
                      <span className={`priority ${task.priority}`}>{task.priority}</span>
                      <ConfirmDialog
                        trigger={<button type="button" className="grid size-8 place-items-center rounded-lg text-muted transition-colors hover:bg-[#f1e5e1] hover:text-[#9b493f]" aria-label={`ลบงาน ${task.title}`}><Trash2 size={15}/></button>}
                        title="ลบงานนี้หรือไม่"
                        description={`“${task.title}” จะถูกนำออกจากตาราง`}
                        confirmLabel="ลบงาน"
                        tone="danger"
                        onConfirm={() => onDelete(task)}
                      />
                    </div>
                  ))}
                </section>
              )
            })}
          </div>
        </section>
      )}
    </>
  )
}
