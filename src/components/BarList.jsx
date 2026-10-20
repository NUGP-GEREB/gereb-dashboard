import { useEffect, useId, useRef, useState } from 'react'
import { compactBrl, percent } from '../utils/formatters'
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
  tableDetails = false,
  detailValueLabel = 'Valor',
}) {
  const [expanded, setExpanded] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const dialogRef = useRef(null)
  const dialogTitle = useId()
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (detailsOpen && !dialog.open) dialog.showModal()
    if (!detailsOpen && dialog.open) dialog.close()
  }, [detailsOpen])
  const visible = items.slice(0, expanded ? items.length : limit)
  const max = Math.max(...visible.map((item) => Math.abs(item.value)), 1)
  const canExpand = expandable && (tableDetails ? items.length > 0 : items.length > limit)
  const total = items.reduce((sum, item) => sum + Math.round(Number(item.value || 0) * 100), 0) / 100
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
          <button className="panel-action-button" type="button" aria-haspopup={tableDetails ? 'dialog' : undefined} onClick={() => tableDetails ? setDetailsOpen(true) : setExpanded((current) => !current)}>
            {!tableDetails && expanded ? 'Ver menos' : 'Ver mais'}
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
      {tableDetails && <dialog ref={dialogRef} className="coordination-popup__dialog axis-overview-popup__dialog ranking-details-dialog" aria-labelledby={dialogTitle} onClose={() => setDetailsOpen(false)} onCancel={() => setDetailsOpen(false)} onClick={(event) => {
        if (event.target !== event.currentTarget) return
        const bounds = event.currentTarget.getBoundingClientRect()
        if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) setDetailsOpen(false)
      }}>
        <div className="coordination-popup__header"><div><span>Detalhamento</span><h3 id={dialogTitle}>{title}</h3><p>{items.length} projetos · Total: {fullBrl.format(total)}</p></div><button className="coordination-popup__close" type="button" onClick={() => setDetailsOpen(false)}>Fechar</button></div>
        <div className="coordination-popup__body axis-overview-popup__body">
          <table className="axis-overview-table ranking-details-table"><thead><tr><th scope="col">Pos.</th><th scope="col">Projeto</th><th scope="col">Título</th><th scope="col">{detailValueLabel}</th><th scope="col">Participação</th></tr></thead><tbody>{items.map((item, index) => <tr key={item.label}><td>{String(index + 1).padStart(2, '0')}</td><td>{item.label}</td><td>{item.projectTitle || '—'}</td><td className="money-cell">{fullBrl.format(item.value)}</td><td>{percent.format(total ? item.value / total : 0)}</td></tr>)}</tbody><tfoot><tr><th scope="row" colSpan={3}>Total do recorte</th><td className="money-cell">{fullBrl.format(total)}</td><td>{percent.format(total ? 1 : 0)}</td></tr></tfoot></table>
        </div>
      </dialog>}
    </section>
  )
}
