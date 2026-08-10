import { useCallback, useEffect, useState } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router'
import { toast } from 'sonner'
import {
  AlertTriangle, BarChart3, Bell, CalendarDays, ChevronDown, Cloud, CloudOff,
  Flame, Focus, Gauge, Languages, LayoutList, Menu,
  LogOut, Plus, Search, Settings, Sparkles,
  Target, Trophy, X,
} from 'lucide-react'
import { collapseRecurringTasks, completionRate, findScheduleConflicts, pointsForCompletion, type Goal, type Habit, type Milestone, type Task } from '@cadentra/domain'
import type { SyncIssue, UpdateProfileInput, UserDataGateway } from '@cadentra/data'
import { PageHeading } from './components/PageHeading'
import { AppToaster } from './components/AppToaster'
import { useAuth } from './auth/AuthContext'
import { CalendarView } from './features/calendar/CalendarView'
import { FocusView } from './features/focus/FocusView'
import { GoalsView } from './features/goals/GoalsView'
import { HabitsView } from './features/habits/HabitsView'
import { TasksView } from './features/tasks/TasksView'
import { TodayView } from './features/today/TodayView'
import { SettingsView } from './features/settings/SettingsView'
import { useUserData } from './data/useUserData'
import { useI18n } from './i18n/LocaleProvider'
import type { MessageKey } from './i18n/messages'
import { formatMinutes, formatTime, localDateKey, todayKey } from './lib/date'
import { pathToView, viewPaths, type View } from './routing'

const navItems: { id: View; labelKey: MessageKey; icon: typeof CalendarDays }[] = [
  { id: 'today', labelKey: 'nav.today', icon: Gauge },
  { id: 'calendar', labelKey: 'nav.calendar', icon: CalendarDays },
  { id: 'tasks', labelKey: 'nav.tasks', icon: LayoutList },
  { id: 'goals', labelKey: 'nav.goals', icon: Target },
  { id: 'habits', labelKey: 'nav.habits', icon: Flame },
  { id: 'focus', labelKey: 'nav.focus', icon: Focus },
  { id: 'insights', labelKey: 'nav.insights', icon: BarChart3 },
]

function App({ dataGateway }: { dataGateway: UserDataGateway | null }) {
  const { session, signOut } = useAuth()
  const { locale, setLocale, t } = useI18n()
  const location = useLocation()
  const navigate = useNavigate()
  const view = pathToView(location.pathname)
  const { snapshot, loading, error, reload, online, pendingCount, syncIssues } = useUserData(dataGateway, session?.user.id)
  const { profile, tasks, goals, milestones, habits, points, focusMinutes } = snapshot
  const [menuOpen, setMenuOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [habitAddOpen, setHabitAddOpen] = useState(false)
  const todayTasks = tasks.filter((task) => localDateKey(task.start) === todayKey)
  const managedTasks = collapseRecurringTasks(tasks, todayKey)
  const rate = completionRate(todayTasks)
  const completedHabits = habits.filter((habit) => habit.completedDates.includes(todayKey)).length
  const notify = useCallback((message: string) => { toast.success(message) }, [])

  useEffect(() => {
    if (profile?.locale && profile.locale !== locale) setLocale(profile.locale)
  }, [locale, profile?.locale, setLocale])

  const toggleTask = async (task: Task) => {
    if (!dataGateway || !session) return
    const completing = task.status !== 'done'
    const result = task.sourceTaskId && task.occurrenceDate
      ? await dataGateway.setTaskOccurrenceStatus(session.user.id, task.sourceTaskId, task.occurrenceDate, completing ? 'done' : 'planned')
      : await dataGateway.setTaskStatus(session.user.id, task.id, completing ? 'done' : 'planned', task.updatedAt)
    if (!result.ok) {
      if (result.error.code === 'conflict') await reload()
      return toast.error(result.error.code === 'conflict' ? 'พบข้อมูลชนกัน กรุณาเลือกเวอร์ชัน' : 'บันทึกสถานะงานไม่สำเร็จ', { description: result.error.message })
    }
    const amount = completing ? pointsForCompletion(task.priority) : -pointsForCompletion(task.priority)
    const pointsResult = await dataGateway.recordPoints(session.user.id, 'task', task.sourceTaskId ?? task.id, amount, completing ? 'task_completed' : 'task_reopened')
    if (!pointsResult.ok) toast.warning('สถานะงานถูกบันทึก แต่คะแนนยังไม่อัปเดต')
    await reload()
    if (completing) notify(`ทำสำเร็จ · +${pointsForCompletion(task.priority)} คะแนน`)
    else toast.info('ย้ายกลับไปยังแผนแล้ว')
  }

  const toggleHabit = async (habit: Habit) => {
    if (!dataGateway || !session) return
    const complete = !habit.completedDates.includes(todayKey)
    const result = await dataGateway.setHabitCheckIn(session.user.id, habit.id, todayKey, complete)
    if (!result.ok) return toast.error('บันทึกนิสัยไม่สำเร็จ', { description: result.error.message })
    const pointsResult = await dataGateway.recordPoints(session.user.id, 'habit', habit.id, complete ? 8 : -8, complete ? 'habit_checked_in' : 'habit_checkin_removed')
    if (!pointsResult.ok) toast.warning('เช็กอินถูกบันทึก แต่คะแนนยังไม่อัปเดต')
    await reload()
    if (complete) notify('รักษาจังหวะได้อีกหนึ่งวัน · +8 คะแนน')
    else toast.info('ไม่เป็นไร เริ่มใหม่ได้เสมอ')
  }

  const addTask = async (title: string, time: string, duration: number, goalId?: string, recurrenceRule?: string) => {
    if (!dataGateway || !session) return
    const [hour, minute] = time.split(':').map(Number)
    const start = new Date(); start.setHours(hour, minute, 0, 0)
    const end = new Date(start.getTime() + duration * 60000)
    const result = await dataGateway.createTask(session.user.id, { title, start: start.toISOString(), end: end.toISOString(), goalId, recurrenceRule })
    if (!result.ok) return toast.error('เพิ่มงานไม่สำเร็จ', { description: result.error.message })
    await reload()
    setAddOpen(false); notify('เพิ่มลงในวันนี้แล้ว')
  }

  const createGoal = async (title: string, description: string, targetDate?: string) => {
    if (!dataGateway || !session) return
    const result = await dataGateway.createGoal(session.user.id, { title, description, targetDate })
    if (!result.ok) return void toast.error('สร้างเป้าหมายไม่สำเร็จ', { description: result.error.message })
    await reload(); notify('สร้างเป้าหมายแล้ว')
  }

  const toggleGoal = async (goal: Goal) => {
    if (!dataGateway || !session) return
    const result = await dataGateway.setGoalStatus(session.user.id, goal.id, goal.status === 'done' ? 'planned' : 'done')
    if (!result.ok) return void toast.error('อัปเดตเป้าหมายไม่สำเร็จ', { description: result.error.message })
    await reload()
  }

  const deleteGoal = async (goal: Goal) => {
    if (!dataGateway || !session) return
    const result = await dataGateway.softDeleteGoal(session.user.id, goal.id)
    if (!result.ok) return void toast.error('ลบเป้าหมายไม่สำเร็จ', { description: result.error.message })
    await reload(); notify('ลบเป้าหมายแล้ว')
  }

  const createMilestone = async (goalId: string, title: string, targetDate: string | undefined, sortOrder: number) => {
    if (!dataGateway || !session) return
    const result = await dataGateway.createMilestone(session.user.id, { goalId, title, targetDate, sortOrder })
    if (!result.ok) return void toast.error('เพิ่ม Milestone ไม่สำเร็จ', { description: result.error.message })
    await reload(); notify('เพิ่ม Milestone แล้ว')
  }

  const toggleMilestone = async (milestone: Milestone) => {
    if (!dataGateway || !session) return
    const result = await dataGateway.setMilestoneStatus(session.user.id, milestone.id, milestone.status === 'done' ? 'planned' : 'done')
    if (!result.ok) return void toast.error('อัปเดต Milestone ไม่สำเร็จ', { description: result.error.message })
    await reload()
  }

  const deleteMilestone = async (milestone: Milestone) => {
    if (!dataGateway || !session) return
    const result = await dataGateway.softDeleteMilestone(session.user.id, milestone.id)
    if (!result.ok) return void toast.error('ลบ Milestone ไม่สำเร็จ', { description: result.error.message })
    await reload()
  }

  const addHabit = async (title: string, cue: string, target: number, unit: string) => {
    if (!dataGateway || !session) return
    const result = await dataGateway.createHabit(session.user.id, { title, cue, target, unit })
    if (!result.ok) return toast.error('เพิ่มนิสัยไม่สำเร็จ', { description: result.error.message })
    await reload()
    setHabitAddOpen(false); notify('เพิ่มนิสัยแล้ว')
  }

  const deleteTask = useCallback(async (task: Task) => {
    if (!dataGateway || !session) return
    const taskId = task.sourceTaskId ?? task.id
    const result = await dataGateway.softDeleteTask(session.user.id, taskId)
    if (!result.ok) return toast.error('ลบงานไม่สำเร็จ', { description: result.error.message })
    await reload()
    toast.success('ลบงานแล้ว', {
      description: task.title,
      action: {
        label: 'เลิกทำ',
        onClick: () => void dataGateway.restoreTask(session.user.id, taskId).then(async (restoreResult) => {
          if (!restoreResult.ok) return toast.error('กู้คืนงานไม่สำเร็จ', { description: restoreResult.error.message })
          await reload()
        }),
      },
    })
  }, [dataGateway, reload, session])

  const recordFocus = async (task: Task | undefined, plannedMinutes: number, elapsedSeconds: number) => {
    if (!dataGateway || !session) return
    const result = await dataGateway.recordFocusSession(session.user.id, task?.sourceTaskId ?? task?.id, plannedMinutes, elapsedSeconds)
    if (!result.ok) return toast.error('บันทึกเวลาโฟกัสไม่สำเร็จ', { description: result.error.message })
    await reload()
  }

  const saveProfile = async (input: UpdateProfileInput) => {
    if (!dataGateway || !session) return false
    const result = await dataGateway.saveProfile(session.user.id, input)
    if (!result.ok) {
      toast.error('บันทึกการตั้งค่าไม่สำเร็จ', { description: result.error.message })
      return false
    }
    setLocale(input.locale)
    await reload()
    notify('บันทึกการตั้งค่าแล้ว')
    return true
  }

  const exportAccount = async () => {
    if (!dataGateway || !session) return false
    const result = await dataGateway.exportAccount(session.user.id)
    if (!result.ok) {
      toast.error('ส่งออกข้อมูลไม่สำเร็จ', { description: result.error.message })
      return false
    }
    const url = URL.createObjectURL(new Blob([JSON.stringify(result.value, null, 2)], { type: 'application/json' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `cadentra-export-${todayKey}.json`
    link.click()
    URL.revokeObjectURL(url)
    notify('เตรียมไฟล์ข้อมูลแล้ว')
    return true
  }

  const deleteAccount = async () => {
    if (!dataGateway) return false
    const result = await dataGateway.deleteAccount()
    if (!result.ok) {
      toast.error('ลบบัญชีไม่สำเร็จ', { description: result.error.message })
      return false
    }
    toast.success('ลบบัญชีและข้อมูลแล้ว')
    return true
  }

  const handleSignOut = async () => {
    const result = await signOut()
    if (!result.ok) toast.error('ออกจากระบบไม่สำเร็จ', { description: result.message })
  }

  const resolveSyncIssue = async (issue: SyncIssue, resolution: 'local' | 'cloud') => {
    if (!dataGateway?.resolveSyncIssue || !session) return
    const result = await dataGateway.resolveSyncIssue(session.user.id, issue.id, resolution)
    if (!result.ok) {
      toast.error('แก้ข้อมูลชนกันไม่สำเร็จ', { description: result.error.message })
      return
    }
    await reload()
    toast.success(resolution === 'local' ? 'ใช้ข้อมูลจากอุปกรณ์นี้แล้ว' : 'ใช้ข้อมูลล่าสุดจากคลาวด์แล้ว')
  }

  const level = Math.floor(points / 100) + 1
  const accountEmail = session?.user.email ?? ''
  const displayName = profile?.displayName || accountEmail.split('@')[0] || ''

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
          <div className={online && pendingCount === 0 ? 'sync-status synced' : 'sync-status pending'} role="status">
            {online && pendingCount === 0 ? <Cloud size={15}/> : <CloudOff size={15}/>}<span>{syncIssues.length ? `ข้อมูลชนกัน ${syncIssues.length} รายการ` : online ? (pendingCount ? `รอซิงก์ ${pendingCount} รายการ` : 'ซิงก์แล้ว') : `ออฟไลน์${pendingCount ? ` · รอซิงก์ ${pendingCount}` : ''}`}</span>
          </div>
          {profile?.gamificationEnabled !== false && <button className="nav-item"><Trophy size={18}/><span>เลเวล {level}</span><em>{points} XP</em></button>}
          <button className={view === 'settings' ? 'nav-item active' : 'nav-item'} onClick={() => navigate(viewPaths.settings)}><Settings size={18}/><span>{t('nav.settings')}</span></button>
          <div className="profile"><div className="avatar">{displayName.slice(0, 1).toUpperCase()}</div><div><strong>{displayName}</strong><small>{accountEmail}</small></div><button type="button" className="grid size-8 place-items-center rounded-lg text-muted hover:bg-[#e3e2da] hover:text-ink" onClick={() => void handleSignOut()} aria-label="ออกจากระบบ"><LogOut size={16}/></button></div>
        </div>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <button className="icon-button mobile-menu" onClick={() => setMenuOpen(!menuOpen)} aria-label="เปิดเมนู"><Menu/></button>
          <div className="search"><Search size={16}/><span>{t('top.search')}</span><kbd>⌘ K</kbd></div>
          <div className="top-actions"><button className="language-button" onClick={() => setLocale(locale === 'th' ? 'en' : 'th')} aria-label={t('action.language')}><Languages size={16}/>{locale.toUpperCase()}</button><button className="icon-button" aria-label={t('top.notifications')}><Bell size={19}/><i/></button><button className="primary compact" onClick={() => setAddOpen(true)}><Plus size={17}/> {t('action.add')}</button></div>
        </header>

        <section className="content">
          {syncIssues[0] && <SyncConflictBanner issue={syncIssues[0]} onResolve={resolveSyncIssue}/>}
          {loading ? <DataLoading/> : error ? <DataLoadError message={error} onRetry={() => void reload()}/> : <Routes>
            <Route path="/" element={<Navigate to={viewPaths.today} replace/>}/>
            <Route path={viewPaths.today} element={<TodayView tasks={todayTasks} habits={habits} rate={rate} completedHabits={completedHabits} focusMinutes={focusMinutes} displayName={displayName} onTask={toggleTask} onHabit={toggleHabit} onCoach={() => toast.info('AI Coach จะเปิดใช้เมื่อ Edge Function พร้อม')} />}/>
            <Route path={viewPaths.calendar} element={<CalendarView tasks={tasks} onTask={toggleTask}/>}/>
            <Route path={viewPaths.tasks} element={<TasksView tasks={managedTasks} onTask={toggleTask} onDelete={deleteTask} onAdd={() => setAddOpen(true)}/>}/>
            <Route path={viewPaths.goals} element={<GoalsView goals={goals} milestones={milestones} tasks={managedTasks} onCreateGoal={createGoal} onToggleGoal={toggleGoal} onDeleteGoal={deleteGoal} onCreateMilestone={createMilestone} onToggleMilestone={toggleMilestone} onDeleteMilestone={deleteMilestone}/>}/>
            <Route path={viewPaths.habits} element={<HabitsView habits={habits} onHabit={toggleHabit} onAdd={() => setHabitAddOpen(true)}/>}/>
            <Route path={viewPaths.focus} element={<FocusView tasks={managedTasks} notify={notify} onComplete={recordFocus}/>}/>
            <Route path={viewPaths.insights} element={<InsightsView tasks={managedTasks} habits={habits} points={points} focusMinutes={focusMinutes}/>}/>
            <Route path={viewPaths.settings} element={<SettingsView profile={profile} email={accountEmail} onSave={saveProfile} onExport={exportAccount} onDelete={deleteAccount}/>}/>
            <Route path="*" element={<Navigate to={viewPaths.today} replace/>}/>
          </Routes>}
        </section>
      </main>

      {menuOpen && <button className="scrim" onClick={() => setMenuOpen(false)} aria-label="ปิดเมนู"/>}
      {addOpen && <AddTaskModal goals={goals} tasks={tasks} onClose={() => setAddOpen(false)} onAdd={addTask}/>}
      {habitAddOpen && <AddHabitModal onClose={() => setHabitAddOpen(false)} onAdd={addHabit}/>}
      <AppToaster/>
    </div>
  )
}

function SyncConflictBanner({ issue, onResolve }: { issue: SyncIssue; onResolve: (issue: SyncIssue, resolution: 'local' | 'cloud') => Promise<void> }) {
  return <div className="mb-6 flex items-start gap-3 rounded-xl border border-[#dcc48f] bg-[#f4ecd9] p-4 text-sm" role="alert"><AlertTriangle className="mt-0.5 shrink-0 text-[#8a6126]" size={18}/><div className="min-w-0 flex-1"><strong className="block">{issue.title}</strong><p className="mt-1 text-xs leading-5 text-muted">{issue.detail} เลือกว่าจะเก็บการเปลี่ยนแปลงจากเครื่องนี้ หรือกลับไปใช้ข้อมูลล่าสุดจาก Supabase</p><div className="mt-3 flex flex-wrap gap-2"><button type="button" className="primary compact" onClick={() => void onResolve(issue, 'local')}>ใช้ข้อมูลในเครื่อง</button><button type="button" className="secondary" onClick={() => void onResolve(issue, 'cloud')}>ใช้ข้อมูลบนคลาวด์</button></div></div></div>
}

function DataLoading() {
  return <div className="grid min-h-[420px] place-items-center" aria-busy="true"><p className="text-sm text-muted">กำลังโหลดข้อมูลของคุณ…</p></div>
}

function DataLoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <div className="grid min-h-[420px] place-items-center" role="alert"><div className="max-w-md text-center"><h2 className="font-display text-2xl">โหลดข้อมูลไม่สำเร็จ</h2><p className="mt-2 text-sm text-muted">{message}</p><button className="primary mt-5" onClick={onRetry}>ลองใหม่</button></div></div>
}

function InsightsView({ tasks, habits, points, focusMinutes }: { tasks: Task[]; habits: Habit[]; points: number; focusMinutes: number }) {
  const { t } = useI18n()
  const completedTasks = tasks.filter((task) => task.status === 'done').length
  const completedToday = habits.filter((habit) => habit.completedDates.includes(todayKey)).length
  const consistency = habits.length ? Math.round((completedToday / habits.length) * 100) : 0
  return <><PageHeading eyebrow={t('insights.eyebrow')} title={t('insights.title')} detail={t('insights.detail')} action={<button className="filter-button">สัปดาห์นี้ <ChevronDown size={14}/></button>}/>
    <div className="insight-strip"><div><small>ความสม่ำเสมอวันนี้</small><strong>{consistency}%</strong><em>{completedToday}/{habits.length} นิสัย</em></div><div><small>เวลาโฟกัสวันนี้</small><strong>{formatMinutes(focusMinutes)}</strong><em>จาก Focus sessions</em></div><div><small>งานสำเร็จ</small><strong>{completedTasks}</strong><em>จาก {tasks.length} งาน</em></div><div><small>คะแนนสะสม</small><strong>{points}</strong><em>จากกิจกรรมที่บันทึก</em></div></div>
    <div className="insights-grid"><section className="chart-panel"><div className="section-title"><div><h2>ข้อมูลแนวโน้ม</h2><p>Cadentra จะแสดงแนวโน้มเมื่อมีข้อมูลหลายวันเพียงพอ</p></div></div><div className="grid min-h-48 place-items-center text-sm text-muted">ยังไม่มีข้อมูลรายวันที่เพียงพอ</div></section><section className="reflection-panel"><span className="reflection-icon"><Sparkles/></span><p className="eyebrow">สิ่งที่ค้นพบ</p><h2>ยังไม่มีข้อสรุป</h2><p>ใช้งานและทำ Weekly Review ต่อเนื่อง แล้วระบบจะสรุปจากข้อมูลจริงของคุณที่นี่</p></section></div>
    <section className="streak-section"><div className="section-title"><div><h2>นิสัยที่กำลังเติบโต</h2><p>ความสม่ำเสมอสำคัญกว่าความสมบูรณ์แบบ</p></div></div>{habits.map(h => <div className="streak-row" key={h.id}><strong>{h.title}</strong><div>{Array.from({length: 14}, (_, i) => <i className={i < Math.min(h.streak, 14) ? 'filled' : ''} key={i}/>)}</div><span>{h.streak} วัน</span></div>)}</section></>
}

export function AddTaskModal({ goals, tasks, onClose, onAdd }: { goals: Goal[]; tasks: Task[]; onClose: () => void; onAdd: (title: string, time: string, duration: number, goalId?: string, recurrenceRule?: string) => void }) {
  const [title, setTitle] = useState(''); const [time, setTime] = useState('15:30'); const [duration, setDuration] = useState(45); const [goalId, setGoalId] = useState(''); const [recurrenceRule, setRecurrenceRule] = useState(''); const [conflicts, setConflicts] = useState<Task[]>([])
  const save = () => onAdd(title.trim(), time, duration, goalId || undefined, recurrenceRule || undefined)
  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!title.trim()) return
    const [hour, minute] = time.split(':').map(Number)
    const start = new Date(); start.setHours(hour, minute, 0, 0)
    const matches = findScheduleConflicts(tasks, { start: start.toISOString(), end: new Date(start.getTime() + duration * 60_000).toISOString() })
    if (matches.length) { setConflicts(matches); return }
    save()
  }
  return <div className="modal-backdrop" onMouseDown={onClose}><form className="modal" onMouseDown={e => e.stopPropagation()} onSubmit={submit}><div className="modal-head"><div><p className="eyebrow">เพิ่มอย่างรวดเร็ว</p><h2>วางลงในวันนี้</h2></div><button type="button" className="icon-button" onClick={onClose}><X/></button></div><label>สิ่งที่ต้องทำ<input autoFocus value={title} onChange={e => { setTitle(e.target.value); setConflicts([]) }} placeholder="เช่น อ่านหนังสือ 20 นาที"/></label><div className="form-grid"><label>เริ่มเวลา<input type="time" value={time} onChange={e => { setTime(e.target.value); setConflicts([]) }}/></label><label>ระยะเวลา<select value={duration} onChange={e => { setDuration(Number(e.target.value)); setConflicts([]) }}><option value={15}>15 นาที</option><option value={30}>30 นาที</option><option value={45}>45 นาที</option><option value={60}>1 ชั่วโมง</option><option value={90}>1.5 ชั่วโมง</option></select></label></div><div className="form-grid">{goals.length > 0 && <label>เชื่อมกับเป้าหมาย<select value={goalId} onChange={e => setGoalId(e.target.value)}><option value="">ไม่เชื่อมเป้าหมาย</option>{goals.filter(goal => goal.status !== 'done').map(goal => <option value={goal.id} key={goal.id}>{goal.title}</option>)}</select></label>}<label>ทำซ้ำ<select aria-label="ทำซ้ำ" value={recurrenceRule} onChange={e => setRecurrenceRule(e.target.value)}><option value="">ไม่ทำซ้ำ</option><option value="FREQ=DAILY">ทุกวัน</option><option value="FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR">วันจันทร์–ศุกร์</option><option value="FREQ=WEEKLY">ทุกสัปดาห์</option></select></label></div>{recurrenceRule && <p className="mt-3 text-xs text-accent">ระบบจะสร้างรอบงานเมื่อแสดงปฏิทิน โดยไม่บันทึกงานอนาคตซ้ำทั้งหมด</p>}{conflicts.length > 0 && <div className="mt-4 rounded-xl border border-[#dcc48f] bg-[#f4ecd9] p-3 text-xs"><strong className="block text-[#7a5623]">เวลานี้ชนกับ {conflicts.length} งาน</strong><ul className="mt-2 space-y-1 text-muted">{conflicts.slice(0, 3).map(task => <li key={task.id}>• {task.title} · {formatTime(task.start)}</li>)}</ul><p className="mt-2 text-muted">คุณสามารถกลับไปแก้เวลา หรือยืนยันเพื่อวางงานซ้อนกันได้</p></div>}<div className="modal-actions"><button type="button" className="secondary" onClick={onClose}>ยกเลิก</button>{conflicts.length > 0 && <button type="button" className="secondary" onClick={() => setConflicts([])}>แก้เวลา</button>}<button type={conflicts.length ? 'button' : 'submit'} className="primary" disabled={!title.trim()} onClick={conflicts.length ? save : undefined}>{conflicts.length ? 'ยืนยันเพิ่มงาน' : 'เพิ่มลงตาราง'}</button></div></form></div>
}

function AddHabitModal({ onClose, onAdd }: { onClose: () => void; onAdd: (title: string, cue: string, target: number, unit: string) => void }) {
  const [title, setTitle] = useState('')
  const [cue, setCue] = useState('')
  const [target, setTarget] = useState(1)
  const [unit, setUnit] = useState('ครั้ง')
  return <div className="modal-backdrop" onMouseDown={onClose}><form className="modal" onMouseDown={(event) => event.stopPropagation()} onSubmit={(event) => { event.preventDefault(); if (title.trim() && target > 0) onAdd(title.trim(), cue.trim(), target, unit.trim() || 'ครั้ง') }}><div className="modal-head"><div><p className="eyebrow">สร้างจังหวะใหม่</p><h2>เพิ่มนิสัย</h2></div><button type="button" className="icon-button" onClick={onClose} aria-label="ปิด"><X/></button></div><label>ชื่อนิสัย<input autoFocus value={title} onChange={(event) => setTitle(event.target.value)} placeholder="เช่น อ่านหนังสือ"/></label><label>ทำหลังจากอะไร<input value={cue} onChange={(event) => setCue(event.target.value)} placeholder="เช่น หลังอาหารเช้า"/></label><div className="form-grid"><label>เป้าหมาย<input type="number" min="1" step="1" value={target} onChange={(event) => setTarget(Number(event.target.value))}/></label><label>หน่วย<input value={unit} onChange={(event) => setUnit(event.target.value)} placeholder="ครั้ง / นาที / แก้ว"/></label></div><div className="modal-actions"><button type="button" className="secondary" onClick={onClose}>ยกเลิก</button><button className="primary" disabled={!title.trim() || target <= 0}>เพิ่มนิสัย</button></div></form></div>
}

export default App
