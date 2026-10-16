import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'

const asModule = source => 'data:text/javascript;base64,' + Buffer.from(
  ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText,
).toString('base64')
const { buildLeaders, hasLeaders } = await import(
  asModule(readFileSync(new URL('../app/utils/leaders.ts', import.meta.url), 'utf8')),
)

const p = (id, goals, assists, games = 5, team_id = 1) => ({
  player: { id, full_name: `Игрок ${id}` },
  team_id,
  number: id,
  contract: false,
  goals,
  assists,
  points: goals + assists,
  penalties: 0,
  games,
})
const ids = rows => rows.map(r => r.row.player.id)

test('snipers: goals, then fewer games, then points', () => {
  const roster = [p(1, 3, 0, 5), p(2, 5, 0, 8), p(3, 5, 0, 3), p(4, 3, 4, 5)]
  assert.deepEqual(ids(buildLeaders(roster, 'goals')), [3, 2, 4, 1])
})

test('scorers: points, then goals, then fewer games', () => {
  const roster = [p(1, 2, 4, 5), p(2, 4, 2, 6), p(3, 4, 2, 4), p(4, 1, 1)]
  assert.deepEqual(ids(buildLeaders(roster, 'points')), [3, 2, 1, 4])
})

test('assistants: assists, then points, then fewer games', () => {
  const roster = [p(1, 0, 3, 5), p(2, 2, 3, 5), p(3, 2, 3, 2), p(4, 9, 1)]
  assert.deepEqual(ids(buildLeaders(roster, 'assists')), [3, 2, 1, 4])
})

test('drops players with zero in the metric', () => {
  const roster = [p(1, 0, 2), p(2, 1, 0), p(3, 0, 0, 0)]
  assert.deepEqual(ids(buildLeaders(roster, 'goals')), [2])
  assert.deepEqual(ids(buildLeaders(roster, 'assists')), [1])
})

test('shares a place between equal values (1, 2, 2, 4)', () => {
  const roster = [p(1, 5, 0), p(2, 3, 0, 4), p(3, 3, 0, 6), p(4, 1, 0)]
  assert.deepEqual(buildLeaders(roster, 'goals').map(r => r.place), [1, 2, 2, 4])
})

test('cuts the list to the limit', () => {
  const roster = Array.from({ length: 15 }, (_, i) => p(i + 1, 15 - i, 0))
  assert.equal(buildLeaders(roster, 'goals').length, 10)
  assert.equal(buildLeaders(roster, 'goals', 3).length, 3)
})

test('hasLeaders is false until someone scores or assists', () => {
  assert.equal(hasLeaders([p(1, 0, 0), p(2, 0, 0)]), false)
  assert.equal(hasLeaders([p(1, 0, 1)]), true)
  assert.equal(hasLeaders([]), false)
})
