import type { Competition } from '#shared/types/api'

/**
 * Какое соревнование показывать «по умолчанию» — на главной и в разделе матчей.
 *
 * ⚠️ НЕ «самое свежее по start_date». Сервер сортирует start_date ↓, и первым
 * в списке оказывается соревнование с самой ПОЗДНЕЙ датой старта — то есть
 * будущее. На реальных данных главная из-за этого показывала турнир, который
 * начнётся через четыре месяца, со всеми матчами без счёта, вместо идущего
 * прямо сейчас чемпионата.
 *
 * Правильный порядок предпочтения:
 *   1. идёт прямо сейчас (началось и не закончилось);
 *   2. иначе — последнее из уже начавшихся;
 *   3. иначе — ближайшее из будущих.
 *
 * Ручки «текущее соревнование» в API нет, поэтому выбор делается здесь.
 */
export function pickCurrentCompetition(
  list: Competition[],
  today: string = todayIso(),
): Competition | null {
  if (!list.length) return null

  const started = list.filter(c => c.start_date <= today)

  // 1. Идёт сейчас: началось и либо не имеет даты окончания, либо она впереди
  const ongoing = started.filter(c => !c.end_date || c.end_date >= today)
  if (ongoing.length) {
    return ongoing.reduce((a, b) => (b.start_date > a.start_date ? b : a))
  }

  // 2. Последнее завершившееся
  if (started.length) {
    return started.reduce((a, b) => (b.start_date > a.start_date ? b : a))
  }

  // 3. Ближайшее будущее
  return list.reduce((a, b) => (b.start_date < a.start_date ? b : a))
}
