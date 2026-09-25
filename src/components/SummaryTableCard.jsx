import { useState } from 'react'
import { percent } from '../utils/formatters'
import { CardHelpButton } from './CardHelpButton'

const fullBrl = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

function SummaryTable({ items, total, popup = false }) {
  return (
    <div className={popup ? 'summary-table summary-table--popup' : 'summary-table'} role="table">
      <div className="summary-table__row summary-table__row--head" role="row">
        {popup ? <span>Pos.</span> : null}
        <span>Grupo</span>
        <span>Valor contratado</span>
        <span>{'Participa\u00e7\u00e3o'}</span>
        <span>Proj.</span>
      </div>
      {items.map((item, index) => (
        <div className="summary-table__row" role="row" key={`${item.label}-${popup ? 'popup' : 'card'}`}>
          {popup ? <span>{String(index + 1).padStart(2, '0')}</span> : null}
          <strong title={item.label}>{item.label}</strong>
          <span>{fullBrl.format(item.value)}</span>
          <span>{percent.format(total ? item.value / total : 0)}</span>
          <span>{item.count || 0}</span>
        </div>
      ))}
    </div>
  )
}

export function SummaryTableCard({
  title,
  subtitle,
  items = [],
  limit = 10,
  info,
  detailLabel = 'Detalhamento completo',
}) {
  const [detailsOpen, setDetailsOpen] = useState(false)
  const visible = items.slice(0, limit)
  const total = items.reduce((sum, item) => sum + Number(item.value || 0), 0)
  const canShowDetails = items.length > 0
  const popupTitleId = `${title.replace(/\s+/g, '-').toLowerCase()}-popup-title`

  return (
    <section className="panel summary-table-card" aria-label={title}>
      <CardHelpButton
        title={title}
        description={info || 'Tabela resumida dos maiores grupos financeiros do recorte selecionado.'}
        detail={subtitle || `${visible.length} grupos exibidos`}
        value={`${visible.length} de ${items.length} grupos`}
      />
      <div className="panel-title summary-table-card__title">
        <div className="title-dot" />
        <div>
          <h2>{title}</h2>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
        {canShowDetails ? (
          <button
            className="panel-action-button"
            type="button"
            onClick={() => setDetailsOpen(true)}
            aria-haspopup="dialog"
          >
            Ver mais
          </button>
        ) : null}
      </div>

      {visible.length ? (
        <SummaryTable items={visible} total={total} />
      ) : (
        <div className="summary-table-card__empty">Sem dados para os filtros atuais.</div>
      )}

      {detailsOpen ? (
        <div
          className="coordination-popup summary-table-popup"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setDetailsOpen(false)
          }}
        >
          <div
            className="coordination-popup__dialog summary-table-popup__dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby={popupTitleId}
          >
            <div className="coordination-popup__header">
              <div>
                <span>{detailLabel}</span>
                <h3 id={popupTitleId}>{title}</h3>
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
            <div className="coordination-popup__body summary-table-popup__body">
              <SummaryTable items={items} total={total} popup />
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}
