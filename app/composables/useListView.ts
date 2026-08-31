import type { LocationQueryRaw } from 'vue-router'

export type ListView = 'list' | 'cards'

/**
 * Вид списка — плиткой или строками — с запоминанием выбора.
 *
 * Три источника, по убыванию старшинства:
 *   1. ?view= в адресе — явный выбор, он же уходит в ссылку и делится;
 *   2. localStorage — прошлый выбор этого посетителя;
 *   3. список по умолчанию.
 *
 * Значение из localStorage читается ТОЛЬКО в onMounted, как «моя команда»:
 * на сервере его нет, и попытка учесть его при отрисовке дала бы рассинхрон
 * при гидратации. Поэтому запомненная плитка появляется сразу после
 * гидрации — это заметный, но честный размен, иначе выбор пришлось бы
 * держать в адресе и тащить в каждую ссылку.
 */
export function useListView(key: string) {
  const route = useRoute()
  const storageKey = `vz-view-${key}`

  const stored = useState<ListView | null>(`view:${key}`, () => null)

  const view = computed<ListView>(() => {
    const fromUrl = route.query.view
    if (fromUrl === 'cards' || fromUrl === 'list') return fromUrl
    return stored.value ?? 'list'
  })

  onMounted(() => {
    try {
      const raw = localStorage.getItem(storageKey)
      if (raw === 'cards' || raw === 'list') stored.value = raw
    }
    catch {
      // приватный режим — выбор просто не запомнится
    }
  })

  /**
   * Явный выбор в адресе запоминаем: в следующий раз откроется он же.
   *
   * Только на клиенте. С immediate: true наблюдатель срабатывает и при
   * серверной отрисовке, а в Node 24 есть экспериментальный глобальный
   * localStorage — обращение к нему на сервере ничего не ломало, но сыпало
   * предупреждением в лог на каждый запрос.
   */
  watch(
    () => route.query.view,
    (v) => {
      if (!import.meta.client) return
      if (v !== 'cards' && v !== 'list') return
      stored.value = v
      try {
        localStorage.setItem(storageKey, v)
      }
      catch {
        // приватный режим — выбор просто не запомнится
      }
    },
    { immediate: true },
  )

  /** Ссылка на другой вид. Список — состояние по умолчанию, в адрес не пишем. */
  function link(next: ListView) {
    const query: LocationQueryRaw = { ...route.query }
    if (next === 'cards') query.view = next
    else delete query.view
    return { path: route.path, query }
  }

  return { view, link }
}
