export const messages = {
  th: {
    'nav.today': 'วันนี้', 'nav.calendar': 'ปฏิทิน', 'nav.tasks': 'งาน', 'nav.goals': 'เป้าหมาย', 'nav.habits': 'นิสัย',
    'nav.focus': 'โฟกัส', 'nav.insights': 'ข้อมูลเชิงลึก', 'nav.settings': 'ตั้งค่า',
    'top.search': 'ค้นหาหรือเพิ่มอย่างรวดเร็ว', 'top.notifications': 'การแจ้งเตือน', 'action.add': 'เพิ่ม',
    'action.coach': 'ให้ Coach ช่วยจัดวัน', 'action.schedule': 'จัดตาราง', 'action.language': 'เปลี่ยนเป็นภาษาอังกฤษ',
    'today.eyebrow': 'อังคาร · 4 สิงหาคม', 'today.title': 'สวัสดีตอนบ่าย, ชัย',
    'today.detail': 'เหลืองานสำคัญอีก 2 ช่วง วันนี้ยังมีพื้นที่หายใจเพียงพอ',
    'today.plan': 'แผนวันนี้', 'today.tasks': 'งานสำเร็จ', 'today.habits': 'นิสัย', 'today.focusTime': 'เวลาโฟกัส',
    'today.schedule': 'ตารางวันนี้', 'today.timezone': 'เวลาท้องถิ่น · กรุงเทพฯ',
    'today.rhythm': 'จังหวะประจำวัน', 'today.completed': 'สำเร็จ', 'today.nextFocus': 'ช่วงโฟกัสถัดไป',
    'today.quote': '“วินัยที่ดีไม่ต้องสมบูรณ์แบบ แค่กลับมาให้เร็วขึ้นในแต่ละครั้ง”',
    'calendar.eyebrow': 'สัปดาห์ที่ 32', 'calendar.title': 'ปฏิทิน', 'calendar.detail': 'เห็นภาระ เวลาโฟกัส และพื้นที่ว่างในสัปดาห์เดียว',
    'tasks.eyebrow': 'พื้นที่จัดการ', 'tasks.title': 'งานทั้งหมด', 'tasks.detail': 'เก็บทุกสิ่งไว้ที่เดียว แล้วเลือกสิ่งที่สำคัญจริง ๆ',
    'habits.eyebrow': 'สร้างความสม่ำเสมอ', 'habits.title': 'นิสัยของฉัน', 'habits.detail': 'ความก้าวหน้าไม่หายไปเพราะวันที่ไม่สมบูรณ์แบบ',
    'focus.eyebrow': 'พื้นที่เงียบ', 'focus.title': 'โหมดโฟกัส', 'focus.detail': 'ทำสิ่งเดียวให้เต็มที่ แล้วพักอย่างตั้งใจ',
    'insights.eyebrow': '7 วันที่ผ่านมา', 'insights.title': 'ข้อมูลเชิงลึก', 'insights.detail': 'ดูแนวโน้มเพื่อปรับระบบ ไม่ใช่เพื่อตัดสินตัวเอง',
  },
  en: {
    'nav.today': 'Today', 'nav.calendar': 'Calendar', 'nav.tasks': 'Tasks', 'nav.goals': 'Goals', 'nav.habits': 'Habits',
    'nav.focus': 'Focus', 'nav.insights': 'Insights', 'nav.settings': 'Settings',
    'top.search': 'Search or quick add', 'top.notifications': 'Notifications', 'action.add': 'Add',
    'action.coach': 'Ask Coach to plan my day', 'action.schedule': 'Schedule', 'action.language': 'เปลี่ยนเป็นภาษาไทย',
    'today.eyebrow': 'Tuesday · 4 August', 'today.title': 'Good afternoon, Chai',
    'today.detail': 'Two important blocks remain. Your day still has enough breathing room.',
    'today.plan': 'Today’s plan', 'today.tasks': 'Tasks done', 'today.habits': 'Habits', 'today.focusTime': 'Focus time',
    'today.schedule': 'Today’s schedule', 'today.timezone': 'Local time · Bangkok',
    'today.rhythm': 'Daily rhythm', 'today.completed': 'complete', 'today.nextFocus': 'Next focus block',
    'today.quote': '“Discipline does not need perfection. Return a little sooner each time.”',
    'calendar.eyebrow': 'Week 32', 'calendar.title': 'Calendar', 'calendar.detail': 'See commitments, focus time, and open space in one week.',
    'tasks.eyebrow': 'Workspace', 'tasks.title': 'All tasks', 'tasks.detail': 'Capture everything, then choose what truly matters.',
    'habits.eyebrow': 'Build consistency', 'habits.title': 'My habits', 'habits.detail': 'One imperfect day never erases your progress.',
    'focus.eyebrow': 'Quiet space', 'focus.title': 'Focus mode', 'focus.detail': 'Give one thing your full attention, then rest deliberately.',
    'insights.eyebrow': 'Last 7 days', 'insights.title': 'Insights', 'insights.detail': 'Use trends to adjust your system, not judge yourself.',
  },
} as const

export type Locale = keyof typeof messages
export type MessageKey = keyof typeof messages.th

export function translate(locale: Locale, key: MessageKey): string {
  return messages[locale][key] ?? messages.th[key]
}
