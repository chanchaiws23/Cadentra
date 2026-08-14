import { useEffect, useState } from 'react'
import { ArrowRight, RotateCcw, Sparkles, X } from 'lucide-react'
import type { AIProposal, Task } from '@cadentra/domain'
import { formatTime } from '../../lib/date'

interface CoachDialogProps {
  tasks: Task[]
  proposals: AIProposal[]
  healthConsent: boolean
  onClose: () => void
  onGenerate: (instruction: string, includeHealth: boolean) => Promise<boolean>
  onApply: (proposal: AIProposal, changeIds: string[]) => Promise<boolean>
  onReject: (proposal: AIProposal) => Promise<boolean>
  onUndo: (proposal: AIProposal) => Promise<boolean>
}

export function CoachDialog({ tasks, proposals, healthConsent, onClose, onGenerate, onApply, onReject, onUndo }: CoachDialogProps) {
  const proposal = proposals[0]
  const [instruction, setInstruction] = useState('จัดตารางงานที่ค้างให้สมดุลและมีช่วงพัก')
  const [includeHealth, setIncludeHealth] = useState(false)
  const [selected, setSelected] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  useEffect(() => { if (proposal?.status === 'draft') setSelected(proposal.changes.map((change) => change.id)) }, [proposal])
  const taskName = (id: string) => tasks.find((task) => task.id === id)?.title ?? 'งาน'
  return <div className="modal-backdrop" onMouseDown={onClose}><section className="modal max-w-2xl!" role="dialog" aria-modal="true" aria-labelledby="coach-title" onMouseDown={(event) => event.stopPropagation()}><div className="modal-head"><div><p className="eyebrow">เสนอ → Preview → ยืนยัน</p><h2 id="coach-title">AI Coach</h2></div><button className="icon-button" onClick={onClose} aria-label="ปิด AI Coach"><X/></button></div>
    {!proposal || proposal.status === 'rejected' || proposal.status === 'undone' ? <form onSubmit={(event) => { event.preventDefault(); setBusy(true); void onGenerate(instruction, includeHealth).finally(() => setBusy(false)) }}><label>อยากให้ Coach ช่วยอะไร<textarea aria-label="คำขอถึง AI Coach" className="mt-2 min-h-28 w-full rounded-lg border border-line bg-paper p-3" value={instruction} onChange={(event) => setInstruction(event.target.value)}/></label>{healthConsent && <label className="mt-4 flex items-center gap-3 text-sm"><input type="checkbox" checked={includeHealth} onChange={(event) => setIncludeHealth(event.target.checked)}/>ใช้เฉพาะยอดรวมก้าวเดิน การนอน และการออกกำลังกาย 7 วันล่าสุด</label>}<p className="mt-4 text-xs leading-5 text-muted">AI ไม่มีสิทธิ์แก้ตารางโดยตรง และไม่ให้คำแนะนำทางการแพทย์</p><div className="modal-actions"><button type="button" className="secondary" onClick={onClose}>ยกเลิก</button><button className="primary" disabled={busy || !instruction.trim()}><Sparkles size={16}/>{busy ? 'กำลังวางข้อเสนอ…' : 'สร้างข้อเสนอ'}</button></div></form> : <div><p className="text-sm leading-6 text-muted">{proposal.reason}</p><div className="mt-5 divide-y divide-line border-y border-line">{proposal.changes.length ? proposal.changes.map((change) => <label className="flex cursor-pointer items-start gap-3 py-4" key={change.id}><input className="mt-1" type="checkbox" disabled={proposal.status !== 'draft'} checked={selected.includes(change.id)} onChange={(event) => setSelected((current) => event.target.checked ? [...current, change.id] : current.filter((id) => id !== change.id))}/><span className="min-w-0 flex-1"><strong className="block text-sm">{taskName(change.taskId)}</strong><span className="mt-2 grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-xs text-muted"><span>{change.before ? `${formatTime(change.before.start)}–${formatTime(change.before.end)}` : 'สร้างใหม่'}</span><ArrowRight size={13}/><span className="text-accent">{change.after ? `${formatTime(change.after.start)}–${formatTime(change.after.end)}` : 'ข้าม'}</span></span></span></label>) : <p className="py-7 text-sm text-muted">ไม่มีการเปลี่ยนแปลงที่เหมาะสม</p>}</div>{proposal.status === 'applied' ? <div className="modal-actions"><button className="secondary" disabled={busy} onClick={() => { setBusy(true); void onUndo(proposal).finally(() => setBusy(false)) }}><RotateCcw size={16}/>Undo ข้อเสนอ</button><button className="primary" onClick={onClose}>เสร็จแล้ว</button></div> : <div className="modal-actions"><button className="secondary" disabled={busy} onClick={() => { setBusy(true); void onReject(proposal).finally(() => setBusy(false)) }}>ปฏิเสธ</button><button className="primary" disabled={busy || !selected.length} onClick={() => { setBusy(true); void onApply(proposal, selected).finally(() => setBusy(false)) }}>ยืนยัน {selected.length} รายการ</button></div>}</div>}
  </section></div>
}
