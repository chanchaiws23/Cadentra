import { lazy, Suspense, useCallback, useEffect, useState } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router'
import { toast } from 'sonner'
import {
  AlertTriangle, BarChart3, Bell, CalendarDays, Cloud, CloudOff,
  Flame, Focus, Gauge, Languages, LayoutList, Menu,
  LogOut, Plus, Redo2, Search, Settings,
  Target, Trophy, X,
  Undo2,
} from 'lucide-react'
import { collapseRecurringTasks, completionRate, findScheduleConflicts, pointsForCompletion, type AIProposal, type Goal, type Habit, type HabitType, type Milestone, type PersonalReward, type Task } from '@cadentra/domain'
import type { RecordFocusSessionInput, SaveReflectionInput, SyncIssue, UpdateProfileInput, UserDataGateway } from '@cadentra/data'
import { AppToaster } from './components/AppToaster'
import { useAuth } from './auth/AuthContext'
import { CoachDialog } from './features/coach/CoachDialog'
import { useUserData } from './data/useUserData'
import { useI18n } from './i18n/LocaleContext'
import type { MessageKey } from './i18n/messages'
import { formatTime, localDateKey, todayKey } from './lib/date'
import { pathToView, viewPaths, type View } from './routing'
import { useCommandHistory } from './history/useCommandHistory'
import { canSendNotification } from './lib/notifications'
import { buildActivityCsv } from './lib/activity-export'
import { buildReviewReportHtml } from './lib/review-report'
import { registerPushDevice } from './lib/push-registration'
import { environment } from './config/environment'
import { readHealthConnectDay } from './lib/health-connect'

const navItems: { id: View; labelKey: MessageKey; icon: typeof CalendarDays }[] = [
  { id: 'today', labelKey: 'nav.today', icon: Gauge },
  { id: 'calendar', labelKey: 'nav.calendar', icon: CalendarDays },
  { id: 'tasks', labelKey: 'nav.tasks', icon: LayoutList },
  { id: 'goals', labelKey: 'nav.goals', icon: Target },
  { id: 'habits', labelKey: 'nav.habits', icon: Flame },
  { id: 'focus', labelKey: 'nav.focus', icon: Focus },
  { id: 'insights', labelKey: 'nav.insights', icon: BarChart3 },
]

const TodayView = lazy(() => import('./features/today/TodayView').then((module) => ({ default: module.TodayView })))
const CalendarView = lazy(() => import('./features/calendar/CalendarView').then((module) => ({ default: module.CalendarView })))
const TasksView = lazy(() => import('./features/tasks/TasksView').then((module) => ({ default: module.TasksView })))
const GoalsView = lazy(() => import('./features/goals/GoalsView').then((module) => ({ default: module.GoalsView })))
const HabitsView = lazy(() => import('./features/habits/HabitsView').then((module) => ({ default: module.HabitsView })))
const FocusView = lazy(() => import('./features/focus/FocusView').then((module) => ({ default: module.FocusView })))
const InsightsView = lazy(() => import('./features/insights/InsightsView').then((module) => ({ default: module.InsightsView })))
const SettingsView = lazy(() => import('./features/settings/SettingsView').then((module) => ({ default: module.SettingsView })))

function App({ dataGateway }: { dataGateway: UserDataGateway | null }) {
  const { session, signOut } = useAuth()
  const { locale, setLocale, t } = useI18n()
  const location = useLocation()
  const navigate = useNavigate()
  const view = pathToView(location.pathname)
  const { snapshot, loading, error, reload, online, pendingCount, syncIssues } = useUserData(dataGateway, session?.user.id)
  const { profile, tasks, goals, milestones, habits, points, focusMinutes, focusSessions, notificationRule, reflections, calendarConnection, externalCalendarEvents, rewards, aiProposals, healthAggregates } = snapshot
  const [menuOpen, setMenuOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [habitAddOpen, setHabitAddOpen] = useState(false)
  const [coachOpen, setCoachOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | 'unsupported'>(() => typeof Notification === 'undefined' ? 'unsupported' : Notification.permission)
  const commandHistory = useCommandHistory()
  const clearHistory = commandHistory.clear
  const todayTasks = tasks.filter((task) => localDateKey(task.start) === todayKey)
  const managedTasks = collapseRecurringTasks(tasks, todayKey)
  const rate = completionRate(todayTasks)
  const completedHabits = habits.filter((habit) => habit.completedDates.includes(todayKey)).length
  const notify = useCallback((message: string) => { toast.success(message) }, [])
  const sendSystemNotification = useCallback((message: string) => {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
    const now = new Date()
    const dateKey = localDateKey(now)
    const storageKey = `cadentra:notifications:${dateKey}`
    const sentToday = Number(localStorage.getItem(storageKey) ?? 0)
    if (!canSendNotification(notificationRule, now, sentToday)) return
    new Notification('Cadentra', { body: message, tag: `cadentra-${dateKey}-${sentToday}` })
    localStorage.setItem(storageKey, String(sentToday + 1))
  }, [notificationRule])

  const undoLast = useCallback(async () => {
    const command = await commandHistory.undo()
    if (command) toast.info(`ย้อนกลับ · ${command.label}`)
  }, [commandHistory])

  const redoLast = useCallback(async () => {
    const command = await commandHistory.redo()
    if (command) toast.info(`ทำซ้ำ · ${command.label}`)
  }, [commandHistory])

  useEffect(() => {
    if (profile?.locale && profile.locale !== locale) setLocale(profile.locale)
  }, [locale, profile?.locale, setLocale])

  useEffect(() => {
    clearHistory()
  }, [clearHistory, session?.user.id])

  useEffect(() => {
    const handleHistoryShortcut = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.altKey || event.key.toLowerCase() !== 'z') return
      const target = event.target as HTMLElement | null
      if (target?.matches('input, textarea, select, [contenteditable="true"]')) return
      if (event.shiftKey ? !commandHistory.canRedo : !commandHistory.canUndo) return
      event.preventDefault()
      void (event.shiftKey ? redoLast() : undoLast())
    }
    window.addEventListener('keydown', handleHistoryShortcut)
    return () => window.removeEventListener('keydown', handleHistoryShortcut)
  }, [commandHistory.canRedo, commandHistory.canUndo, redoLast, undoLast])

  useEffect(() => {
    const handleAppShortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setSearchOpen(true)
      }
      if (event.key === 'Escape') {
        setSearchOpen(false)
        setNotificationsOpen(false)
      }
    }
    window.addEventListener('keydown', handleAppShortcut)
    return () => window.removeEventListener('keydown', handleAppShortcut)
  }, [])

  const applyTaskStatus = async (task: Task, status: Task['status'], pointsAmount: number, pointsReason: string, expectedUpdatedAt?: string) => {
    if (!dataGateway || !session) return false
    const result = task.sourceTaskId && task.occurrenceDate
      ? await dataGateway.setTaskOccurrenceStatus(session.user.id, task.sourceTaskId, task.occurrenceDate, status)
      : await dataGateway.setTaskStatus(session.user.id, task.id, status, expectedUpdatedAt)
    if (!result.ok) {
      if (result.error.code === 'conflict') await reload()
      toast.error(result.error.code === 'conflict' ? 'พบข้อมูลชนกัน กรุณาเลือกเวอร์ชัน' : 'บันทึกสถานะงานไม่สำเร็จ', { description: result.error.message })
      return false
    }
    const pointsResult = await dataGateway.recordPoints(session.user.id, 'task', task.sourceTaskId ?? task.id, pointsAmount, pointsReason)
    if (!pointsResult.ok) toast.warning('สถานะงานถูกบันทึก แต่คะแนนยังไม่อัปเดต')
    await reload()
    return true
  }

  const toggleTask = async (task: Task) => {
    const completing = task.status !== 'done'
    const nextStatus: Task['status'] = completing ? 'done' : 'planned'
    const pointsAmount = completing ? pointsForCompletion(task.priority) : -pointsForCompletion(task.priority)
    const changed = await applyTaskStatus(task, nextStatus, pointsAmount, completing ? 'task_completed' : 'task_reopened', task.updatedAt)
    if (!changed) return false
    commandHistory.push({
      label: completing ? `ทำ “${task.title}” สำเร็จ` : `เปิด “${task.title}” อีกครั้ง`,
      undo: () => applyTaskStatus(task, task.status, -pointsAmount, 'task_status_undone'),
      redo: () => applyTaskStatus(task, nextStatus, pointsAmount, 'task_status_redone'),
    })
    if (completing) notify(`ทำสำเร็จ · +${pointsForCompletion(task.priority)} คะแนน`)
    else toast.info('ย้ายกลับไปยังแผนแล้ว')
    return true
  }

  const applyTaskSchedule = async (taskId: string, start: string, end: string, expectedUpdatedAt?: string) => {
    if (!dataGateway || !session) return false
    const result = await dataGateway.rescheduleTask(session.user.id, taskId, start, end, expectedUpdatedAt)
    if (!result.ok) {
      if (result.error.code === 'conflict') await reload()
      toast.error(result.error.code === 'conflict' ? 'เวลางานถูกแก้ไขจากอุปกรณ์อื่นแล้ว' : 'เปลี่ยนเวลางานไม่สำเร็จ', { description: result.error.message })
      return false
    }
    await reload()
    return true
  }

  const rescheduleTask = async (task: Task, start: string, end: string) => {
    if (!await applyTaskSchedule(task.id, start, end, task.updatedAt)) return
    commandHistory.push({
      label: `เปลี่ยนเวลา “${task.title}”`,
      undo: () => applyTaskSchedule(task.id, task.start, task.end),
      redo: () => applyTaskSchedule(task.id, start, end),
    })
    toast.success('บันทึกเวลาใหม่แล้ว', { description: `${formatTime(start)}–${formatTime(end)}` })
  }

  const setHabitValue = async (habit: Habit, value: number | null, localDate = todayKey) => {
    if (!dataGateway || !session) return
    const wasComplete = habit.completedDates.includes(localDate)
    const complete = value !== null && value >= habit.target
    const result = await dataGateway.setHabitCheckIn(session.user.id, habit.id, localDate, value)
    if (!result.ok) return toast.error('บันทึกนิสัยไม่สำเร็จ', { description: result.error.message })
    if (complete !== wasComplete) {
      const pointsResult = await dataGateway.recordPoints(session.user.id, 'habit', habit.id, complete ? 8 : -8, complete ? 'habit_checked_in' : 'habit_checkin_removed')
      if (!pointsResult.ok) toast.warning('เช็กอินถูกบันทึก แต่คะแนนยังไม่อัปเดต')
    }
    await reload()
    if (complete && !wasComplete) notify('รักษาจังหวะได้อีกหนึ่งวัน · +8 คะแนน')
    else if (!complete && wasComplete) toast.info('ไม่เป็นไร เริ่มใหม่ได้เสมอ')
    else toast.success('บันทึกความคืบหน้าแล้ว')
  }

  const toggleHabit = (habit: Habit) => setHabitValue(habit, habit.completedDates.includes(todayKey) ? null : habit.target)

  const addTask = async (title: string, time: string, duration: number, goalId?: string, recurrenceRule?: string) => {
    if (!dataGateway || !session) return
    const [hour, minute] = time.split(':').map(Number)
    const start = new Date(); start.setHours(hour, minute, 0, 0)
    const end = new Date(start.getTime() + duration * 60000)
    const result = await dataGateway.createTask(session.user.id, { title, start: start.toISOString(), end: end.toISOString(), goalId, recurrenceRule })
    if (!result.ok) return toast.error('เพิ่มงานไม่สำเร็จ', { description: result.error.message })
    await reload()
    setAddOpen(false)
    const taskId = result.value
    const createCommand = {
      label: `เพิ่มงาน “${title}”`,
      undo: async () => {
        const deleteResult = await dataGateway.softDeleteTask(session.user.id, taskId)
        if (!deleteResult.ok) { toast.error('ย้อนการเพิ่มงานไม่สำเร็จ', { description: deleteResult.error.message }); return false }
        await reload(); return true
      },
      redo: async () => {
        const restoreResult = await dataGateway.restoreTask(session.user.id, taskId)
        if (!restoreResult.ok) { toast.error('คืนงานที่เพิ่มไม่สำเร็จ', { description: restoreResult.error.message }); return false }
        await reload(); return true
      },
    }
    commandHistory.push(createCommand)
    toast.success('เพิ่มลงในวันนี้แล้ว', { action: { label: 'เลิกทำ', onClick: () => void commandHistory.undo(createCommand) } })
  }

  const createGoal = async (title: string, description: string, targetDate?: string) => {
    if (!dataGateway || !session) return
    const result = await dataGateway.createGoal(session.user.id, { title, description, targetDate })
    if (!result.ok) return void toast.error('สร้างเป้าหมายไม่สำเร็จ', { description: result.error.message })
    await reload()
    const goalId = result.value
    const createCommand = {
      label: `สร้างเป้าหมาย “${title}”`,
      undo: async () => {
        const deleteResult = await dataGateway.softDeleteGoal(session.user.id, goalId)
        if (!deleteResult.ok) { toast.error('ย้อนการสร้างเป้าหมายไม่สำเร็จ', { description: deleteResult.error.message }); return false }
        await reload(); return true
      },
      redo: async () => {
        const restoreResult = await dataGateway.restoreGoal(session.user.id, goalId)
        if (!restoreResult.ok) { toast.error('คืนเป้าหมายไม่สำเร็จ', { description: restoreResult.error.message }); return false }
        await reload(); return true
      },
    }
    commandHistory.push(createCommand)
    toast.success('สร้างเป้าหมายแล้ว', { action: { label: 'เลิกทำ', onClick: () => void commandHistory.undo(createCommand) } })
  }

  const applyGoalStatus = async (goalId: string, status: Goal['status']) => {
    if (!dataGateway || !session) return false
    const result = await dataGateway.setGoalStatus(session.user.id, goalId, status)
    if (!result.ok) {
      toast.error('อัปเดตเป้าหมายไม่สำเร็จ', { description: result.error.message })
      return false
    }
    await reload()
    return true
  }

  const toggleGoal = async (goal: Goal) => {
    const nextStatus: Goal['status'] = goal.status === 'done' ? 'planned' : 'done'
    if (!await applyGoalStatus(goal.id, nextStatus)) return
    commandHistory.push({
      label: `เปลี่ยนสถานะเป้าหมาย “${goal.title}”`,
      undo: () => applyGoalStatus(goal.id, goal.status),
      redo: () => applyGoalStatus(goal.id, nextStatus),
    })
  }

  const deleteGoal = async (goal: Goal) => {
    if (!dataGateway || !session) return
    const result = await dataGateway.softDeleteGoal(session.user.id, goal.id)
    if (!result.ok) return void toast.error('ลบเป้าหมายไม่สำเร็จ', { description: result.error.message })
    await reload()
    const deleteCommand = {
      label: `ลบเป้าหมาย “${goal.title}”`,
      undo: async () => {
        const restoreResult = await dataGateway.restoreGoal(session.user.id, goal.id)
        if (!restoreResult.ok) { toast.error('กู้คืนเป้าหมายไม่สำเร็จ', { description: restoreResult.error.message }); return false }
        await reload(); return true
      },
      redo: async () => {
        const deleteResult = await dataGateway.softDeleteGoal(session.user.id, goal.id)
        if (!deleteResult.ok) { toast.error('ลบเป้าหมายไม่สำเร็จ', { description: deleteResult.error.message }); return false }
        await reload(); return true
      },
    }
    commandHistory.push(deleteCommand)
    toast.success('ลบเป้าหมายแล้ว', { action: { label: 'เลิกทำ', onClick: () => void commandHistory.undo(deleteCommand) } })
  }

  const createMilestone = async (goalId: string, title: string, targetDate: string | undefined, sortOrder: number) => {
    if (!dataGateway || !session) return
    const result = await dataGateway.createMilestone(session.user.id, { goalId, title, targetDate, sortOrder })
    if (!result.ok) return void toast.error('เพิ่ม Milestone ไม่สำเร็จ', { description: result.error.message })
    await reload()
    const milestoneId = result.value
    const createCommand = {
      label: `เพิ่ม Milestone “${title}”`,
      undo: async () => {
        const deleteResult = await dataGateway.softDeleteMilestone(session.user.id, milestoneId)
        if (!deleteResult.ok) { toast.error('ย้อนการเพิ่ม Milestone ไม่สำเร็จ', { description: deleteResult.error.message }); return false }
        await reload(); return true
      },
      redo: async () => {
        const restoreResult = await dataGateway.restoreMilestone(session.user.id, milestoneId)
        if (!restoreResult.ok) { toast.error('คืน Milestone ไม่สำเร็จ', { description: restoreResult.error.message }); return false }
        await reload(); return true
      },
    }
    commandHistory.push(createCommand)
    toast.success('เพิ่ม Milestone แล้ว', { action: { label: 'เลิกทำ', onClick: () => void commandHistory.undo(createCommand) } })
  }

  const applyMilestoneStatus = async (milestoneId: string, status: Milestone['status']) => {
    if (!dataGateway || !session) return false
    const result = await dataGateway.setMilestoneStatus(session.user.id, milestoneId, status)
    if (!result.ok) {
      toast.error('อัปเดต Milestone ไม่สำเร็จ', { description: result.error.message })
      return false
    }
    await reload()
    return true
  }

  const toggleMilestone = async (milestone: Milestone) => {
    const nextStatus: Milestone['status'] = milestone.status === 'done' ? 'planned' : 'done'
    if (!await applyMilestoneStatus(milestone.id, nextStatus)) return
    commandHistory.push({
      label: `เปลี่ยนสถานะ Milestone “${milestone.title}”`,
      undo: () => applyMilestoneStatus(milestone.id, milestone.status),
      redo: () => applyMilestoneStatus(milestone.id, nextStatus),
    })
  }

  const deleteMilestone = async (milestone: Milestone) => {
    if (!dataGateway || !session) return
    const result = await dataGateway.softDeleteMilestone(session.user.id, milestone.id)
    if (!result.ok) return void toast.error('ลบ Milestone ไม่สำเร็จ', { description: result.error.message })
    await reload()
    const deleteCommand = {
      label: `ลบ Milestone “${milestone.title}”`,
      undo: async () => {
        const restoreResult = await dataGateway.restoreMilestone(session.user.id, milestone.id)
        if (!restoreResult.ok) { toast.error('กู้คืน Milestone ไม่สำเร็จ', { description: restoreResult.error.message }); return false }
        await reload(); return true
      },
      redo: async () => {
        const deleteResult = await dataGateway.softDeleteMilestone(session.user.id, milestone.id)
        if (!deleteResult.ok) { toast.error('ลบ Milestone ไม่สำเร็จ', { description: deleteResult.error.message }); return false }
        await reload(); return true
      },
    }
    commandHistory.push(deleteCommand)
    toast.success('ลบ Milestone แล้ว', { action: { label: 'เลิกทำ', onClick: () => void commandHistory.undo(deleteCommand) } })
  }

  const useHabitFreeze = async (habit: Habit, localDate: string) => {
    if (!dataGateway || !session) return
    const result = await dataGateway.useHabitFreeze(session.user.id, habit.id, localDate)
    if (!result.ok) return void toast.error('ใช้ Streak Freeze ไม่สำเร็จ', { description: result.error.message })
    await reload()
    toast.success('ปกป้อง streak ของวันนี้แล้ว', { description: `เหลือ ${Math.max(0, habit.freezeBalance - 1)} ครั้ง` })
  }

  const addHabit = async (title: string, cue: string, target: number, unit: string, type: HabitType, recurrenceRule: string) => {
    if (!dataGateway || !session) return
    const result = await dataGateway.createHabit(session.user.id, { title, cue, target, unit, type, recurrenceRule })
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
    const deleteCommand = {
      label: `ลบงาน “${task.title}”`,
      undo: async () => {
        const restoreResult = await dataGateway.restoreTask(session.user.id, taskId)
        if (!restoreResult.ok) { toast.error('กู้คืนงานไม่สำเร็จ', { description: restoreResult.error.message }); return false }
        await reload(); return true
      },
      redo: async () => {
        const deleteResult = await dataGateway.softDeleteTask(session.user.id, taskId)
        if (!deleteResult.ok) { toast.error('ลบงานไม่สำเร็จ', { description: deleteResult.error.message }); return false }
        await reload(); return true
      },
    }
    commandHistory.push(deleteCommand)
    toast.success('ลบงานแล้ว', {
      description: task.title,
      action: { label: 'เลิกทำ', onClick: () => void commandHistory.undo(deleteCommand) },
    })
  }, [commandHistory, dataGateway, reload, session])

  const recordFocus = async (input: RecordFocusSessionInput) => {
    if (!dataGateway || !session) return
    const result = await dataGateway.recordFocusSession(session.user.id, input)
    if (!result.ok) return toast.error('บันทึกเวลาโฟกัสไม่สำเร็จ', { description: result.error.message })
    await reload()
    if (notificationRule && input.elapsedSeconds >= notificationRule.focusBreakMinutes * 60) sendSystemNotification(`คุณโฟกัสครบ ${Math.floor(input.elapsedSeconds / 60)} นาทีแล้ว ถึงเวลาพักสายตา`)
  }

  const saveNotificationRule = async (input: Parameters<UserDataGateway['saveNotificationRule']>[1]) => {
    if (!dataGateway || !session) return false
    const result = await dataGateway.saveNotificationRule(session.user.id, input)
    if (!result.ok) { toast.error('บันทึกการแจ้งเตือนไม่สำเร็จ', { description: result.error.message }); return false }
    await reload(); return true
  }

  const requestNotificationPermission = async () => {
    if (!dataGateway || !session) return
    try {
      const device = await registerPushDevice(environment.vapidPublicKey)
      const result = await dataGateway.registerDevice(session.user.id, device)
      if (!result.ok) throw new Error(result.error.message)
      setNotificationPermission('granted')
      toast.success(device.platform === 'android' ? 'ลงทะเบียน Android Push แล้ว' : 'ลงทะเบียน Web Push แล้ว')
    } catch (error) {
      if (typeof Notification === 'undefined') setNotificationPermission('unsupported')
      toast.error('เปิด Push Notification ไม่สำเร็จ', { description: error instanceof Error ? error.message : 'Unknown error' })
    }
  }

  const sendTestNotification = async () => {
    if (!dataGateway || !session) return
    const result = await dataGateway.sendTestNotification(session.user.id)
    if (!result.ok) return void toast.error('ส่งการแจ้งเตือนทดสอบไม่สำเร็จ', { description: result.error.message })
    toast.success('ส่งการแจ้งเตือนทดสอบแล้ว')
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

  const exportActivityCsv = () => {
    const url = URL.createObjectURL(new Blob([buildActivityCsv(managedTasks, habits, reflections)], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `cadentra-activity-${todayKey}.csv`
    link.click()
    URL.revokeObjectURL(url)
    toast.success('เตรียมไฟล์ CSV แล้ว')
  }

  const exportReviewPdf = () => {
    const report = window.open('', '_blank')
    if (!report) return void toast.error('เบราว์เซอร์บล็อกหน้ารายงาน กรุณาอนุญาต popup')
    report.opener = null
    report.document.write(buildReviewReportHtml(managedTasks, habits, reflections, points, focusMinutes))
    report.document.close()
  }

  const saveReflection = async (input: SaveReflectionInput) => {
    if (!dataGateway || !session) return false
    const result = await dataGateway.saveReflection(session.user.id, input)
    if (!result.ok) {
      toast.error('บันทึกการทบทวนไม่สำเร็จ', { description: result.error.message })
      return false
    }
    await reload()
    toast.success(input.period === 'daily' ? 'บันทึก Daily Reflection แล้ว' : 'บันทึก Weekly Review แล้ว')
    return true
  }

  const createReward = async (title: string, pointCost: number) => {
    if (!dataGateway || !session) return false
    const result = await dataGateway.createReward(session.user.id, title, pointCost)
    if (!result.ok) { toast.error('เพิ่มรางวัลไม่สำเร็จ', { description: result.error.message }); return false }
    await reload(); toast.success('เพิ่มรางวัลส่วนตัวแล้ว'); return true
  }

  const redeemReward = async (reward: PersonalReward) => {
    if (!dataGateway || !session) return false
    const result = await dataGateway.redeemReward(session.user.id, reward.id)
    if (!result.ok) { toast.error('แลกรางวัลไม่สำเร็จ', { description: result.error.message }); return false }
    await reload(); toast.success(`แลกรางวัล “${reward.title}” แล้ว`); return true
  }

  const connectGoogleCalendar = async () => {
    if (!dataGateway || !session) return
    const result = await dataGateway.startGoogleCalendar(session.user.id)
    if (!result.ok) return void toast.error('เริ่มเชื่อมต่อ Google Calendar ไม่สำเร็จ', { description: result.error.message })
    window.location.assign(result.value)
  }

  const syncGoogleCalendar = async () => {
    if (!dataGateway || !session) return
    const result = await dataGateway.syncGoogleCalendar(session.user.id)
    if (!result.ok) return void toast.error('ซิงก์ Google Calendar ไม่สำเร็จ', { description: result.error.message })
    await reload()
    toast.success('ซิงก์ Google Calendar แล้ว')
  }

  const disconnectGoogleCalendar = async () => {
    if (!dataGateway || !session) return
    const result = await dataGateway.disconnectGoogleCalendar(session.user.id)
    if (!result.ok) return void toast.error('ยกเลิกการเชื่อมต่อไม่สำเร็จ', { description: result.error.message })
    await reload()
    toast.success('ยกเลิก Google Calendar แล้ว')
  }

  const requestAIProposal = async (instruction: string, includeHealth: boolean) => {
    if (!dataGateway || !session) return false
    const result = await dataGateway.requestAIProposal(session.user.id, instruction, includeHealth)
    if (!result.ok) { toast.error('สร้างข้อเสนอไม่สำเร็จ', { description: result.error.message }); return false }
    await reload(); return true
  }

  const applyAIProposal = async (proposal: AIProposal, changeIds: string[]) => {
    if (!dataGateway || !session) return false
    const result = await dataGateway.applyAIProposal(session.user.id, proposal.id, changeIds)
    if (!result.ok) { toast.error('ใช้ข้อเสนอไม่สำเร็จ', { description: result.error.message }); return false }
    await reload(); toast.success('ยืนยันและบันทึกตารางใหม่แล้ว'); return true
  }

  const rejectAIProposal = async (proposal: AIProposal) => {
    if (!dataGateway || !session) return false
    const result = await dataGateway.rejectAIProposal(session.user.id, proposal.id)
    if (!result.ok) { toast.error('ปฏิเสธข้อเสนอไม่สำเร็จ', { description: result.error.message }); return false }
    await reload(); return true
  }

  const undoAIProposal = async (proposal: AIProposal) => {
    if (!dataGateway || !session) return false
    const result = await dataGateway.undoAIProposal(session.user.id, proposal.id)
    if (!result.ok) { toast.error('Undo ข้อเสนอไม่สำเร็จ', { description: result.error.message }); return false }
    await reload(); toast.success('คืนตารางก่อนใช้ข้อเสนอแล้ว'); return true
  }

  const syncHealthConnect = async () => {
    if (!dataGateway || !session) return
    try {
      const aggregate = await readHealthConnectDay(todayKey, profile?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone)
      const result = await dataGateway.saveHealthAggregate(session.user.id, aggregate)
      if (!result.ok) throw new Error(result.error.message)
      await reload(); toast.success('ซิงก์ยอดรวม Health Connect แล้ว')
    } catch (error) { toast.error('ซิงก์ Health Connect ไม่สำเร็จ', { description: error instanceof Error ? error.message : 'Unknown error' }) }
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
      <a className="skip-link" href="#main-content">ข้ามไปยังเนื้อหาหลัก</a>
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
          {profile?.gamificationEnabled !== false && <button className={view === 'insights' ? 'nav-item active' : 'nav-item'} onClick={() => { navigate(viewPaths.insights); setMenuOpen(false) }}><Trophy size={18}/><span>เลเวล {level}</span><em>{points} XP</em></button>}
          <button className={view === 'settings' ? 'nav-item active' : 'nav-item'} onClick={() => navigate(viewPaths.settings)}><Settings size={18}/><span>{t('nav.settings')}</span></button>
          <div className="profile"><div className="avatar">{displayName.slice(0, 1).toUpperCase()}</div><div><strong>{displayName}</strong><small>{accountEmail}</small></div><button type="button" className="grid size-8 place-items-center rounded-lg text-muted hover:bg-[#e3e2da] hover:text-ink" onClick={() => void handleSignOut()} aria-label="ออกจากระบบ"><LogOut size={16}/></button></div>
        </div>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <button className="icon-button mobile-menu" onClick={() => setMenuOpen(!menuOpen)} aria-label="เปิดเมนู"><Menu/></button>
          <button type="button" className="search" onClick={() => setSearchOpen(true)} aria-label="ค้นหาและไปยังหน้าต่าง ๆ"><Search size={16}/><span>{t('top.search')}</span><kbd>Ctrl K</kbd></button>
          <div className="top-actions">
            <div className="flex items-center" role="group" aria-label="ประวัติการเปลี่ยนแปลง">
              <button className="icon-button disabled:cursor-not-allowed disabled:opacity-30" disabled={!commandHistory.canUndo || commandHistory.busy} onClick={() => void undoLast()} aria-label={commandHistory.undoLabel ? `ย้อนกลับ: ${commandHistory.undoLabel}` : 'ไม่มีรายการให้ย้อนกลับ'} title={commandHistory.undoLabel ? `ย้อนกลับ: ${commandHistory.undoLabel}` : 'ไม่มีรายการให้ย้อนกลับ'}><Undo2 size={17}/></button>
              <button className="icon-button disabled:cursor-not-allowed disabled:opacity-30" disabled={!commandHistory.canRedo || commandHistory.busy} onClick={() => void redoLast()} aria-label={commandHistory.redoLabel ? `ทำซ้ำ: ${commandHistory.redoLabel}` : 'ไม่มีรายการให้ทำซ้ำ'} title={commandHistory.redoLabel ? `ทำซ้ำ: ${commandHistory.redoLabel}` : 'ไม่มีรายการให้ทำซ้ำ'}><Redo2 size={17}/></button>
            </div>
            <button className="language-button" onClick={() => setLocale(locale === 'th' ? 'en' : 'th')} aria-label={t('action.language')}><Languages size={16}/>{locale.toUpperCase()}</button>
            <button className="icon-button" aria-label={t('top.notifications')} aria-expanded={notificationsOpen} onClick={() => setNotificationsOpen((open) => !open)}><Bell size={19}/>{(pendingCount > 0 || syncIssues.length > 0 || notificationPermission !== 'granted') && <i/>}</button>
            <button className="primary compact" onClick={() => setAddOpen(true)}><Plus size={17}/> {t('action.add')}</button>
          </div>
        </header>

        <section className="content" id="main-content" tabIndex={-1}>
          {syncIssues[0] && <SyncConflictBanner issue={syncIssues[0]} onResolve={resolveSyncIssue}/>}
          {loading ? <DataLoading/> : error ? <DataLoadError message={error} onRetry={() => void reload()}/> : <Suspense fallback={<DataLoading/>}><Routes>
            <Route path="/" element={<Navigate to={viewPaths.today} replace/>}/>
            <Route path={viewPaths.today} element={<TodayView tasks={todayTasks} habits={habits} rate={rate} completedHabits={completedHabits} focusMinutes={focusMinutes} displayName={displayName} onTask={toggleTask} onHabit={toggleHabit} onCoach={() => setCoachOpen(true)} onOpenCalendar={() => navigate(viewPaths.calendar)} onStartFocus={() => navigate(viewPaths.focus)} />}/>
            <Route path={viewPaths.calendar} element={<CalendarView tasks={tasks} externalEvents={externalCalendarEvents} onTask={toggleTask} onReschedule={rescheduleTask}/>}/>
            <Route path={viewPaths.tasks} element={<TasksView tasks={tasks} onTask={toggleTask} onDelete={deleteTask} onAdd={() => setAddOpen(true)}/>}/>
            <Route path={viewPaths.goals} element={<GoalsView goals={goals} milestones={milestones} tasks={managedTasks} onCreateGoal={createGoal} onToggleGoal={toggleGoal} onDeleteGoal={deleteGoal} onCreateMilestone={createMilestone} onToggleMilestone={toggleMilestone} onDeleteMilestone={deleteMilestone}/>}/>
            <Route path={viewPaths.habits} element={<HabitsView habits={habits} onHabitValue={setHabitValue} onFreeze={useHabitFreeze} onAdd={() => setHabitAddOpen(true)}/>}/>
            <Route path={viewPaths.focus} element={<FocusView tasks={managedTasks} sessions={focusSessions} notify={notify} onComplete={recordFocus}/>}/>
            <Route path={viewPaths.insights} element={<InsightsView tasks={managedTasks} habits={habits} reflections={reflections} rewards={rewards} points={points} focusMinutes={focusMinutes} onSaveReflection={saveReflection} onExportCsv={exportActivityCsv} onExportPdf={exportReviewPdf} onCreateReward={createReward} onRedeemReward={redeemReward}/>}/>
            <Route path={viewPaths.settings} element={<SettingsView profile={profile} email={accountEmail} notificationRule={notificationRule} notificationPermission={notificationPermission} healthAggregates={healthAggregates} onSyncHealthConnect={syncHealthConnect} calendarConnection={calendarConnection} onConnectGoogleCalendar={connectGoogleCalendar} onSyncGoogleCalendar={syncGoogleCalendar} onDisconnectGoogleCalendar={disconnectGoogleCalendar} onSave={saveProfile} onSaveNotificationRule={saveNotificationRule} onRequestNotificationPermission={requestNotificationPermission} onSendTestNotification={sendTestNotification} onExport={exportAccount} onDelete={deleteAccount}/>}/>
            <Route path="*" element={<Navigate to={viewPaths.today} replace/>}/>
          </Routes></Suspense>}
        </section>
      </main>

      {menuOpen && <button className="scrim" onClick={() => setMenuOpen(false)} aria-label="ปิดเมนู"/>}
      {addOpen && <AddTaskModal goals={goals} tasks={tasks} onClose={() => setAddOpen(false)} onAdd={addTask}/>}
      {habitAddOpen && <AddHabitModal onClose={() => setHabitAddOpen(false)} onAdd={addHabit}/>}
      {coachOpen && <CoachDialog tasks={managedTasks} proposals={aiProposals} healthConsent={profile?.healthAiConsent === true} onClose={() => setCoachOpen(false)} onGenerate={requestAIProposal} onApply={applyAIProposal} onReject={rejectAIProposal} onUndo={undoAIProposal}/>}
      {searchOpen && <CommandPalette
        onClose={() => setSearchOpen(false)}
        onNavigate={(path) => { navigate(path); setSearchOpen(false); setMenuOpen(false) }}
        onAdd={() => { setSearchOpen(false); setAddOpen(true) }}
        onCoach={() => { setSearchOpen(false); setCoachOpen(true) }}
      />}
      {notificationsOpen && <NotificationCenter
        permission={notificationPermission}
        pendingCount={pendingCount}
        conflictCount={syncIssues.length}
        nextTask={todayTasks.find((task) => task.status !== 'done')}
        onClose={() => setNotificationsOpen(false)}
        onSettings={() => { navigate(viewPaths.settings); setNotificationsOpen(false) }}
      />}
      <AppToaster/>
    </div>
  )
}

function CommandPalette({ onClose, onNavigate, onAdd, onCoach }: { onClose: () => void; onNavigate: (path: string) => void; onAdd: () => void; onCoach: () => void }) {
  const [query, setQuery] = useState('')
  const labels: Record<View, string> = { today: 'วันนี้', calendar: 'ปฏิทิน', tasks: 'งาน', goals: 'เป้าหมาย', habits: 'นิสัย', focus: 'โฟกัส', insights: 'ข้อมูลเชิงลึก', settings: 'ตั้งค่า' }
  const commands = [
    ...navItems.map((item) => ({ label: labels[item.id], run: () => onNavigate(viewPaths[item.id]) })),
    { label: 'ตั้งค่า', run: () => onNavigate(viewPaths.settings) },
    { label: 'เพิ่มงานใหม่', run: onAdd },
    { label: 'เปิด AI Coach', run: onCoach },
  ]
  const visible = commands.filter((command) => command.label.toLocaleLowerCase('th').includes(query.trim().toLocaleLowerCase('th')))
  return <div className="modal-backdrop" onMouseDown={onClose}><section className="command-palette" role="dialog" aria-modal="true" aria-label="ค้นหาและคำสั่ง" onMouseDown={(event) => event.stopPropagation()}><div className="command-search"><Search size={18}/><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ค้นหาหน้าหรือคำสั่ง…" aria-label="ค้นหาหน้าหรือคำสั่ง"/><button type="button" className="icon-button" onClick={onClose} aria-label="ปิด"><X size={18}/></button></div><div className="command-list">{visible.map((command) => <button type="button" key={command.label} onClick={command.run}><span>{command.label}</span><em>เปิด</em></button>)}{!visible.length && <p>ไม่พบหน้าหรือคำสั่งที่ค้นหา</p>}</div></section></div>
}

function NotificationCenter({ permission, pendingCount, conflictCount, nextTask, onClose, onSettings }: { permission: NotificationPermission | 'unsupported'; pendingCount: number; conflictCount: number; nextTask?: Task; onClose: () => void; onSettings: () => void }) {
  return <><button className="popover-scrim" onClick={onClose} aria-label="ปิดการแจ้งเตือน"/><aside className="notification-center" role="dialog" aria-modal="true" aria-label="ศูนย์การแจ้งเตือน"><div className="notification-head"><div><p className="eyebrow">สถานะล่าสุด</p><h2>การแจ้งเตือน</h2></div><button type="button" className="icon-button" onClick={onClose} aria-label="ปิด"><X size={18}/></button></div><div className="notification-list">{permission !== 'granted' && <button type="button" onClick={onSettings}><Bell size={17}/><span><strong>ยังไม่ได้เปิด Push Notification</strong><small>ไปที่ตั้งค่าเพื่ออนุญาตการแจ้งเตือนบนอุปกรณ์นี้</small></span></button>}{conflictCount > 0 && <div><AlertTriangle size={17}/><span><strong>มีข้อมูลชนกัน {conflictCount} รายการ</strong><small>เลือกเวอร์ชันที่ต้องการจากแถบแจ้งเตือนบนหน้า</small></span></div>}{pendingCount > 0 && <div><CloudOff size={17}/><span><strong>รอซิงก์ {pendingCount} รายการ</strong><small>ระบบจะส่งข้อมูลเมื่อกลับมาออนไลน์</small></span></div>}{nextTask && <div><CalendarDays size={17}/><span><strong>งานถัดไป · {nextTask.title}</strong><small>{formatTime(nextTask.start)}–{formatTime(nextTask.end)}</small></span></div>}{permission === 'granted' && pendingCount === 0 && conflictCount === 0 && !nextTask && <p>ไม่มีรายการที่ต้องจัดการในตอนนี้</p>}</div><button type="button" className="secondary w-full" onClick={onSettings}>ตั้งค่าการแจ้งเตือน</button></aside></>
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

function AddHabitModal({ onClose, onAdd }: { onClose: () => void; onAdd: (title: string, cue: string, target: number, unit: string, type: HabitType, recurrenceRule: string) => void }) {
  const [title, setTitle] = useState('')
  const [cue, setCue] = useState('')
  const [type, setType] = useState<HabitType>('boolean')
  const [target, setTarget] = useState(1)
  const [unit, setUnit] = useState('ครั้ง')
  const [recurrenceRule, setRecurrenceRule] = useState('FREQ=DAILY')
  const selectType = (nextType: HabitType) => {
    setType(nextType)
    if (nextType === 'boolean') { setTarget(1); setUnit('ครั้ง') }
    if (nextType === 'count') { setTarget(Math.max(target, 1)); setUnit('ครั้ง') }
    if (nextType === 'duration') { setTarget(Math.max(target, 10)); setUnit('นาที') }
  }
  return <div className="modal-backdrop" onMouseDown={onClose}><form className="modal" onMouseDown={(event) => event.stopPropagation()} onSubmit={(event) => { event.preventDefault(); if (title.trim() && target > 0) onAdd(title.trim(), cue.trim(), target, unit.trim() || 'ครั้ง', type, recurrenceRule) }}><div className="modal-head"><div><p className="eyebrow">สร้างจังหวะใหม่</p><h2>เพิ่มนิสัย</h2></div><button type="button" className="icon-button" onClick={onClose} aria-label="ปิด"><X/></button></div><label>ชื่อนิสัย<input autoFocus value={title} onChange={(event) => setTitle(event.target.value)} placeholder="เช่น อ่านหนังสือ"/></label><label>ทำหลังจากอะไร<input value={cue} onChange={(event) => setCue(event.target.value)} placeholder="เช่น หลังอาหารเช้า"/></label><div className="form-grid"><label>วิธีบันทึก<select value={type} onChange={(event) => selectType(event.target.value as HabitType)}><option value="boolean">ทำ / ไม่ทำ</option><option value="count">นับจำนวนครั้ง</option><option value="duration">จับระยะเวลา</option><option value="number">บันทึกตัวเลข</option></select></label><label>วันที่ต้องทำ<select value={recurrenceRule} onChange={(event) => setRecurrenceRule(event.target.value)}><option value="FREQ=DAILY">ทุกวัน</option><option value="FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR">จันทร์–ศุกร์</option><option value="FREQ=WEEKLY;BYDAY=SA,SU">เสาร์–อาทิตย์</option></select></label></div>{type !== 'boolean' && <div className="form-grid"><label>เป้าหมายต่อวัน<input type="number" min="0.01" step="any" value={target} onChange={(event) => setTarget(Number(event.target.value))}/></label><label>หน่วย<input value={unit} onChange={(event) => setUnit(event.target.value)} placeholder="ครั้ง / นาที / แก้ว"/></label></div>}<div className="modal-actions"><button type="button" className="secondary" onClick={onClose}>ยกเลิก</button><button className="primary" disabled={!title.trim() || target <= 0}>เพิ่มนิสัย</button></div></form></div>
}

export default App
