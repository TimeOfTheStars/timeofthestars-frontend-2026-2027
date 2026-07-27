export type Theme = 'light' | 'dark'

export const THEME_KEY = 'vz-theme'

/**
 * Тема. Начальное значение ставит инлайн-скрипт в <head> ДО первой отрисовки
 * (см. nuxt.config) — иначе при SWR-кеше страницы был бы белый мигающий кадр.
 * Здесь только состояние и переключение.
 */
export function useColorTheme() {
  const theme = useState<Theme>('theme', () => 'light')

  // Синхронизируемся с тем, что уже поставил инлайн-скрипт
  onMounted(() => {
    theme.value = document.documentElement.classList.contains('dark') ? 'dark' : 'light'
  })

  function set(next: Theme) {
    theme.value = next
    if (!import.meta.client) return
    document.documentElement.classList.toggle('dark', next === 'dark')
    try {
      localStorage.setItem(THEME_KEY, next)
    }
    catch {
      // приватный режим — тема просто не запомнится
    }
  }

  function toggle() {
    set(theme.value === 'dark' ? 'light' : 'dark')
  }

  return { theme, set, toggle }
}
