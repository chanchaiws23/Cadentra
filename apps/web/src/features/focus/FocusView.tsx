import { useCallback, useEffect, useState, type CSSProperties } from 'react'
import { Check, ListRestart, Pause, Play, Plus, TimerReset } from 'lucide-react'
import type { FocusInterruption, FocusSession, Task } from '@cadentra/domain'
import type { RecordFocusSessionInput } from '@cadentra/data'
import { PageHeading } from '../../components/PageHeading'
import { useI18n } from '../../i18n/LocaleProvider'

interface FocusViewProps {
  tasks: Task[]
  sessions: FocusSession[]
  notify: (message: string) => void
  onComplete: (input: RecordFocusSessionInput) => void
  durationSeconds?: number
}

const completionMessage = 'จบช่วงโฟกัสแล้ว พักสายตาสักครู่'

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60)
  return minutes < 60 ? `${minutes} นาที` : `${Math.floor(minutes / 60)} ชม. ${minutes % 60} นาที`
}

export function FocusView({ tasks, sessions, notify, onComplete, durationSeconds = 45 * 60 }: FocusViewProps) {
  const { t } = useI18n()
  const [duration, setDuration] = useState(durationSeconds)
  const [seconds, setSeconds] = useState(durationSeconds)
  const [status, setStatus] = useState<'idle' | 'running' | 'paused'>('idle')
  const [pauseSeconds, setPauseSeconds] = useState(0)
  const [selectedTaskId, setSelectedTaskId] = useState(tasks.find((task) => task.status === 'in_progress')?.id ?? '')
  const [interruptions, setInterruptions] = useState<FocusInterruption[]>([])
  const [interruptionDraft, setInterruptionDraft] = useState('')
  const [loggingInterruption, setLoggingInterruption] = useState(false)
  const elapsedSeconds = duration - seconds

  const reset = useCallback(() => {
    setSeconds(duration)
    setStatus('idle')
    setPauseSeconds(0)
    setInterruptions([])
    setInterruptionDraft('')
    setLoggingInterruption(false)
  }, [duration])

  const saveSession = useCallback((elapsed: number, message: string) => {
    if (elapsed < 1) return
    const task = tasks.find((entry) => entry.id === selectedTaskId)
    onComplete({
      taskId: task?.sourceTaskId ?? task?.id,
      plannedMinutes: Math.max(1, Math.ceil(duration / 60)),
      elapsedSeconds: elapsed,
      pauseSeconds,
      interruptions,
    })
    notify(message)
    reset()
  }, [duration, interruptions, notify, onComplete, pauseSeconds, reset, selectedTaskId, tasks])

  useEffect(() => {
    if (status !== 'running') return
    const timer = window.setInterval(() => {
      setSeconds((value) => {
        if (value <= 1) {
          window.clearInterval(timer)
          setStatus('idle')
          saveSession(duration, completionMessage)
          return duration
        }
        return value - 1
      })
    }, 1_000)
    return () => window.clearInterval(timer)
  }, [duration, saveSession, status])

  useEffect(() => {
    if (status !== 'paused') return
    const timer = window.setInterval(() => setPauseSeconds((value) => value + 1), 1_000)
    return () => window.clearInterval(timer)
  }, [status])

  const addInterruption = () => {
    const reason = interruptionDraft.trim()
    if (!reason) return
    setInterruptions((current) => [...current, { reason, recordedAt: new Date().toISOString(), elapsedSeconds }])
    setInterruptionDraft('')
    setLoggingInterruption(false)
  }

  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  const progress = ((duration - seconds) / duration) * 360
  const selectableTasks = tasks.filter((task) => task.status !== 'done')

  return (
    <>
      <PageHeading eyebrow={t('focus.eyebrow')} title={t('focus.title')} detail={t('focus.detail')}/>
      <div className="focus-workspace">
        <section className="focus-stage">
          <div className="focus-setup">
            <label>งานที่กำลังทำ<select aria-label="งานที่กำลังโฟกัส" disabled={status !== 'idle' || elapsedSeconds > 0} value={selectedTaskId} onChange={(event) => setSelectedTaskId(event.target.value)}><option value="">ไม่ผูกกับงาน</option>{selectableTasks.map((task) => <option key={task.id} value={task.id}>{task.title}</option>)}</select></label>
            <label>ระยะเวลา<select aria-label="ระยะเวลาโฟกัส" disabled={status !== 'idle' || elapsedSeconds > 0} value={duration} onChange={(event) => { const value = Number(event.target.value); setDuration(value); setSeconds(value) }}><option value={25 * 60}>25 นาที</option><option value={45 * 60}>45 นาที</option><option value={60 * 60}>60 นาที</option>{durationSeconds < 60 && <option value={durationSeconds}>ทดสอบ</option>}</select></label>
          </div>
          <div className={`timer-ring ${status === 'running' ? 'running' : ''}`} style={{ '--progress': `${progress}deg` } as CSSProperties}>
            <div>
              <small>{status === 'running' ? 'กำลังโฟกัส' : status === 'paused' ? 'หยุดชั่วคราว' : 'พร้อมเมื่อคุณพร้อม'}</small>
              <strong>{String(minutes).padStart(2, '0')}:{String(remainingSeconds).padStart(2, '0')}</strong>
              <span>เป้าหมาย {Math.ceil(duration / 60)} นาที</span>
            </div>
          </div>
          <div className="focus-task"><small>โฟกัสกับ</small><strong>{tasks.find((task) => task.id === selectedTaskId)?.title ?? 'ช่วงโฟกัสทั่วไป'}</strong></div>
          <div className="timer-actions">
            <button className="icon-button large" aria-label="รีเซ็ตเวลา" onClick={reset}><TimerReset/></button>
            <button className="play-button" aria-label={status === 'running' ? 'หยุดชั่วคราว' : status === 'paused' ? 'ทำต่อ' : 'เริ่มโฟกัส'} onClick={() => setStatus((value) => value === 'running' ? 'paused' : 'running')}>
              {status === 'running' ? <Pause fill="currentColor"/> : <Play fill="currentColor"/>}
            </button>
            <button className="icon-button large" aria-label="จบและบันทึก" disabled={elapsedSeconds < 1} onClick={() => saveSession(elapsedSeconds, 'บันทึกช่วงโฟกัสแล้ว')}><Check/></button>
          </div>
          {elapsedSeconds > 0 && <div className="focus-interruptions">
            <button className="text-button" onClick={() => setLoggingInterruption((value) => !value)}><Plus size={14}/> บันทึกสิ่งรบกวน</button>
            {loggingInterruption && <form onSubmit={(event) => { event.preventDefault(); addInterruption() }}><input autoFocus aria-label="สิ่งที่รบกวน" value={interruptionDraft} onChange={(event) => setInterruptionDraft(event.target.value)} placeholder="เช่น ข้อความเข้า หรือมีคนเรียก"/><button className="secondary">เพิ่ม</button></form>}
            {interruptions.length > 0 && <ul>{interruptions.map((entry, index) => <li key={`${entry.recordedAt}-${index}`}><span>{entry.reason}</span><small>นาทีที่ {Math.max(1, Math.ceil(entry.elapsedSeconds / 60))}</small></li>)}</ul>}
          </div>}
          <p className="focus-note">เวลาพัก {formatDuration(pauseSeconds)} · สิ่งรบกวน {interruptions.length} ครั้ง</p>
        </section>
        <aside className="focus-history">
          <div className="section-title"><div><h2>Session วันนี้</h2><p>เวลาแผนเทียบกับเวลาที่ทำจริง</p></div><ListRestart size={18}/></div>
          {sessions.slice(0, 6).map((session) => {
            const task = tasks.find((entry) => (entry.sourceTaskId ?? entry.id) === session.taskId)
            return <div className="focus-history-row" key={session.id}><div><strong>{task?.title ?? 'โฟกัสทั่วไป'}</strong><small>{new Intl.DateTimeFormat('th-TH', { hour: '2-digit', minute: '2-digit' }).format(new Date(session.endedAt))}</small></div><div><strong>{formatDuration(session.elapsedSeconds)}</strong><small>จากแผน {session.plannedMinutes} นาที · รบกวน {session.interruptionCount}</small></div></div>
          })}
          {!sessions.length && <p className="focus-empty">เมื่อจบช่วงโฟกัส สรุปจะปรากฏที่นี่</p>}
        </aside>
      </div>
    </>
  )
}
