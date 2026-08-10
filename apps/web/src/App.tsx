import { useEffect, useMemo, useState } from 'react'
import {
  BarChart3, Bell, Bot, CalendarDays, Check, CheckCircle2, ChevronDown,
  Circle, Flame, Focus, Gauge, LayoutList, Menu, MoreHorizontal,
  Pause, Play, Plus, RotateCcw, Search, Settings, Sparkles, TimerReset,
  Trophy, X, Zap,
} from 'lucide-react'
import { completionRate, pointsForCompletion, type AIProposal, type Habit, type Task } from '@cadentra/domain'
import './App.css'

type View = 'today' | 'calendar' | 'tasks' | 'habits' | 'focus' | 'insights'

const todayKey = new Date().toISOString().slice(0, 10)
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

const navItems: { id: View; label: string; icon: typeof CalendarDays }[] = [
  { id: 'today', label: 'วันนี้', icon: Gauge },
  { id: 'calendar', label: 'ปฏิทิน', icon: CalendarDays },
  { id: 'tasks', label: 'งาน', icon: LayoutList },
  { id: 'habits', label: 'นิสัย', icon: Flame },
  { id: 'focus', label: 'โฟกัส', icon: Focus },
  { id: 'insights', label: 'ข้อมูลเชิงลึก', icon: BarChart3 },
]

const formatTime = (value: string) => new Intl.DateTimeFormat('th-TH', { hour: '2-digit', minute: '2-digit' }).format(new Date(value))

function App() {
  const [view, setView] = useState<View>('today')
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
          {navItems.map(({ id, label, icon: Icon }) => (
            <button key={id} className={view === id ? 'nav-item active' : 'nav-item'} onClick={() => { setView(id); setMenuOpen(false) }}>
              <Icon size={18} strokeWidth={1.8}/><span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <button className="nav-item"><Trophy size={18}/><span>เลเวล 4</span><em>{points} XP</em></button>
          <button className="nav-item"><Settings size={18}/><span>ตั้งค่า</span></button>
          <div className="profile"><div className="avatar">ช</div><div><strong>ชัย</strong><small>ซิงก์ในเครื่อง</small></div><MoreHorizontal size={18}/></div>
        </div>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <button className="icon-button mobile-menu" onClick={() => setMenuOpen(!menuOpen)} aria-label="เปิดเมนู"><Menu/></button>
          <div className="search"><Search size={16}/><span>ค้นหาหรือเพิ่มอย่างรวดเร็ว</span><kbd>⌘ K</kbd></div>
          <div className="top-actions"><button className="icon-button" aria-label="การแจ้งเตือน"><Bell size={19}/><i/></button><button className="primary compact" onClick={() => setAddOpen(true)}><Plus size={17}/> เพิ่ม</button></div>
        </header>

        <section className="content">
          {view === 'today' && <Today tasks={tasks} habits={habits} rate={rate} completedHabits={completedHabits} onTask={toggleTask} onHabit={toggleHabit} onCoach={() => setCoachOpen(true)} />}
          {view === 'calendar' && <CalendarView tasks={tasks} onTask={toggleTask}/>} 
          {view === 'tasks' && <TasksView tasks={tasks} onTask={toggleTask} onAdd={() => setAddOpen(true)}/>} 
          {view === 'habits' && <HabitsView habits={habits} onHabit={toggleHabit}/>} 
          {view === 'focus' && <FocusView tasks={tasks} notify={notify}/>} 
          {view === 'insights' && <InsightsView tasks={tasks} habits={habits} points={points}/>} 
        </section>
      </main>

      {menuOpen && <button className="scrim" onClick={() => setMenuOpen(false)} aria-label="ปิดเมนู"/>}
      {addOpen && <AddTaskModal onClose={() => setAddOpen(false)} onAdd={addTask}/>} 
      {coachOpen && <CoachPanel tasks={tasks} onClose={() => setCoachOpen(false)} onApply={(proposal) => { setTasks((items) => items.map((item) => { const change = proposal.changes.find((entry) => entry.taskId === item.id && entry.accepted); return change?.after ? { ...item, ...change.after } : item })); setCoachOpen(false); notify('ยืนยันตารางใหม่แล้ว · ย้อนกลับได้จากประวัติ') }}/>} 
      {toast && <div className="toast"><CheckCircle2 size={18}/>{toast}</div>}
    </div>
  )
}

function PageHeading({ eyebrow, title, detail, action }: { eyebrow: string; title: string; detail: string; action?: React.ReactNode }) {
  return <div className="page-heading"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{detail}</p></div>{action}</div>
}

function Today({ tasks, habits, rate, completedHabits, onTask, onHabit, onCoach }: { tasks: Task[]; habits: Habit[]; rate: number; completedHabits: number; onTask: (task: Task) => void; onHabit: (habit: Habit) => void; onCoach: () => void }) {
  return <>
    <PageHeading eyebrow="อังคาร · 4 สิงหาคม" title="สวัสดีตอนบ่าย, ชัย" detail="เหลืองานสำคัญอีก 2 ช่วง วันนี้ยังมีพื้นที่หายใจเพียงพอ" action={<button className="coach-button" onClick={onCoach}><Sparkles size={17}/> ให้ Coach ช่วยจัดวัน</button>}/>
    <div className="progress-line"><span style={{ width: `${rate}%` }}/></div>
    <div className="daily-summary"><div><strong>{rate}%</strong><span>แผนวันนี้</span></div><div><strong>{tasks.filter(t => t.status === 'done').length}/{tasks.length}</strong><span>งานสำเร็จ</span></div><div><strong>{completedHabits}/{habits.length}</strong><span>นิสัย</span></div><div><strong>1ชม. 30น.</strong><span>เวลาโฟกัส</span></div></div>
    <div className="today-grid">
      <section className="timeline-section">
        <div className="section-title"><div><h2>ตารางวันนี้</h2><p>เวลาท้องถิ่น · กรุงเทพฯ</p></div><button className="text-button">จัดตาราง <ChevronDown size={15}/></button></div>
        <div className="timeline">
          {tasks.map((task) => <TimelineItem key={task.id} task={task} onToggle={() => onTask(task)}/>) }
        </div>
      </section>
      <aside className="context-panel">
        <div className="section-title"><div><h2>จังหวะประจำวัน</h2><p>{completedHabits} จาก {habits.length} สำเร็จ</p></div></div>
        <div className="habit-list compact-list">{habits.map((habit) => <HabitRow key={habit.id} habit={habit} onToggle={() => onHabit(habit)}/>)}</div>
        <div className="next-focus"><span className="focus-icon"><Zap size={18}/></span><div><small>ช่วงโฟกัสถัดไป</small><strong>Deep work · 45 นาที</strong></div><button aria-label="เริ่มโฟกัส"><Play size={16} fill="currentColor"/></button></div>
        <blockquote>“วินัยที่ดีไม่ต้องสมบูรณ์แบบ แค่กลับมาให้เร็วขึ้นในแต่ละครั้ง”</blockquote>
      </aside>
    </div>
  </>
}

function TimelineItem({ task, onToggle }: { task: Task; onToggle: () => void }) {
  return <div className={`timeline-item ${task.status}`}>
    <time>{formatTime(task.start)}</time><span className="time-dot"/>
    <div className="timeline-content"><button className="check-button" onClick={onToggle} aria-label={task.status === 'done' ? 'ยกเลิกสำเร็จ' : 'ทำสำเร็จ'}>{task.status === 'done' ? <Check size={15}/> : <Circle size={15}/>}</button><div><strong>{task.title}</strong><small>{formatTime(task.start)}–{formatTime(task.end)} · {task.category}{task.recurring ? ' · ทำซ้ำ' : ''}</small></div><span className={`priority ${task.priority}`}>{task.priority === 'high' ? 'สำคัญ' : task.priority === 'medium' ? 'ปกติ' : 'ยืดหยุ่น'}</span></div>
  </div>
}

function HabitRow({ habit, onToggle }: { habit: Habit; onToggle: () => void }) {
  const complete = habit.completedDates.includes(todayKey)
  return <button className={complete ? 'habit-row complete' : 'habit-row'} onClick={onToggle}>
    <span className="habit-check">{complete && <Check size={15}/>}</span><span><strong>{habit.title}</strong><small>{habit.cue} · {habit.target} {habit.unit}</small></span><em><Flame size={13}/>{habit.streak}</em>
  </button>
}

function CalendarView({ tasks, onTask }: { tasks: Task[]; onTask: (task: Task) => void }) {
  const days = ['จ. 3', 'อ. 4', 'พ. 5', 'พฤ. 6', 'ศ. 7']
  return <><PageHeading eyebrow="สัปดาห์ที่ 32" title="ปฏิทิน" detail="เห็นภาระ เวลาโฟกัส และพื้นที่ว่างในสัปดาห์เดียว" action={<div className="segmented"><button>วัน</button><button className="active">สัปดาห์</button><button>เดือน</button></div>}/>
    <div className="calendar-board"><div className="calendar-corner">GMT+7</div>{days.map((day, index) => <div className={index === 1 ? 'calendar-day active' : 'calendar-day'} key={day}>{day}<strong>{index + 3}</strong></div>)}
      {Array.from({ length: 10 }, (_, row) => <div className="calendar-hour" key={row}>{8 + row}:00</div>)}
      <div className="calendar-grid-lines">{Array.from({ length: 50 }, (_, index) => <i key={index}/>)}</div>
      {tasks.map((task) => { const start = new Date(task.start); const duration = (new Date(task.end).getTime() - start.getTime()) / 3600000; return <button key={task.id} className={`calendar-block ${task.status}`} onClick={() => onTask(task)} style={{ gridColumn: 3, gridRow: `${start.getHours() - 8 + 3} / span ${Math.max(1, Math.round(duration))}` }}>{task.title}<small>{formatTime(task.start)}</small></button> })}
    </div></>
}

function TasksView({ tasks, onTask, onAdd }: { tasks: Task[]; onTask: (task: Task) => void; onAdd: () => void }) {
  const groups = ['in_progress', 'planned', 'done'] as const
  const labels = { in_progress: 'กำลังทำ', planned: 'วางแผนแล้ว', done: 'สำเร็จ' }
  return <><PageHeading eyebrow="พื้นที่จัดการ" title="งานทั้งหมด" detail="เก็บทุกสิ่งไว้ที่เดียว แล้วเลือกสิ่งที่สำคัญจริง ๆ" action={<button className="primary" onClick={onAdd}><Plus size={17}/> เพิ่มงาน</button>}/>
    <div className="task-toolbar"><div className="segmented"><button className="active">รายการ</button><button>ลำดับความสำคัญ</button></div><button className="filter-button">ทุกหมวดหมู่ <ChevronDown size={14}/></button></div>
    <div className="task-groups">{groups.map((group) => <section key={group}><div className="group-heading"><h2>{labels[group]}</h2><span>{tasks.filter(t => t.status === group).length}</span></div>{tasks.filter(t => t.status === group).map(task => <div className="task-row" key={task.id}><button className="check-button" onClick={() => onTask(task)}>{task.status === 'done' ? <Check size={15}/> : <Circle size={15}/>}</button><div><strong>{task.title}</strong><small>{task.category} · {formatTime(task.start)}</small></div><span className={`priority ${task.priority}`}>{task.priority}</span><MoreHorizontal size={17}/></div>)}</section>)}</div></>
}

function HabitsView({ habits, onHabit }: { habits: Habit[]; onHabit: (habit: Habit) => void }) {
  return <><PageHeading eyebrow="สร้างความสม่ำเสมอ" title="นิสัยของฉัน" detail="ความก้าวหน้าไม่หายไปเพราะวันที่ไม่สมบูรณ์แบบ" action={<button className="primary"><Plus size={17}/> สร้างนิสัย</button>}/>
    <div className="habit-hero"><div><span>ความสม่ำเสมอสัปดาห์นี้</span><strong>82%</strong><p>ดีขึ้น 9% จากสัปดาห์ก่อน</p></div><div className="week-dots">{['จ','อ','พ','พฤ','ศ','ส','อา'].map((day, i) => <span className={i < 5 ? 'filled' : ''} key={day}>{day}</span>)}</div></div>
    <div className="habit-table"><div className="habit-table-head"><span>นิสัย</span><span>เป้าหมาย</span><span>Streak</span><span>วันนี้</span></div>{habits.map(habit => <div className="habit-table-row" key={habit.id}><div><span className="habit-symbol"><Flame size={18}/></span><div><strong>{habit.title}</strong><small>{habit.cue}</small></div></div><span>{habit.target} {habit.unit}</span><span><Flame size={14}/> {habit.streak} วัน</span><button onClick={() => onHabit(habit)} className={habit.completedDates.includes(todayKey) ? 'done' : ''}>{habit.completedDates.includes(todayKey) ? <Check/> : <Circle/>}</button></div>)}</div></>
}

function FocusView({ tasks, notify }: { tasks: Task[]; notify: (message: string) => void }) {
  const [seconds, setSeconds] = useState(45 * 60)
  const [running, setRunning] = useState(false)
  useEffect(() => { if (!running) return; const timer = window.setInterval(() => setSeconds(value => { if (value <= 1) { setRunning(false); notify('จบช่วงโฟกัสแล้ว พักสายตาสักครู่'); return 45 * 60 } return value - 1 }), 1000); return () => clearInterval(timer) }, [running, notify])
  const minutes = Math.floor(seconds / 60); const secs = seconds % 60
  return <><PageHeading eyebrow="พื้นที่เงียบ" title="โหมดโฟกัส" detail="ทำสิ่งเดียวให้เต็มที่ แล้วพักอย่างตั้งใจ"/>
    <div className="focus-stage"><div className={running ? 'timer-ring running' : 'timer-ring'} style={{ '--progress': `${(seconds / 2700) * 360}deg` } as React.CSSProperties}><div><small>{running ? 'กำลังโฟกัส' : 'พร้อมเมื่อคุณพร้อม'}</small><strong>{String(minutes).padStart(2,'0')}:{String(secs).padStart(2,'0')}</strong><span>45 นาที</span></div></div><div className="focus-task"><small>โฟกัสกับ</small><strong>{tasks.find(t => t.status === 'in_progress')?.title ?? 'เลือกงานหนึ่งอย่าง'}</strong></div><div className="timer-actions"><button className="icon-button large" onClick={() => { setSeconds(45 * 60); setRunning(false) }}><TimerReset/></button><button className="play-button" onClick={() => setRunning(!running)}>{running ? <Pause fill="currentColor"/> : <Play fill="currentColor"/>}</button><button className="icon-button large"><MoreHorizontal/></button></div><p className="focus-note">ปิดสิ่งรบกวนแล้ว · การแจ้งเตือนสำคัญยังทำงาน</p></div></>
}

function InsightsView({ tasks, habits, points }: { tasks: Task[]; habits: Habit[]; points: number }) {
  const bars = [46, 62, 54, 78, 88, 32, 68]
  return <><PageHeading eyebrow="7 วันที่ผ่านมา" title="ข้อมูลเชิงลึก" detail="ดูแนวโน้มเพื่อปรับระบบ ไม่ใช่เพื่อตัดสินตัวเอง" action={<button className="filter-button">สัปดาห์นี้ <ChevronDown size={14}/></button>}/>
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
