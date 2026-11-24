import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'

// Use an installed Playwright, or supply its module path through PLAYWRIGHT_MODULE.
const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
const csv = await readFile(new URL('../projetos_fiotec_dashboard.csv', import.meta.url), 'utf8')
const parser = await readFile(new URL('../src/data/projectCsv.js', import.meta.url), 'utf8')
const source = parser.replace(/^import csvSource[^\n]*\n/, `const csvSource = ${JSON.stringify(csv)};\n`)
const { csvProjects: projects } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`)
const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || 'msedge', headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
const errors = []
page.on('pageerror', error => errors.push(error.message))
page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const clean = value => value.replace(/\s/g, '')
const filter = label => page.locator('.filter-panel .filter-control')
  .filter({ has: page.getByText(label, { exact: true }) }).locator('select')
const cards = page.locator('.dashboard-summary .metric-card > strong')

async function verifySelection(items) {
  const values = [items.length, items.filter(item => item.supportTed).length,
    ...['total', 'released', 'receivable', 'realized', 'committed', 'currentBalance']
      .map(field => money.format(items.reduce((sum, item) => sum + item[field], 0)))]
  assert.deepEqual((await cards.allTextContents()).map(clean), values.map(value => clean(String(value))))
  const instrumentChart = page.locator('.panel--donut').first()
  assert.equal(await instrumentChart.locator('.donut__count').textContent(), `${items.length} projeto${items.length === 1 ? '' : 's'}`)
  assert.equal(await instrumentChart.locator('.donut-detail__row').count(), new Set(items.map(item => item.instrumentType)).size)
  assert.equal(await page.locator('.column-group').count(), new Set(items.map(item => item.unit)).size)
  assert.equal(await page.locator('.table-wrap tbody > tr').count(), Math.min(items.length, 12))
  assert.ok(await page.locator('.filter-panel').isVisible())
}

try {
  await page.goto(process.env.BASE_URL || 'http://127.0.0.1:5183/docs/')
  await page.getByRole('heading', { name: 'Carteira de Projetos da GEREB', exact: true }).waitFor()
  assert.equal(await page.locator('.filter-shell button[aria-expanded], .filter-toggle').count(), 0)
  assert.equal(await page.locator('.filter-panel select').count(), 7)
  await verifySelection(projects)
  const types = [...new Set(projects.map(item => item.instrumentType))].sort((a, b) => a.localeCompare(b, 'pt-BR'))
  assert.deepEqual(await filter('Instrumento').locator('option').allTextContents(), ['Todos', ...types])
  for (const type of types) {
    await filter('Instrumento').selectOption(type)
    await page.getByRole('button', { name: 'Aplicar', exact: true }).click()
    await verifySelection(projects.filter(item => item.instrumentType === type))
  }
  await page.getByRole('button', { name: 'Limpar', exact: true }).click()
  await filter('Instrumento').selectOption('CARTA ACORDO')
  const letterProjects = projects.filter(item => item.instrumentType === 'CARTA ACORDO')
  await verifySelection(letterProjects)
  const downloadEvent = page.waitForEvent('download')
  await page.locator('.export-button').click()
  const download = await downloadEvent
  assert.match(download.suggestedFilename(), /\.xlsx$/)
  const xlsx = await readFile(await download.path())
  assert.equal(xlsx.readUInt32LE(), 0x04034b50)
  const xml = xlsx.toString('utf8') // Existing exporter writes uncompressed XML ZIP entries.
  assert.ok(xml.includes(letterProjects[0].id))
  assert.ok(!xml.includes(projects.find(item => item.instrumentType !== 'CARTA ACORDO').id))
  assert.ok(xml.includes(`<v>${letterProjects[0].total}</v>`))
  await page.getByRole('button', { name: 'Limpar', exact: true }).click()
  await filter('Instrumento').selectOption('TED')
  await filter('Natureza').selectOption(projects.find(item => item.instrumentType === 'TED').nature)
  const nature = await filter('Natureza').inputValue()
  await verifySelection(projects.filter(item => item.instrumentType === 'TED' && item.nature === nature))
  await filter('Instrumento').selectOption('CARTA ACORDO')
  await filter('Projeto').selectOption(projects.find(item => item.instrumentType === 'TED').id)
  await verifySelection([])
  assert.ok(await page.locator('.export-button').isDisabled())
  await page.getByRole('button', { name: 'Limpar', exact: true }).click()
  await verifySelection(projects)

  // Isolated browser fixtures verify AEP handling without changing the source data.
  const agreement = 'ACORDO DE EXECUÇÃO DE PROJETOS'
  const fixture = projects.map((item, index) => ({ ...item,
    instrumentType: index === 0 ? ' aep\u200b ' : index === 1 ? 'acordo de execucao de projetos' : item.instrumentType }))
  await page.evaluate(data => localStorage.setItem('gereb-projects-editable-2026-10-20', JSON.stringify(data)), fixture)
  await page.reload()
  await filter('Instrumento').selectOption(agreement)
  const agreementItems = fixture.slice(0, 2).map(item => ({ ...item, instrumentType: agreement }))
  await verifySelection(agreementItems)
  await filter('Projeto').selectOption(agreementItems[0].id)
  await verifySelection([agreementItems[0]])
  await page.getByRole('button', { name: 'Limpar', exact: true }).click()
  assert.equal(await cards.first().textContent(), '189')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
  await verifySelection(projects)

  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    const layout = await page.locator('.filter-panel').evaluate(panel => ({
      clipped: panel.scrollHeight > panel.clientHeight + 1,
      controlsOutside: [...panel.querySelectorAll('select, input, button')].some(element => {
        const rect = element.getBoundingClientRect()
        return rect.width === 0 || rect.left < 0 || rect.right > innerWidth
      }),
      overflow: document.documentElement.scrollWidth > innerWidth,
      position: getComputedStyle(panel.parentElement).position,
    }))
    assert.equal(layout.clipped, false, `Painel cortado a ${width}px`)
    assert.equal(layout.controlsOutside, false, `Controles fora da tela a ${width}px`)
    assert.equal(layout.overflow, false, `Rolagem horizontal a ${width}px`)
    assert.ok(!['fixed', 'sticky'].includes(layout.position))
    if ([390, 1440].includes(width)) await page.screenshot({ path: `tmp/filtros-${width}.png`, fullPage: true })
  }
  assert.deepEqual(errors, [])
  console.log('PASS: production /docs/, all real instrument categories, financial cards, charts, table, combined/empty filters, clear/apply, XLSX contents, isolated AEP fixtures, responsive 320–1440px, no console errors.')
} finally {
  await browser.close()
}
