import { useState } from 'react'
import { compactBrl } from '../utils/formatters'
import { CardHelpButton } from './CardHelpButton'

const fullBrl = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export function BarList({
  title,
  subtitle,
  items,
  valueType = 'money',
  limit = 7,
  info,
  expandable = false,
  fullValues = false,
  presentation = false,
  roomyLabels = false,
  wideLabels = false,
}) {
  const [expanded, setExpanded] = useState(false)
  const visible = items.slice(0, expanded ? items.length : limit)
  const max = Math.max(...visible.map((item) => Math.abs(item.value)), 1)
  const canExpand = expandable && items.length > limit
  const formatValue = (value) => {
    if (valueType !== 'money') return value
    return fullValues ? fullBrl.format(value) : compactBrl.format(value)
  }

  return (
    <section className={['panel', 'chart-panel', presentation ? 'chart-panel--presentation' : ''].filter(Boolean).join(' ')}>
      <CardHelpButton
        title={title}
        description={info || 'Gráfico de barras usado para comparar rapidamente os maiores itens do recorte selecionado.'}
        detail={subtitle || `${visible.length} itens exibidos`}
        value={`${visible.length} de ${items.length} itens`}
      />
      <div className="panel-title">
        <div className="title-dot" />
        <div>
          <h2>{title}</h2>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
        {canExpand ? (
          <button className="panel-action-button" type="button" onClick={() => setExpanded((current) => !current)}>
            {expanded ? 'Ver menos' : 'Ver mais'}
          </button>
        ) : null}
      </div>
      <div className={['ranking-chart', presentation ? 'ranking-chart--presentation' : ''].filter(Boolean).join(' ')}>
        {visible.map((item) => (
          <div
            className={[
              'ranking-row',
              presentation ? 'ranking-row--presentation' : '',
              wideLabels ? 'ranking-row--wide-label' : '',
              roomyLabels ? 'ranking-row--roomy-label' : '',
              fullValues ? 'ranking-row--full-value' : '',
              item.value < 0 ? 'ranking-row--negative' : '',
            ].filter(Boolean).join(' ')}
            key={item.label}
          >
            <span>{item.label}</span>
            <div className="ranking-track">
              <i style={{ width: `${(Math.abs(item.value) / max) * 100}%` }} />
            </div>
            <strong>{formatValue(item.value)}</strong>
          </div>
        ))}
      </div>
    </section>
  )
}
