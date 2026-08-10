export const viewPaths = {
  today: '/today',
  calendar: '/calendar',
  tasks: '/tasks',
  goals: '/goals',
  habits: '/habits',
  focus: '/focus',
  insights: '/insights',
  settings: '/settings',
} as const

export type View = keyof typeof viewPaths

export function pathToView(pathname: string): View | undefined {
  return (Object.entries(viewPaths).find(([, path]) => path === pathname)?.[0]) as View | undefined
}
