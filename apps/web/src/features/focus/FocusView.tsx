import { useEffect, useState, type CSSProperties } from 'react'
import { MoreHorizontal, Pause, Play, TimerReset } from 'lucide-react'
import type { Task } from '@cadentra/domain'
import { PageHeading } from '../../components/PageHeading'
import { useI18n } from '../../i18n/LocaleProvider'

interface FocusViewProps {
  tasks: Task[]
  notify: (message: string) => void
  durationSeconds?: number
}

const completionMessage = 'จบช่วงโฟกัสแล้ว พักสายตาสักครู่'

export function FocusView({ tasks, notify, durationSeconds = 45 * 60 }: FocusViewProps) {
  const { t } = useI18n()
  const [seconds, setSeconds] = useState(durationSeconds)
  const [running, setRunning] = useState(false)

  useEffect(() => {
    if (!running) return

    const timer = window.setInterval(() => {
      setSeconds((value) => {
        if (value <= 1) {
          setRunning(false)
          notify(completionMessage)
          return durationSeconds
        }
        return value - 1
      })
    }, 1_000)

    return () => window.clearInterval(timer)
  }, [durationSeconds, notify, running])

  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  const totalMinutes = Math.ceil(durationSeconds / 60)
  const progress = (seconds / durationSeconds) * 360
  const activeTask = tasks.find((task) => task.status === 'in_progress')

  const reset = () => {
    setSeconds(durationSeconds)
    setRunning(false)
  }

  return (
    <>
      <PageHeading eyebrow={t('focus.eyebrow')} title={t('focus.title')} detail={t('focus.detail')}/>
      <div className="focus-stage">
        <div className={running ? 'timer-ring running' : 'timer-ring'} style={{ '--progress': `${progress}deg` } as CSSProperties}>
          <div>
            <small>{running ? 'กำลังโฟกัส' : 'พร้อมเมื่อคุณพร้อม'}</small>
            <strong>{String(minutes).padStart(2, '0')}:{String(remainingSeconds).padStart(2, '0')}</strong>
            <span>{totalMinutes} นาที</span>
          </div>
        </div>
        <div className="focus-task"><small>โฟกัสกับ</small><strong>{activeTask?.title ?? 'เลือกงานหนึ่งอย่าง'}</strong></div>
        <div className="timer-actions">
          <button className="icon-button large" aria-label="รีเซ็ตเวลา" onClick={reset}><TimerReset/></button>
          <button className="play-button" aria-label={running ? 'หยุดชั่วคราว' : 'เริ่มโฟกัส'} onClick={() => setRunning((value) => !value)}>
            {running ? <Pause fill="currentColor"/> : <Play fill="currentColor"/>}
          </button>
          <button className="icon-button large" aria-label="ตัวเลือกเพิ่มเติม"><MoreHorizontal/></button>
        </div>
        <p className="focus-note">ปิดสิ่งรบกวนแล้ว · การแจ้งเตือนสำคัญยังทำงาน</p>
      </div>
    </>
  )
}
