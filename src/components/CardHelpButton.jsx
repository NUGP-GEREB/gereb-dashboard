import { useId, useState } from 'react'

export function CardHelpButton({ title, description, detail, value }) {
  const [open, setOpen] = useState(false)
  const popupId = useId()

  return (
    <div className={open ? 'card-help is-open' : 'card-help'}>
      <button
        type="button"
        className="card-help__button"
        aria-label={`Explicar card ${title}`}
        aria-controls={popupId}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span aria-hidden="true">!</span>
      </button>
      {open ? (
        <div className="card-help__popup" id={popupId} role="dialog" aria-label={`Explicação: ${title}`}>
          <div className="card-help__heading">
            <strong>{title}</strong>
            <button type="button" aria-label="Fechar explicação" onClick={() => setOpen(false)}>
              x
            </button>
          </div>
          <p>{description}</p>
          <dl>
            <div>
              <dt>Valor exibido</dt>
              <dd>{value}</dd>
            </div>
            <div>
              <dt>Informação do card</dt>
              <dd>{detail}</dd>
            </div>
          </dl>
        </div>
      ) : null}
    </div>
  )
}
