import { useState } from 'react'
import { CardHelpButton } from './CardHelpButton'

const palette = ['#209d9c', '#77bcc8', '#24579a']
const fullMoney = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const compactMoney = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact', maximumFractionDigits: 1 })

const formatMillions = (value) => {
  if (Math.abs(value) < 1_000_000) return compactMoney.format(value)
  const sign = value < 0 ? '-' : ''
  const millions = Math.abs(value) / 1_000_000
  const formatted = millions.toLocaleString('pt-BR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })

  return `${sign}R$ ${formatted} mi`
}

export function ColumnChart({ title, subtitle, groups, info }) {
  const [summaryOpen, setSummaryOpen] = useState(false)
  const [highlight, setHighlight] = useState(null)
  const rubrics = ['Realizado', 'Comprometido', 'Saldo']
  const max = Math.max(...groups.flatMap((group) => group.values.map((value) => Math.abs(value))), 1)
  const isCoordinationChart = title.startsWith('Realizado, Comprometido')
  const displayTitle = isCoordinationChart
    ? 'Realizado, Comprometido e Saldo por Coordena\u00e7\u00e3o'
    : title
  const displaySubtitle = isCoordinationChart
    ? 'Valores consolidados por coordena\u00e7\u00e3o'
    : subtitle
  const displayInfo = isCoordinationChart
    ? 'Compara os valores realizados, comprometidos e os saldos informados para cada coordena\u00e7\u00e3o.'
    : info
  const coordinationTable = (
    <div className="coordination-table" aria-label={'Resumo financeiro por coordena\u00e7\u00e3o'}>
      <div className="coordination-table__row coordination-table__row--head">
        <span>{'Coordena\u00e7\u00e3o'}</span>
        {rubrics.map((rubric) => (
          <span key={rubric}>{rubric}</span>
        ))}
      </div>
      {groups.map((group) => (
        <div className="coordination-table__row" key={`${group.label}-table`}>
          <strong>{group.label}</strong>
          {group.values.map((value, index) => (
            <span
              className={value < 0 ? 'is-negative' : ''}
              key={`${group.label}-${rubrics[index]}-table`}
            >
              {fullMoney.format(value)}
            </span>
          ))}
        </div>
      ))}
    </div>
  )

  return (
    <section className="panel chart-panel chart-panel--wide coordination-chart" onKeyDown={(event) => { if (event.key === 'Escape') setSummaryOpen(false) }}>
      <CardHelpButton
        title={displayTitle}
        description={displayInfo || 'Grafico comparativo para enxergar realizado, comprometido e saldo lado a lado por grupo.'}
        detail={displaySubtitle || 'Cada cor representa uma rubrica financeira.'}
        value={`${groups.length} grupos exibidos`}
      />
      <div className="panel-title">
        <div className="title-dot" />
        <div>
          <h2>{displayTitle}</h2>
          {displaySubtitle ? <p>{displaySubtitle}</p> : null}
        </div>
      </div>
      <div className="chart-legend">
        {rubrics.map((rubric, index) => (
          <span key={rubric}>
            <i style={{ background: palette[index] }} />
            {rubric}
          </span>
        ))}
      </div>
      <div className="coordination-actions">
        <button
          className="details-button coordination-popup-trigger"
          type="button"
          onClick={() => setSummaryOpen(true)}
          aria-haspopup="dialog"
        >
          Ver valores completos
        </button>
      </div>
      <div className="column-chart" tabIndex={0} role="group" aria-label="Gráfico de colunas por coordenação; deslize horizontalmente em telas menores" style={{ '--column-group-count': Math.max(groups.length, 1) }}>
        {groups.map((group) => (
          <div className="column-group" key={group.label}>
            <div className="columns">
              {group.values.map((value, index) => (
                <div
                  key={`${group.label}-${rubrics[index]}`}
                  className={`column-bar column-bar--${index} has-tooltip${value < 0 ? ' column-bar--negative' : ''}${Math.abs(value) < 8_000_000 ? ' column-bar--small' : ''}`}
                  data-tooltip={`${group.label} - ${rubrics[index]}: ${fullMoney.format(value)}`}
                  title={`${group.label} — ${rubrics[index]}: ${fullMoney.format(value)}`}
                  tabIndex={0}
                  role="img"
                  aria-label={`${group.label}, ${rubrics[index]}: ${fullMoney.format(value)}`}
                  onMouseEnter={() => setHighlight(`${group.label} · ${rubrics[index]}: ${fullMoney.format(value)}`)}
                  onMouseLeave={() => setHighlight(null)}
                  onFocus={() => setHighlight(`${group.label} · ${rubrics[index]}: ${fullMoney.format(value)}`)}
                  onBlur={() => setHighlight(null)}
                  style={{
                    height: `${Math.max((Math.abs(value) / max) * 100, value !== 0 ? 4 : 0)}%`,
                    background: palette[index],
                  }}
                >
                </div>
              ))}
            </div>
            <small className="group-label" title={group.label}>{group.label}</small>
            <div className="column-values" aria-label={`Valores de ${group.label}`}>
              {group.values.map((value, index) => <span className={`column-value${value < 0 ? ' is-negative' : ''}`} key={rubrics[index]} title={`${rubrics[index]}: ${fullMoney.format(value)}`} aria-label={`${rubrics[index]}: ${fullMoney.format(value)}`}><i style={{ background: palette[index] }} aria-hidden="true" /><span>{formatMillions(value)}</span></span>)}
            </div>
          </div>
        ))}
      </div>
      <div className="coordination-chart__caption"><span aria-live="polite">{highlight || `${groups.length} coordenações · Passe o mouse ou use Tab para consultar o valor completo.`}</span><span>Valores em reais · Em telas menores, deslize o gráfico.</span></div>
      {groups.length === 0 && <p role="status">Nenhuma coordenação encontrada para os filtros selecionados.</p>}
      {summaryOpen ? (
        <div
          className="coordination-popup"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSummaryOpen(false)
          }}
        >
          <div
            className="coordination-popup__dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="coordination-popup-title"
          >
            <div className="coordination-popup__header">
              <div>
                <span>Detalhamento</span>
                <h3 id="coordination-popup-title">{displayTitle}</h3>
              </div>
              <button
                className="coordination-popup__close"
                type="button"
                onClick={() => setSummaryOpen(false)}
                aria-label="Fechar tabela"
                autoFocus
              >
                Fechar
              </button>
            </div>
            <div className="coordination-popup__body">{coordinationTable}</div>
          </div>
        </div>
      ) : null}
    </section>
  )
}
