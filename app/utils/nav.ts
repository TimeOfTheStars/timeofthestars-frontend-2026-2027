export interface NavItem {
  to: string
  label: string
  icon: string
  /** true — активен и для вложенных путей (/teams/sokol-1) */
  prefix?: boolean
}

/**
 * Пять пунктов, одинаково на телефоне и десктопе.
 *
 * Раньше здесь было четыре, и рядом стояло объяснение: «пять не влезают,
 * подписи пришлось бы ужать до 10px». Промер по самому шрифту проекта это не
 * подтвердил. При нынешних 11px самая широкая подпись, «Команды», занимает
 * 49.8px; с учётом внутренних отступов пункта (8px на пару) остаётся:
 *
 *   экран 360px → колонка 72px → под текст 64px → запас 14.2px
 *   экран 375px → колонка 75px → под текст 67px → запас 17.2px
 *   экран 320px → колонка 64px → под текст 56px → запас  6.2px
 *
 * То есть на обычном телефоне подписи помещаются без всякого уменьшения
 * шрифта, а узкий случай решается иначе: ниже 360px AppBottomNav скрывает
 * подписи и оставляет одни иконки. Оценка «не влезают» была сделана на глаз.
 */
export const PRIMARY_NAV: NavItem[] = [
  { to: '/', label: 'Главная', icon: 'home' },
  { to: '/competitions', label: 'Турниры', icon: 'trophy', prefix: true },
  { to: '/games', label: 'Матчи', icon: 'calendar', prefix: true },
  { to: '/teams', label: 'Команды', icon: 'shield', prefix: true },
  { to: '/players', label: 'Игроки', icon: 'users', prefix: true },
]

/**
 * Наборы совпали, но имя оставлено: на него ссылаются шапка и подвал, и
 * когда-нибудь десктопная навигация снова может разойтись с телефонной.
 */
export const DESKTOP_NAV: NavItem[] = PRIMARY_NAV

export function isNavActive(item: NavItem, path: string): boolean {
  if (item.to === '/') return path === '/'
  return item.prefix ? path === item.to || path.startsWith(`${item.to}/`) : path === item.to
}
