import type { Homepage, HomepageBlock } from '#shared/types/api'

/**
 * Блоки главной: что и в каком порядке показывать над лентой матчей.
 *
 * Раньше настройка была на четырёх полях — флаг и id отдельно для таблицы и
 * отдельно для сетки. Теперь это массив блоков, до трёх штук, с типом,
 * позицией, своей подписью и вложенным соревнованием.
 */

/**
 * Приводит ответ /homepage к списку блоков.
 *
 * Старые поля сервер всё ещё отдаёт, и они используются как ЗАПАСНОЙ путь:
 * если blocks пуст, а флаги выставлены, главная не должна остаться без
 * таблицы. Как только админка переедет на блоки окончательно, ветку можно
 * будет убрать — но молча выкидывать её сейчас значит рискнуть пустой
 * главной на проде.
 *
 * Сортируем по position: порядок элементов в массиве сервер не обещает.
 */
export function homepageBlocks(homepage: Homepage | null | undefined): HomepageBlock[] {
  if (!homepage) return []

  if (homepage.blocks?.length) {
    return [...homepage.blocks].sort((a, b) => a.position - b.position)
  }

  const legacy: HomepageBlock[] = []

  // Оба условия — и флаг, и id: админка допускает true при null.
  if (homepage.show_standings && homepage.standings_competition_id != null) {
    legacy.push({
      id: -1,
      position: 1,
      type: 'standings',
      competition_id: homepage.standings_competition_id,
      title: null,
      competition: null,
    })
  }
  if (homepage.show_bracket && homepage.bracket_competition_id != null) {
    legacy.push({
      id: -2,
      position: 2,
      type: 'bracket',
      competition_id: homepage.bracket_competition_id,
      title: null,
      competition: null,
    })
  }

  return legacy
}

/**
 * Подпись блока. Своя из админки важнее названия соревнования: её и вносят
 * ровно тогда, когда название не подходит.
 *
 * `competition` в схеме допускает null, поэтому последний фолбэк — номер:
 * выдумывать название нельзя, а блок без подписи не сообщает, к чему цифры.
 */
export function blockTitle(block: HomepageBlock): string {
  if (block.title) return block.title
  if (block.competition) return block.competition.name
  return `Соревнование №${block.competition_id}`
}
