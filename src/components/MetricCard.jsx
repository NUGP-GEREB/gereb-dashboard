import { compactBrl } from '../utils/formatters'
import { CardHelpButton } from './CardHelpButton'

export function MetricCard({ label, value, detail, info, tone = 'default', format = 'money', icon }) {
  const displayValue = typeof value === 'number' && format === 'money' ? compactBrl.format(value) : value

  return (
    <article className={`metric-card metric-card--${tone}`}>
      {info ? (
        <CardHelpButton title={label} description={info} detail={detail} value={displayValue} />
      ) : null}
      {icon ? <span className={`metric-card__icon metric-card__icon--${icon}`} aria-hidden="true">{icon}</span> : null}
      <span>{label}</span>
      <strong>{displayValue}</strong>
      {detail ? <small>{detail}</small> : null}
    </article>
  )
}
