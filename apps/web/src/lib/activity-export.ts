import type { Habit, Reflection, Task } from '@cadentra/domain'

function cell(value: string | number) {
  const text = String(value).replaceAll('"', '""')
  return `"${text}"`
}

export function buildActivityCsv(tasks: readonly Task[], habits: readonly Habit[], reflections: readonly Reflection[]) {
  const rows: (string | number)[][] = [['type', 'date', 'title', 'status', 'detail']]
  tasks.forEach((task) => rows.push(['task', task.start.slice(0, 10), task.title, task.status, task.category]))
  habits.forEach((habit) => habit.checkIns.forEach((entry) => rows.push(['habit', entry.localDate, habit.title, entry.frozen ? 'frozen' : entry.value >= habit.target ? 'done' : 'partial', `${entry.value} ${habit.unit}`])))
  reflections.forEach((reflection) => rows.push(['reflection', reflection.localDate, reflection.period, 'saved', [reflection.wins, reflection.blockers, reflection.nextStep].filter(Boolean).join(' | ')]))
  return rows.map((row) => row.map(cell).join(',')).join('\r\n')
}
