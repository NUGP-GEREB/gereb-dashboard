import { brl } from '../utils/formatters'

const shareFormatter = new Intl.NumberFormat('pt-BR', {
  maximumFractionDigits: 1,
  minimumFractionDigits: 1,
})

function getCoordinates(percent) {
  const angle = percent * Math.PI * 2 - Math.PI / 2

  return {
    x: 50 + 48 * Math.cos(angle),
    y: 50 + 48 * Math.sin(angle),
  }
}

function describeSlice(startPercent, endPercent) {
  const start = getCoordinates(startPercent)
  const end = getCoordinates(endPercent)
  const largeArcFlag = endPercent - startPercent > 0.5 ? 1 : 0

  return [
    `M 50 50`,
    `L ${start.x} ${start.y}`,
    `A 48 48 0 ${largeArcFlag} 1 ${end.x} ${end.y}`,
    'Z',
  ].join(' ')
}

export function ResourceDistribution({ items }) {
  const resources = items.filter((item) => Number(item.value || 0) > 0)
  const total = resources.reduce((sum, item) => sum + item.value, 0)
  const slices = resources.reduce((accumulator, item) => {
    const currentPercent = accumulator.offset
    const share = total ? item.value / total : 0
    const slice = {
      ...item,
      path: describeSlice(currentPercent, currentPercent + share),
      shareLabel: `${shareFormatter.format(share * 100)}%`,
    }

    return {
      items: [...accumulator.items, slice],
      offset: currentPercent + share,
    }
  }, { items: [], offset: 0 }).items

  return (
    <section className="panel resource-panel" aria-label="Distribuição de Recursos - TEDs">
      <div className="panel-title">
        <div className="title-dot" />
        <div>
          <h2>Distribuição de Recursos - TEDs</h2>
        </div>
      </div>
      <div className="resource-layout">
        {slices.length ? (
          <svg className="resource-pie" viewBox="0 0 100 100" role="img" aria-label="Distribuição dos recursos por tipo de TED">
            {slices.map((item) => (
              <path d={item.path} fill={item.color} key={item.label}>
                <title>
                  {item.label}: {brl.format(item.value)} ({item.shareLabel})
                </title>
              </path>
            ))}
          </svg>
        ) : (
          <div className="resource-empty" role="note">Sem TEDs no recorte</div>
        )}

        <div className="resource-detail">
          <h3>Detalhamento</h3>
          {slices.length ? (
            slices.map((item) => (
              <div className="resource-detail__row" key={item.label}>
                <i style={{ background: item.color }} />
                <span>{item.label}</span>
                <strong>
                  {brl.format(item.value)}
                  <small>({item.shareLabel})</small>
                </strong>
              </div>
            ))
          ) : (
            <div className="resource-detail__row resource-detail__row--empty">
              <span>Nenhum recurso TED encontrado para os filtros atuais.</span>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
