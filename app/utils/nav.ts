export interface NavItem {
  to: string
  label: string
  icon: string
  /** true — активен и для вложенных путей (/teams/sokol-1) */
  prefix?: boolean
}

/**
 * Нижняя панель на телефоне — ровно 4 пункта.
 * Пять не влезают: подписи пришлось бы ужать до 10px, а капс по-русски на
 * вытянутой руке в полутёмном зале при 10px — это декорация, а не подпись.
 * Игроки и поиск живут внутри разделов.
 */
export const PRIMARY_NAV: NavItem[] = [
  { to: '/', label: 'Главная', icon: 'home' },
  { to: '/competitions', label: 'Турниры', icon: 'trophy', prefix: true },
  { to: '/games', label: 'Матчи', icon: 'calendar', prefix: true },
  { to: '/teams', label: 'Команды', icon: 'shield', prefix: true },
]

/** На десктопе места хватает и на игроков. */
export const DESKTOP_NAV: NavItem[] = [
  ...PRIMARY_NAV,
  { to: '/players', label: 'Игроки', icon: 'users', prefix: true },
]

export function isNavActive(item: NavItem, path: string): boolean {
  if (item.to === '/') return path === '/'
  return item.prefix ? path === item.to || path.startsWith(`${item.to}/`) : path === item.to
}
