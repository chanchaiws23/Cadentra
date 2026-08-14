import type { Habit, Reflection, Task } from '@cadentra/domain'

const escapeHtml = (value: string) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')

export function buildReviewReportHtml(tasks: readonly Task[], habits: readonly Habit[], reflections: readonly Reflection[], points: number, focusMinutes: number) {
  const done = tasks.filter((task) => task.status === 'done').length
  const latest = reflections[0]
  return `<!doctype html><html lang="th"><head><meta charset="utf-8"><title>Cadentra Review</title><style>body{font-family:system-ui,sans-serif;color:#20231f;margin:48px;line-height:1.6}h1{font-size:32px}dl{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;border-block:1px solid #ddd;padding:24px 0}dt{font-size:12px;color:#6d746e}dd{font-size:24px;margin:4px 0}section{margin-top:32px}p{white-space:pre-wrap}@media print{button{display:none}}</style></head><body><h1>Cadentra · Weekly Review</h1><p>${new Date().toLocaleDateString('th-TH', { dateStyle: 'long' })}</p><dl><div><dt>งานสำเร็จ</dt><dd>${done}/${tasks.length}</dd></div><div><dt>นิสัย</dt><dd>${habits.length}</dd></div><div><dt>เวลาโฟกัส</dt><dd>${focusMinutes} นาที</dd></div><div><dt>คะแนน</dt><dd>${points}</dd></div></dl><section><h2>บันทึกล่าสุด</h2><h3>สิ่งที่ทำได้ดี</h3><p>${escapeHtml(latest?.wins ?? 'ยังไม่มีบันทึก')}</p><h3>อุปสรรค</h3><p>${escapeHtml(latest?.blockers ?? '—')}</p><h3>ก้าวถัดไป</h3><p>${escapeHtml(latest?.nextStep ?? '—')}</p></section><button onclick="window.print()">พิมพ์ / บันทึกเป็น PDF</button></body></html>`
}
