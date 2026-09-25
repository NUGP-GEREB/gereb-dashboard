import { useState } from 'react'
import { percent } from '../utils/formatters'

const fullBrl = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export function AxisOverview({ title, items, limit = 6 }) {
  const [detailsOpen, setDetailsOpen] = useState(false)
  const visible = items.slice(0, limit)
  const total = items.reduce((sum, item) => sum + Number(item.value || 0), 0)
  const max = Math.max(...visible.map((item) => Math.abs(item.value || 0)), 1)
  const canShowDetails = items.length > limit

  return (
    <section className="panel axis-overview" aria-label={title}>
      <header className="axis-overview__header">
        <div>
          <span>{'FIOCRUZ \u00b7 MAPA ESTRAT\u00c9GICO'}</span>
          <h2>Valor contratado por eixo</h2>
          <p>
            Total: <strong>{fullBrl.format(total)}</strong>
          </p>
        </div>
        {canShowDetails ? (
          <button
            className="panel-action-button axis-overview__more"
            type="button"
            onClick={() => setDetailsOpen(true)}
            aria-haspopup="dialog"
          >
            Ver mais
          </button>
        ) : null}
      </header>

      {visible.length ? (
        <div className="axis-overview__rows">
          {visible.map((item, index) => {
            const share = total ? item.value / total : 0
            const barWidth = (Math.abs(item.value) / max) * 100

            return (
              <article className="axis-overview__row" key={item.label}>
                <div className="axis-overview__row-top">
                  <div className="axis-overview__label">
                    <b>{String(index + 1).padStart(2, '0')}</b>
                    <span title={item.label}>{item.label}</span>
                  </div>
                  <div className="axis-overview__value">
                    <strong>{fullBrl.format(item.value)}</strong>
                    <span>{percent.format(share)}</span>
                  </div>
                </div>
                <div className="axis-overview__track" aria-hidden="true">
                  <i style={{ width: `${Math.max(barWidth, item.value ? 0.8 : 0)}%` }} />
                </div>
              </article>
            )
          })}
        </div>
      ) : (
        <div className="axis-overview__empty">Sem eixos para os filtros atuais.</div>
      )}

      <footer className="axis-overview__source">{'Fonte: Sistema de gest\u00e3o de contratos'}</footer>

      {detailsOpen ? (
        <div
          className="coordination-popup axis-overview-popup"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setDetailsOpen(false)
          }}
        >
          <div
            className="coordination-popup__dialog axis-overview-popup__dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="axis-overview-popup-title"
          >
            <div className="coordination-popup__header">
              <div>
                <span>Detalhamento</span>
                <h3 id="axis-overview-popup-title">Valor contratado por eixo</h3>
              </div>
              <button
                className="coordination-popup__close"
                type="button"
                onClick={() => setDetailsOpen(false)}
                aria-label="Fechar tabela"
              >
                Fechar
              </button>
            </div>
            <div className="coordination-popup__body axis-overview-popup__body">
              <table className="axis-overview-table">
                <thead>
                  <tr>
                    <th>Pos.</th>
                    <th>Eixo</th>
                    <th>Valor contratado</th>
                    <th>{'Participa\u00e7\u00e3o'}</th>
                    <th>Projetos</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <tr key={`${item.label}-axis-detail`}>
                      <td>{String(index + 1).padStart(2, '0')}</td>
                      <td>{item.label}</td>
                      <td className="money-cell">{fullBrl.format(item.value)}</td>
                      <td>{percent.format(total ? item.value / total : 0)}</td>
                      <td>{item.count || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}
