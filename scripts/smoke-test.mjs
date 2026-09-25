import { readFile } from 'node:fs/promises'
import { projects } from '../src/data/projects.js'

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

const appSource = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8')
const cssSource = await readFile(new URL('../src/styles/dashboard.css', import.meta.url), 'utf8')
const normalizedInstrumentTypes = new Set(
  projects.map((project) =>
    project.instrumentType === 'EMENDAS' ? 'EMENDA PARLAMENTAR' : project.instrumentType,
  ),
)

assert(projects.length === 127, 'A base deve conter exatamente 127 projetos.')
assert(normalizedInstrumentTypes.has('EMENDA PARLAMENTAR'), 'EMENDAS deve entrar em EMENDA PARLAMENTAR.')
assert(appSource.includes('normalizeInstrumentType(project.instrumentType) === filters.modality'), 'Filtro de instrumento deve usar o valor normalizado.')
assert(!appSource.includes('realizedProjectRanking'), 'Ranking de realizado nao deve ser fixo.')
assert(appSource.includes('ResourceDistribution'), 'O painel deve renderizar a distribuicao de recursos.')
assert(appSource.includes('filter-shell'), 'Os filtros compactos devem estar presentes.')
assert(appSource.includes('Consulta de TEDs'), 'A consulta inferior deve filtrar por TEDs.')
assert(appSource.includes('filters.ted'), 'A consulta por TED deve usar um filtro proprio.')
assert(appSource.includes('filters.tedCategory'), 'A consulta por TED deve filtrar por categoria de TED.')
assert(appSource.includes('filters.tedYear'), 'A consulta por TED deve filtrar por ano do TED.')
assert(appSource.includes('filters.tedFunder'), 'A consulta por TED deve filtrar por orgao concedente.')
assert(cssSource.includes('project-card-list'), 'A visualizacao mobile em cards deve estar estilizada.')

console.log('Smoke test passed.')
