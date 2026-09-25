export const brl = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 0,
})

export const compactBrl = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  notation: 'compact',
  compactDisplay: 'short',
  maximumFractionDigits: 1,
})

export const percent = new Intl.NumberFormat('pt-BR', {
  style: 'percent',
  maximumFractionDigits: 1,
})

export const dateShort = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: '2-digit',
})

export function formatDateShort(dateValue) {
  if (!dateValue) return 'Sem data'

  const date = new Date(`${dateValue}T12:00:00`)
  if (Number.isNaN(date.getTime())) return 'Sem data'

  return dateShort.format(date)
}

export function sumBy(items, key) {
  return items.reduce((total, item) => total + Number(item[key] || 0), 0)
}

export function groupBySum(items, groupKey, valueKey) {
  const map = new Map()

  items.forEach((item) => {
    const label = item[groupKey] || 'Não informado'
    map.set(label, (map.get(label) || 0) + Number(item[valueKey] || 0))
  })

  return [...map.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
}

export function groupByCount(items, key) {
  const map = new Map()

  items.forEach((item) => {
    const label = item[key] || 'Não informado'
    map.set(label, (map.get(label) || 0) + 1)
  })

  return [...map.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
}

export function clamp(value, min = 0, max = 100) {
  return Math.min(Math.max(value, min), max)
}

export function daysUntil(dateValue) {
  if (!dateValue) return null

  const today = new Date()
  const end = new Date(`${dateValue}T12:00:00`)
  if (Number.isNaN(end.getTime())) return null

  const ms = end.getTime() - today.getTime()
  return Math.ceil(ms / 86400000)
}

export function lifecycleStatus(project) {
  const days = daysUntil(project.end)

  if (days === null) return { label: 'Sem data', tone: 'warning' }
  if (days < 0) return { label: 'Encerrado', tone: 'danger' }
  if (days <= 90) return { label: 'Crítico', tone: 'danger' }
  if (days <= 240) return { label: 'Atenção', tone: 'warning' }
  return { label: 'Em vigência', tone: 'success' }
}
