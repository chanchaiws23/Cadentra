import { Check, ChevronDown, Circle, Plus, Repeat2, Trash2 } from 'lucide-react'
import type { ItemStatus, Task } from '@cadentra/domain'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { PageHeading } from '../../components/PageHeading'
import { useI18n } from '../../i18n/LocaleProvider'
import { formatTime } from '../../lib/date'

interface TasksViewProps {
  tasks: Task[]
  onTask: (task: Task) => void
  onDelete: (task: Task) => void
  onAdd: () => void
}

const groups: ItemStatus[] = ['in_progress', 'planned', 'done']
const groupLabels: Partial<Record<ItemStatus, string>> = {
  in_progress: 'กำลังทำ',
  planned: 'วางแผนแล้ว',
  done: 'สำเร็จ',
}

export function TasksView({ tasks, onTask, onDelete, onAdd }: TasksViewProps) {
  const { t } = useI18n()

  return (
    <>
      <PageHeading
        eyebrow={t('tasks.eyebrow')}
        title={t('tasks.title')}
        detail={t('tasks.detail')}
        action={<button className="primary" onClick={onAdd}><Plus size={17}/> {t('action.add')}</button>}
      />
      <div className="task-toolbar">
        <div className="segmented"><button className="active">รายการ</button><button>ลำดับความสำคัญ</button></div>
        <button className="filter-button">ทุกหมวดหมู่ <ChevronDown size={14}/></button>
      </div>
      <div className="task-groups">
        {!tasks.length && <div className="grid min-h-48 place-items-center text-sm text-muted">ยังไม่มีงาน กด “เพิ่ม” เพื่อสร้างงานแรก</div>}
        {groups.map((group) => {
          const groupTasks = tasks.filter((task) => task.status === group)
          return (
            <section key={group}>
              <div className="group-heading"><h2>{groupLabels[group]}</h2><span>{groupTasks.length}</span></div>
              {groupTasks.map((task) => (
                <div className="task-row" key={task.id}>
                  <button className="check-button" aria-label={`เปลี่ยนสถานะ ${task.title}`} onClick={() => onTask(task)}>
                    {task.status === 'done' ? <Check size={15}/> : <Circle size={15}/>}
                  </button>
                  <div><strong className="flex items-center gap-1.5">{task.title}{task.recurrenceRule && <Repeat2 size={12} aria-label="งานซ้ำ"/>}</strong><small>{task.category} · {formatTime(task.start)}</small></div>
                  <span className={`priority ${task.priority}`}>{task.priority}</span>
                  <ConfirmDialog
                    trigger={<button type="button" className="grid size-8 place-items-center rounded-lg text-muted transition-colors hover:bg-[#f1e5e1] hover:text-[#9b493f]" aria-label={`ลบงาน ${task.title}`}><Trash2 size={15}/></button>}
                    title="ลบงานนี้หรือไม่"
                    description={`“${task.title}” จะถูกนำออกจากตาราง คุณสามารถกดเลิกทำจากข้อความแจ้งเตือนได้`}
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
    </>
  )
}
