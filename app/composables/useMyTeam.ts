const KEY = 'vz-my-team'

/**
 * «Моя команда» — в localStorage, без бэкенда.
 *
 * Зачем: главный вопрос пользователя — «где моя команда». В таблице из
 * двадцати строк нужная может быть семнадцатой, и без закрепления ответ
 * достаётся скроллом и поиском глазами. Отмеченная команда подсвечивается
 * в таблице и выносится наверх главной.
 *
 * Значение читается только на клиенте: на сервере localStorage нет, поэтому
 * до монтирования оно null — и подсветка появляется после гидрации,
 * не создавая рассинхрона.
 */
export function useMyTeam() {
  const myTeamId = useState<number | null>('my-team', () => null)

  onMounted(() => {
    try {
      const raw = localStorage.getItem(KEY)
      const id = raw ? Number(raw) : Number.NaN
      myTeamId.value = Number.isSafeInteger(id) && id > 0 ? id : null
    }
    catch {
      myTeamId.value = null
    }
  })

  function set(id: number | null) {
    myTeamId.value = id
    try {
      if (id == null) localStorage.removeItem(KEY)
      else localStorage.setItem(KEY, String(id))
    }
    catch {
      // приватный режим — выбор просто не запомнится
    }
  }

  function toggle(id: number) {
    set(myTeamId.value === id ? null : id)
  }

  const isMine = (id: number | null | undefined) => id != null && myTeamId.value === id

  return { myTeamId, set, toggle, isMine }
}
