import { useEffect, useMemo, useState } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router'
import {
  BarChart3, Bell, Bot, CalendarDays, CheckCircle2, ChevronDown,
  Flame, Focus, Gauge, Languages, LayoutList, Menu, MoreHorizontal,
  Pause, Play, Plus, RotateCcw, Search, Settings, Sparkles, TimerReset,
  Target, Trophy, X,
} from 'lucide-react'
import { completionRate, pointsForCompletion, type AIProposal, type Habit, type Task } from '@cadentra/domain'
import { PageHeading } from './components/PageHeading'
import { CalendarView } from './features/calendar/CalendarView'
import { HabitsView } from './features/habits/HabitsView'
import { TasksView } from './features/tasks/TasksView'
import { TodayView } from './features/today/TodayView'
import { useI18n } from './i18n/LocaleProvider'
import type { MessageKey } from './i18n/messages'
import { formatTime, todayKey } from './lib/date'
import { pathToView, viewPaths, type View } from './routing'
import './App.css'

const at = (hour: number, minute = 0) => {
  const date = new Date(); date.setHours(hour, minute, 0, 0); return date.toISOString()
}

const initialTasks: Task[] = [
  { id: 't1', userId: 'demo', title: 'วางแผนงานสำคัญของสัปดาห์', start: at(8, 30), end: at(9, 15), category: 'วางแผน', priority: 'high', status: 'done', goalId: 'g1' },
  { id: 't2', userId: 'demo', title: 'Deep work · Cadentra', start: at(9, 30), end: at(11, 0), category: 'งาน', priority: 'high', status: 'in_progress', goalId: 'g1' },
  { id: 't3', userId: 'demo', title: 'พักกลางวันและเดินเล่น', start: at(12, 0), end: at(13, 0), category: 'พัก', priority: 'low', status: 'planned' },
  { id: 't4', userId: 'demo', title: 'ทบทวนภาษาอังกฤษ', start: at(14, 0), end: at(14, 40), category: 'พัฒนาตัวเอง', priority: 'medium', status: 'planned', recurring: true },
  { id: 't5', userId: 'demo', title: 'ออกกำลังกาย', start: at(18, 0), end: at(19, 0), category: 'สุขภาพ', priority: 'medium', status: 'planned', recurring: true },
]

const initialHabits: Habit[] = [
  { id: 'h1', userId: 'demo', title: 'อ่านหนังสือ', cue: 'หลังดื่มกาแฟเช้า', target: 20, unit: 'นาที', streak: 12, completedDates: [todayKey] },
  { id: 'h2', userId: 'demo', title: 'ดื่มน้ำ', cue: 'ระหว่างวัน', target: 8, unit: 'แก้ว', streak: 7, completedDates: [] },
  { id: 'h3', userId: 'demo', title: 'เขียนบันทึก', cue: 'ก่อนเข้านอน', target: 1, unit: 'ครั้ง', streak: 4, completedDates: [] },
]

const navItems: { id: View; labelKey: MessageKey; icon: typeof CalendarDays }[] = [
  { id: 'today', labelKey: 'nav.today', icon: Gauge },
  { id: 'calendar', labelKey: 'nav.calendar', icon: CalendarDays },
  { id: 'tasks', labelKey: 'nav.tasks', icon: LayoutList },
  { id: 'goals', labelKey: 'nav.goals', icon: Target },
  { id: 'habits', labelKey: 'nav.habits', icon: Flame },
  { id: 'focus', labelKey: 'nav.focus', icon: Focus },
  { id: 'insights', labelKey: 'nav.insights', icon: BarChart3 },
]

function App() {
  const { locale, setLocale, t } = useI18n()
  const location = useLocation()
  const navigate = useNavigate()
  const view = pathToView(location.pathname)
  const [tasks, setTasks] = useState<Task[]>(() => JSON.parse(localStorage.getItem('cadentra.tasks') ?? 'null') ?? initialTasks)
  const [habits, setHabits] = useState<Habit[]>(() => JSON.parse(localStorage.getItem('cadentra.habits') ?? 'null') ?? initialHabits)
  const [points, setPoints] = useState(() => Number(localStorage.getItem('cadentra.points') ?? 240))
  const [menuOpen, setMenuOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [coachOpen, setCoachOpen] = useState(false)
  const [toast, setToast] = useState('')

  useEffect(() => localStorage.setItem('cadentra.tasks', JSON.stringify(tasks)), [tasks])
  useEffect(() => localStorage.setItem('cadentra.habits', JSON.stringify(habits)), [habits])
  useEffect(() => localStorage.setItem('cadentra.points', String(points)), [points])

  const rate = completionRate(tasks)
  const completedHabits = habits.filter((habit) => habit.completedDates.includes(todayKey)).length
  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(''), 2600) }

  const toggleTask = (task: Task) => {
    const completing = task.status !== 'done'
    setTasks((items) => items.map((item) => item.id === task.id ? { ...item, status: completing ? 'done' : 'planned' } : item))
    setPoints((value) => value + (completing ? pointsForCompletion(task.priority) : -pointsForCompletion(task.priority)))
    notify(completing ? `ทำสำเร็จ · +${pointsForCompletion(task.priority)} คะแนน` : 'ย้ายกลับไปยังแผนแล้ว')
  }

  const toggleHabit = (habit: Habit) => {
    const complete = !habit.completedDates.includes(todayKey)
    setHabits((items) => items.map((item) => item.id === habit.id ? {
      ...item,
      completedDates: complete ? [...item.completedDates, todayKey] : item.completedDates.filter((date) => date !== todayKey),
      streak: Math.max(0, item.streak + (complete ? 1 : -1)),
    } : item))
    setPoints((value) => value + (complete ? 8 : -8))
    notify(complete ? 'รักษาจังหวะได้อีกหนึ่งวัน · +8 คะแนน' : 'ไม่เป็นไร เริ่มใหม่ได้เสมอ')
  }

  const addTask = (title: string, time: string, duration: number) => {
    const [hour, minute] = time.split(':').map(Number)
    const start = new Date(); start.setHours(hour, minute, 0, 0)
    const end = new Date(start.getTime() + duration * 60000)
    setTasks((items) => [...items, { id: crypto.randomUUID(), userId: 'demo', title, start: start.toISOString(), end: end.toISOString(), category: 'ทั่วไป', priority: 'medium', status: 'planned' }])
    setAddOpen(false); notify('เพิ่มลงในวันนี้แล้ว')
  }

  return (
    <div className="app-shell">
      <aside className={menuOpen ? 'sidebar open' : 'sidebar'}>
        <div className="brand"><span className="brand-mark">C</span><span>Cadentra</span></div>
        <nav aria-label="เมนูหลัก">
          {navItems.map(({ id, labelKey, icon: Icon }) => (
            <button key={id} className={view === id ? 'nav-item active' : 'nav-item'} onClick={() => { navigate(viewPaths[id]); setMenuOpen(false) }}>
              <Icon size={18} strokeWidth={1.8}/><span>{t(labelKey)}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <button className="nav-item"><Trophy size={18}/><span>เลเวล 4</span><em>{points} XP</em></button>
          <button className={view === 'settings' ? 'nav-item active' : 'nav-item'} onClick={() => navigate(viewPaths.settings)}><Settings size={18}/><span>{t('nav.settings')}</span></button>
          <div className="profile"><div className="avatar">ช</div><div><strong>ชัย</strong><small>ซิงก์ในเครื่อง</small></div><MoreHorizontal size={18}/></div>
        </div>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <button className="icon-button mobile-menu" onClick={() => setMenuOpen(!menuOpen)} aria-label="เปิดเมนู"><Menu/></button>
          <div className="search"><Search size={16}/><span>{t('top.search')}</span><kbd>⌘ K</kbd></div>
          <div className="top-actions"><button className="language-button" onClick={() => setLocale(locale === 'th' ? 'en' : 'th')} aria-label={t('action.language')}><Languages size={16}/>{locale.toUpperCase()}</button><button className="icon-button" aria-label={t('top.notifications')}><Bell size={19}/><i/></button><button className="primary compact" onClick={() => setAddOpen(true)}><Plus size={17}/> {t('action.add')}</button></div>
        </header>

        <section className="content">
          <Routes>
            <Route path="/" element={<Navigate to={viewPaths.today} replace/>}/>
            <Route path={viewPaths.today} element={<TodayView tasks={tasks} habits={habits} rate={rate} completedHabits={completedHabits} onTask={toggleTask} onHabit={toggleHabit} onCoach={() => setCoachOpen(true)} />}/>
            <Route path={viewPaths.calendar} element={<CalendarView tasks={tasks} onTask={toggleTask}/>}/>
            <Route path={viewPaths.tasks} element={<TasksView tasks={tasks} onTask={toggleTask} onAdd={() => setAddOpen(true)}/>}/>
            <Route path={viewPaths.goals} element={<PlaceholderView eyebrow="เป้าหมายระยะยาว" title="เป้าหมาย" detail="เชื่อมสิ่งที่อยากเปลี่ยนให้เป็น Milestone งาน และเวลาในปฏิทิน"/>}/>
            <Route path={viewPaths.habits} element={<HabitsView habits={habits} onHabit={toggleHabit}/>}/>
            <Route path={viewPaths.focus} element={<FocusView tasks={tasks} notify={notify}/>}/>
            <Route path={viewPaths.insights} element={<InsightsView tasks={tasks} habits={habits} points={points}/>}/>
            <Route path={viewPaths.settings} element={<PlaceholderView eyebrow="การตั้งค่าส่วนตัว" title={t('nav.settings')} detail="จัดการบัญชี ภาษา การแจ้งเตือน การเชื่อมต่อ และข้อมูลของคุณ"/>}/>
            <Route path="*" element={<Navigate to={viewPaths.today} replace/>}/>
          </Routes>
        </section>
      </main>

      {menuOpen && <button className="scrim" onClick={() => setMenuOpen(false)} aria-label="ปิดเมนู"/>}
      {addOpen && <AddTaskModal onClose={() => setAddOpen(false)} onAdd={addTask}/>} 
      {coachOpen && <CoachPanel tasks={tasks} onClose={() => setCoachOpen(false)} onApply={(proposal) => { setTasks((items) => items.map((item) => { const change = proposal.changes.find((entry) => entry.taskId === item.id && entry.accepted); return change?.after ? { ...item, ...change.after } : item })); setCoachOpen(false); notify('ยืนยันตารางใหม่แล้ว · ย้อนกลับได้จากประวัติ') }}/>} 
      {toast && <div className="toast"><CheckCircle2 size={18}/>{toast}</div>}
    </div>
  )
}

function PlaceholderView({ eyebrow, title, detail }: { eyebrow: string; title: string; detail: string }) {
  return <PageHeading eyebrow={eyebrow} title={title} detail={detail}/>
}

function FocusView({ tasks, notify }: { tasks: Task[]; notify: (message: string) => void }) {
  const { t } = useI18n()
  const [seconds, setSeconds] = useState(45 * 60)
  const [running, setRunning] = useState(false)
  useEffect(() => { if (!running) return; const timer = window.setInterval(() => setSeconds(value => { if (value <= 1) { setRunning(false); notify('จบช่วงโฟกัสแล้ว พักสายตาสักครู่'); return 45 * 60 } return value - 1 }), 1000); return () => clearInterval(timer) }, [running, notify])
  const minutes = Math.floor(seconds / 60); const secs = seconds % 60
  return <><PageHeading eyebrow={t('focus.eyebrow')} title={t('focus.title')} detail={t('focus.detail')}/>
    <div className="focus-stage"><div className={running ? 'timer-ring running' : 'timer-ring'} style={{ '--progress': `${(seconds / 2700) * 360}deg` } as React.CSSProperties}><div><small>{running ? 'กำลังโฟกัส' : 'พร้อมเมื่อคุณพร้อม'}</small><strong>{String(minutes).padStart(2,'0')}:{String(secs).padStart(2,'0')}</strong><span>45 นาที</span></div></div><div className="focus-task"><small>โฟกัสกับ</small><strong>{tasks.find(t => t.status === 'in_progress')?.title ?? 'เลือกงานหนึ่งอย่าง'}</strong></div><div className="timer-actions"><button className="icon-button large" onClick={() => { setSeconds(45 * 60); setRunning(false) }}><TimerReset/></button><button className="play-button" onClick={() => setRunning(!running)}>{running ? <Pause fill="currentColor"/> : <Play fill="currentColor"/>}</button><button className="icon-button large"><MoreHorizontal/></button></div><p className="focus-note">ปิดสิ่งรบกวนแล้ว · การแจ้งเตือนสำคัญยังทำงาน</p></div></>
}

function InsightsView({ tasks, habits, points }: { tasks: Task[]; habits: Habit[]; points: number }) {
  const { t } = useI18n()
  const bars = [46, 62, 54, 78, 88, 32, 68]
  return <><PageHeading eyebrow={t('insights.eyebrow')} title={t('insights.title')} detail={t('insights.detail')} action={<button className="filter-button">สัปดาห์นี้ <ChevronDown size={14}/></button>}/>
    <div className="insight-strip"><div><small>ความสม่ำเสมอ</small><strong>82%</strong><em>+9%</em></div><div><small>เวลาโฟกัส</small><strong>8ชม. 25น.</strong><em>+1ชม. 10น.</em></div><div><small>งานสำเร็จ</small><strong>{tasks.filter(t => t.status === 'done').length * 7}</strong><em>ตามแผน 76%</em></div><div><small>คะแนนสะสม</small><strong>{points}</strong><em>เลเวล 4</em></div></div>
    <div className="insights-grid"><section className="chart-panel"><div className="section-title"><div><h2>จังหวะการทำงาน</h2><p>คะแนนความสม่ำเสมอรายวัน</p></div></div><div className="bar-chart">{bars.map((bar, index) => <div key={index}><span style={{ height: `${bar}%` }}/><small>{['จ','อ','พ','พฤ','ศ','ส','อา'][index]}</small></div>)}</div></section><section className="reflection-panel"><span className="reflection-icon"><Sparkles/></span><p className="eyebrow">สิ่งที่ค้นพบ</p><h2>ช่วงเช้าคือเวลาที่ดีที่สุดของคุณ</h2><p>งานที่เริ่มก่อน 10:00 สำเร็จมากกว่าช่วงอื่น 34% ลองกันเวลา 09:00–11:00 ไว้สำหรับงานสำคัญ</p><button className="text-button">ใช้กับสัปดาห์หน้า →</button></section></div>
    <section className="streak-section"><div className="section-title"><div><h2>นิสัยที่กำลังเติบโต</h2><p>ความสม่ำเสมอสำคัญกว่าความสมบูรณ์แบบ</p></div></div>{habits.map(h => <div className="streak-row" key={h.id}><strong>{h.title}</strong><div>{Array.from({length: 14}, (_, i) => <i className={i < Math.min(h.streak, 14) ? 'filled' : ''} key={i}/>)}</div><span>{h.streak} วัน</span></div>)}</section></>
}

function AddTaskModal({ onClose, onAdd }: { onClose: () => void; onAdd: (title: string, time: string, duration: number) => void }) {
  const [title, setTitle] = useState(''); const [time, setTime] = useState('15:30'); const [duration, setDuration] = useState(45)
  return <div className="modal-backdrop" onMouseDown={onClose}><form className="modal" onMouseDown={e => e.stopPropagation()} onSubmit={e => { e.preventDefault(); if (title.trim()) onAdd(title.trim(), time, duration) }}><div className="modal-head"><div><p className="eyebrow">เพิ่มอย่างรวดเร็ว</p><h2>วางลงในวันนี้</h2></div><button type="button" className="icon-button" onClick={onClose}><X/></button></div><label>สิ่งที่ต้องทำ<input autoFocus value={title} onChange={e => setTitle(e.target.value)} placeholder="เช่น อ่านหนังสือ 20 นาที"/></label><div className="form-grid"><label>เริ่มเวลา<input type="time" value={time} onChange={e => setTime(e.target.value)}/></label><label>ระยะเวลา<select value={duration} onChange={e => setDuration(Number(e.target.value))}><option value={15}>15 นาที</option><option value={30}>30 นาที</option><option value={45}>45 นาที</option><option value={60}>1 ชั่วโมง</option><option value={90}>1.5 ชั่วโมง</option></select></label></div><div className="modal-actions"><button type="button" className="secondary" onClick={onClose}>ยกเลิก</button><button className="primary" disabled={!title.trim()}>เพิ่มลงตาราง</button></div></form></div>
}

function CoachPanel({ tasks, onClose, onApply }: { tasks: Task[]; onClose: () => void; onApply: (proposal: AIProposal) => void }) {
  const proposal = useMemo<AIProposal>(() => ({ id: crypto.randomUUID(), status: 'draft', reason: 'ช่วงบ่ายมีงานต่อเนื่องนานเกินไป การเว้นช่วงพักจะช่วยรักษาพลังงาน', createdAt: new Date().toISOString(), changes: tasks.filter(t => t.status === 'planned').slice(0, 2).map((task, i) => ({ id: crypto.randomUUID(), taskId: task.id, action: 'move', before: { start: task.start, end: task.end }, after: { start: new Date(new Date(task.start).getTime() + (i + 1) * 30 * 60000).toISOString(), end: new Date(new Date(task.end).getTime() + (i + 1) * 30 * 60000).toISOString() }, accepted: true })) }), [tasks])
  const [changes, setChanges] = useState(proposal.changes)
  return <div className="coach-panel"><div className="coach-head"><div className="coach-identity"><span><Bot/></span><div><strong>Cadentra Coach</strong><small>เสนอเท่านั้น · คุณเป็นคนตัดสินใจ</small></div></div><button className="icon-button" onClick={onClose}><X/></button></div><div className="coach-content"><p className="eyebrow">ข้อเสนอสำหรับวันนี้</p><h2>เพิ่มพื้นที่พัก แล้วเลื่อน 2 งาน</h2><p>{proposal.reason}</p><div className="proposal-list">{changes.map(change => { const task = tasks.find(t => t.id === change.taskId)!; return <label key={change.id} className={change.accepted ? 'proposal accepted' : 'proposal'}><input type="checkbox" checked={change.accepted} onChange={() => setChanges(items => items.map(item => item.id === change.id ? {...item, accepted: !item.accepted} : item))}/><span><strong>{task.title}</strong><small>{formatTime(change.before!.start)} → {formatTime(change.after!.start)}</small></span><CheckCircle2/></label> })}</div><div className="safety-note"><RotateCcw size={17}/><span>หลังยืนยัน คุณสามารถย้อนกลับการเปลี่ยนแปลงทั้งหมดได้จากประวัติ</span></div></div><div className="coach-actions"><button className="secondary" onClick={onClose}>ปฏิเสธ</button><button className="primary" onClick={() => onApply({...proposal, changes, status: 'accepted'})}>ยืนยัน {changes.filter(c => c.accepted).length} รายการ</button></div></div>
}

export default App
