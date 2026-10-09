import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'

const asModule = source => 'data:text/javascript;base64,' + Buffer.from(
  ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText,
).toString('base64')
const endpoints = asModule(readFileSync(new URL('../shared/utils/endpoints.ts', import.meta.url), 'utf8'))
const source = readFileSync(new URL('../app/utils/team-rosters.ts', import.meta.url), 'utf8')
  .replace("'#shared/utils/endpoints'", JSON.stringify(endpoints))
const { loadTeamRosters } = await import(asModule(source))

test('loads a team roster before its first game and includes later competition pages', async () => {
  const calls = []
  const api = async (url, options) => {
    calls.push(url)
    if (url === '/api/v1/competitions') {
      return options.query.page === 1
        ? { total: 201, items: Array.from({ length: 200 }, (_, i) => ({ id: i + 1 })) }
        : { total: 201, items: [{ id: 201, name: 'Звезда Отечества' }] }
    }
    if (url === '/api/v1/competitions/201/players') {
      return [{ team_id: 7, player: { id: 1 } }, { team_id: 5, player: { id: 2 } }]
    }
    return []
  }
  const rosters = await loadTeamRosters(api, 7)
  assert.equal(rosters.length, 1)
  assert.equal(rosters[0].competitionId, 201)
  assert.deepEqual(rosters[0].players.map(p => p.player.id), [1])
  assert.ok(!calls.includes('/api/v1/games'))
})

test('does not silently present a failed roster request as an empty roster', async () => {
  const api = async url => {
    if (url === '/api/v1/competitions') return { total: 1, items: [{ id: 4 }] }
    throw new Error('Unavailable')
  }
  await assert.rejects(loadTeamRosters(api, 7), /Unavailable/)
})
