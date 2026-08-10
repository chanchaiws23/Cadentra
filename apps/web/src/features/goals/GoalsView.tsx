import { useEffect, useMemo, useState } from 'react'
import { CalendarClock, Check, Circle, Flag, Plus, Target, Trash2, X } from 'lucide-react'
import type { Goal, Milestone, Task } from '@cadentra/domain'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { PageHeading } from '../../components/PageHeading'

interface GoalsViewProps {
  goals: Goal[]
  milestones: Milestone[]
  tasks: Task[]
  onCreateGoal: (title: string, description: string, targetDate?: string) => Promise<void>
  onToggleGoal: (goal: Goal) => Promise<void>
  onDeleteGoal: (goal: Goal) => Promise<void>
  onCreateMilestone: (goalId: string, title: string, targetDate: string | undefined, sortOrder: number) => Promise<void>
  onToggleMilestone: (milestone: Milestone) => Promise<void>
  onDeleteMilestone: (milestone: Milestone) => Promise<void>
}

function progressFor(goal: Goal, milestones: Milestone[], tasks: Task[]) {
  const items = [...milestones.filter((item) => item.goalId === goal.id), ...tasks.filter((item) => item.goalId === goal.id)]
  if (!items.length) return goal.status === 'done' ? 100 : 0
  return Math.round(items.filter((item) => item.status === 'done').length / items.length * 100)
}

function dateLabel(value?: string) {
  if (!value) return 'ยังไม่กำหนดวัน'
  return new Intl.DateTimeFormat('th-TH', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${value}T12:00:00`))
}

export function GoalsView(props: GoalsViewProps) {
  const { goals, milestones, tasks } = props
  const [selectedId, setSelectedId] = useState(goals[0]?.id)
  const [goalOpen, setGoalOpen] = useState(false)
  const [milestoneOpen, setMilestoneOpen] = useState(false)
  useEffect(() => {
    if (!goals.some((goal) => goal.id === selectedId)) setSelectedId(goals[0]?.id)
  }, [goals, selectedId])
  const selected = goals.find((goal) => goal.id === selectedId)
  const selectedMilestones = useMemo(() => milestones.filter((item) => item.goalId === selectedId).sort((a, b) => a.sortOrder - b.sortOrder), [milestones, selectedId])
  const selectedTasks = tasks.filter((task) => task.goalId === selectedId)
  const average = goals.length ? Math.round(goals.reduce((sum, goal) => sum + progressFor(goal, milestones, tasks), 0) / goals.length) : 0

  return <>
    <PageHeading eyebrow="ทิศทางระยะยาว" title="เป้าหมาย" detail="แตกเป้าหมายให้เป็นหมุดหมายและงานที่ลงมือทำได้" action={<button className="primary" onClick={() => setGoalOpen(true)}><Plus size={17}/> เพิ่มเป้าหมาย</button>}/>
    <div className="grid grid-cols-3 border-y border-line max-[720px]:grid-cols-1">
      <div className="py-5 max-[720px]:border-b max-[720px]:border-line"><small className="text-muted">เป้าหมายที่กำลังเดินหน้า</small><strong className="mt-1 block font-display text-3xl font-normal">{goals.filter((goal) => goal.status !== 'done').length}</strong></div>
      <div className="border-x border-line px-7 py-5 max-[720px]:border-x-0 max-[720px]:border-b max-[720px]:px-0"><small className="text-muted">ความคืบหน้าเฉลี่ย</small><strong className="mt-1 block font-display text-3xl font-normal">{average}%</strong></div>
      <div className="pl-7 py-5 max-[720px]:pl-0"><small className="text-muted">Milestones สำเร็จ</small><strong className="mt-1 block font-display text-3xl font-normal">{milestones.filter((item) => item.status === 'done').length}<span className="ml-1 text-base text-muted">/ {milestones.length}</span></strong></div>
    </div>

    {!goals.length ? <div className="grid min-h-80 place-items-center text-center"><div><Target className="mx-auto mb-4 text-accent" size={34}/><h2 className="font-display text-2xl">ยังไม่มีเป้าหมาย</h2><p className="mt-2 text-sm text-muted">เริ่มจากสิ่งหนึ่งที่คุณอยากเปลี่ยน แล้วค่อยแบ่งเป็นก้าวเล็ก ๆ</p><button className="primary mt-5" onClick={() => setGoalOpen(true)}><Plus size={16}/> สร้างเป้าหมายแรก</button></div></div> :
      <div className="mt-8 grid grid-cols-[minmax(260px,.75fr)_minmax(0,1.4fr)] gap-10 max-[900px]:grid-cols-1">
        <section aria-label="รายการเป้าหมาย">
          <div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-semibold">เป้าหมายทั้งหมด</h2><span className="text-xs text-muted">{goals.length} รายการ</span></div>
          <div className="divide-y divide-line border-t border-line">
            {goals.map((goal) => { const progress = progressFor(goal, milestones, tasks); return <button key={goal.id} className={`w-full py-5 text-left transition-opacity hover:opacity-70 ${selectedId === goal.id ? '' : 'opacity-55'}`} onClick={() => setSelectedId(goal.id)}><div className="flex items-start gap-3"><span className={`mt-0.5 grid size-7 shrink-0 place-items-center rounded-full ${goal.status === 'done' ? 'bg-accent text-white' : 'bg-[#e4ebe5] text-accent'}`}>{goal.status === 'done' ? <Check size={14}/> : <Target size={14}/>}</span><span className="min-w-0 flex-1"><strong className="block truncate text-sm">{goal.title}</strong><small className="mt-1 block text-muted">{dateLabel(goal.targetDate)}</small><span className="mt-3 block h-1 overflow-hidden rounded-full bg-line"><i className="block h-full rounded-full bg-accent transition-[width] duration-300" style={{ width: `${progress}%` }}/></span></span><em className="text-xs not-italic text-accent">{progress}%</em></div></button> })}
          </div>
        </section>

        {selected && <section className="border-l border-line pl-10 max-[900px]:border-l-0 max-[900px]:border-t max-[900px]:pl-0 max-[900px]:pt-8">
          <div className="flex items-start justify-between gap-5"><div><p className="eyebrow">เป้าหมายที่เลือก</p><h2 className="mt-2 font-display text-3xl font-normal">{selected.title}</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-muted">{selected.description || 'ยังไม่มีรายละเอียดเพิ่มเติม'}</p></div><ConfirmDialog trigger={<button className="icon-button text-muted" aria-label={`ลบเป้าหมาย ${selected.title}`}><Trash2 size={17}/></button>} title="ลบเป้าหมายนี้หรือไม่" description="Milestones จะถูกนำออกด้วย แต่งานที่เชื่อมไว้จะยังคงอยู่" confirmLabel="ลบเป้าหมาย" tone="danger" onConfirm={() => void props.onDeleteGoal(selected)}/></div>
          <div className="mt-5 flex flex-wrap items-center gap-3 text-xs text-muted"><span className="inline-flex items-center gap-1.5"><CalendarClock size={14}/>{dateLabel(selected.targetDate)}</span><button className="text-button" onClick={() => void props.onToggleGoal(selected)}>{selected.status === 'done' ? 'เปิดเป้าหมายอีกครั้ง' : 'ทำเครื่องหมายว่าสำเร็จ'}</button></div>

          <div className="mt-9 flex items-center justify-between border-b border-line pb-3"><div><h3 className="text-sm font-semibold">Milestones</h3><p className="mt-1 text-xs text-muted">ก้าวสำคัญที่บอกว่าคุณกำลังไปถูกทาง</p></div><button className="text-button" onClick={() => setMilestoneOpen(true)}><Plus size={15}/> เพิ่ม Milestone</button></div>
          <div className="divide-y divide-line">
            {!selectedMilestones.length && <p className="py-8 text-center text-sm text-muted">ยังไม่มี Milestone สำหรับเป้าหมายนี้</p>}
            {selectedMilestones.map((item, index) => <div className="flex items-center gap-3 py-4" key={item.id}><span className="grid size-7 place-items-center rounded-full border border-line text-xs text-muted">{index + 1}</span><button className={`grid size-6 place-items-center rounded-full ${item.status === 'done' ? 'bg-accent text-white' : 'text-muted'}`} onClick={() => void props.onToggleMilestone(item)} aria-label={`เปลี่ยนสถานะ ${item.title}`}>{item.status === 'done' ? <Check size={14}/> : <Circle size={14}/>}</button><div className="min-w-0 flex-1"><strong className={`block truncate text-sm ${item.status === 'done' ? 'text-muted line-through' : ''}`}>{item.title}</strong><small className="text-muted">{dateLabel(item.targetDate)}</small></div><ConfirmDialog trigger={<button className="icon-button text-muted" aria-label={`ลบ Milestone ${item.title}`}><Trash2 size={14}/></button>} title="ลบ Milestone หรือไม่" description={item.title} confirmLabel="ลบ" tone="danger" onConfirm={() => void props.onDeleteMilestone(item)}/></div>)}
          </div>

          <div className="mt-8 border-t border-line pt-5"><h3 className="flex items-center gap-2 text-sm font-semibold"><Flag size={15}/> งานที่เชื่อมกับเป้าหมาย</h3>{!selectedTasks.length ? <p className="py-6 text-sm text-muted">ยังไม่มีงานที่เชื่อม เลือกเป้าหมายนี้ตอนเพิ่มงานใหม่ได้</p> : <div className="mt-3 divide-y divide-line">{selectedTasks.map((task) => <div className="flex items-center gap-3 py-3 text-sm" key={task.id}><span className={`size-2 rounded-full ${task.status === 'done' ? 'bg-accent' : 'bg-[#b8bbb3]'}`}/><span className={task.status === 'done' ? 'text-muted line-through' : ''}>{task.title}</span><small className="ml-auto text-muted">{task.category}</small></div>)}</div>}</div>
        </section>}
      </div>}
    {goalOpen && <GoalModal onClose={() => setGoalOpen(false)} onSave={async (...args) => { await props.onCreateGoal(...args); setGoalOpen(false) }}/>}
    {milestoneOpen && selected && <MilestoneModal onClose={() => setMilestoneOpen(false)} onSave={async (title, date) => { await props.onCreateMilestone(selected.id, title, date, selectedMilestones.length); setMilestoneOpen(false) }}/>}
  </>
}

function GoalModal({ onClose, onSave }: { onClose: () => void; onSave: (title: string, description: string, targetDate?: string) => Promise<void> }) {
  const [title, setTitle] = useState(''); const [description, setDescription] = useState(''); const [date, setDate] = useState('')
  return <div className="modal-backdrop" onMouseDown={onClose}><form className="modal" onMouseDown={(event) => event.stopPropagation()} onSubmit={(event) => { event.preventDefault(); if (title.trim()) void onSave(title.trim(), description.trim(), date || undefined) }}><div className="modal-head"><div><p className="eyebrow">ทิศทางใหม่</p><h2>สร้างเป้าหมาย</h2></div><button type="button" className="icon-button" onClick={onClose} aria-label="ปิด"><X/></button></div><label>ชื่อเป้าหมาย<input autoFocus value={title} onChange={(event) => setTitle(event.target.value)} placeholder="เช่น สื่อสารภาษาอังกฤษได้คล่อง"/></label><label>รายละเอียด<input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="ความสำเร็จของเป้าหมายนี้มีหน้าตาอย่างไร"/></label><label>วันที่ตั้งใจให้สำเร็จ<input type="date" value={date} onChange={(event) => setDate(event.target.value)}/></label><div className="modal-actions"><button type="button" className="secondary" onClick={onClose}>ยกเลิก</button><button className="primary" disabled={!title.trim()}>สร้างเป้าหมาย</button></div></form></div>
}

function MilestoneModal({ onClose, onSave }: { onClose: () => void; onSave: (title: string, targetDate?: string) => Promise<void> }) {
  const [title, setTitle] = useState(''); const [date, setDate] = useState('')
  return <div className="modal-backdrop" onMouseDown={onClose}><form className="modal" onMouseDown={(event) => event.stopPropagation()} onSubmit={(event) => { event.preventDefault(); if (title.trim()) void onSave(title.trim(), date || undefined) }}><div className="modal-head"><div><p className="eyebrow">ก้าวถัดไป</p><h2>เพิ่ม Milestone</h2></div><button type="button" className="icon-button" onClick={onClose} aria-label="ปิด"><X/></button></div><label>Milestone<input autoFocus value={title} onChange={(event) => setTitle(event.target.value)} placeholder="เช่น สนทนา 15 นาทีโดยไม่เปิดพจนานุกรม"/></label><label>วันที่เป้าหมาย<input type="date" value={date} onChange={(event) => setDate(event.target.value)}/></label><div className="modal-actions"><button type="button" className="secondary" onClick={onClose}>ยกเลิก</button><button className="primary" disabled={!title.trim()}>เพิ่ม Milestone</button></div></form></div>
}
