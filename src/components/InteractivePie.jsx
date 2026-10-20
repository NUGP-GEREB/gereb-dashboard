import { useState } from 'react';
import { compactBrl, percent } from '../utils/formatters';
import './interactive-pie.css';

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const palette = ['#24579a', '#1c969c', '#78bacb', '#7490b4', '#394d72', '#467c9b', '#4a9f85'];
const count = (value) => `${value} projeto${value === 1 ? '' : 's'}`;
const radius = 76;
function arc(start, share) {
  const point = (fraction) => [110 + radius * Math.cos(fraction * Math.PI * 2 - Math.PI / 2), 110 + radius * Math.sin(fraction * Math.PI * 2 - Math.PI / 2)];
  if (share >= 1 - 1e-9) return `M 110 34 A 76 76 0 1 1 110 186 A 76 76 0 1 1 110 34`;
  const a = point(start), b = point(start + share);
  return `M ${a.join(' ')} A 76 76 0 ${share > .5 ? 1 : 0} 1 ${b.join(' ')}`;
}

export function InteractivePie({ title, items, valueType = 'money' }) {
  const [hovered, setHovered] = useState(null);
  const [selected, setSelected] = useState(null);
  const isCount = valueType === 'count';
  const validItems = items.filter((item) => Number(item.value) > 0);
  const total = validItems.reduce((sum, item) => sum + item.value, 0);
  const slices = validItems.map((item, index) => {
    const share = item.value / total;
    const offset = validItems.slice(0, index).reduce((sum, previous) => sum + previous.value, 0) / total;
    const slice = { ...item, share, path: arc(offset, share), color: item.color || palette[index % palette.length] };
    return slice;
  });
  const active = slices.find((item) => item.label === (hovered || selected));
  const pinned = slices.some((item) => item.label === selected);
  const toggle = (label) => setSelected((current) => current === label ? null : label);
  const valueLabel = (value) => isCount ? count(value) : money.format(value);
  return <section className="panel interactive-pie" aria-label={title}>
    <div className="panel-title"><div className="title-dot" /><div><h2>{title}</h2><p>{isCount ? 'Participação por quantidade de projetos' : 'Participação no valor contratado dos TEDs'}</p></div></div>
    {total > 0 ? <>
      <div className="interactive-pie__layout">
        <div className="interactive-pie__visual">
          <div className="interactive-pie__stage">
            <svg viewBox="0 0 220 220" role="group" aria-label={`${title}: selecione uma categoria`}>
              <circle cx="110" cy="110" r={radius} fill="none" stroke="#edf2f7" strokeWidth="30" />
              {slices.map((item) => <path key={item.label} d={item.path} fill="none" stroke={item.color} strokeWidth="30"
                className={`${active && active.label !== item.label ? 'is-muted' : ''} ${active?.label === item.label ? 'is-active' : ''}`}
                role="button" tabIndex={0} aria-label={`${item.label}: ${valueLabel(item.value)}, ${percent.format(item.share)}`} aria-pressed={selected === item.label}
                onMouseEnter={() => setHovered(item.label)} onMouseLeave={() => setHovered(null)} onFocus={() => setHovered(item.label)} onBlur={() => setHovered(null)}
                onClick={() => toggle(item.label)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); toggle(item.label); } if (event.key === 'Escape') { setSelected(null); setHovered(null); } }}>
                <title>{`${item.label}: ${valueLabel(item.value)} (${percent.format(item.share)})`}</title>
              </path>)}
            </svg>
            <div className="interactive-pie__center" aria-hidden="true"><span>{active ? 'Participação' : isCount ? 'Projetos' : 'Contratado'}</span><strong>{active ? percent.format(active.share) : isCount ? total : compactBrl.format(total)}</strong><small>{active ? isCount ? count(active.value) : compactBrl.format(active.value) : `${slices.length} categorias`}</small></div>
          </div>
          <div className="interactive-pie__selection" aria-live="polite"><strong>{active?.label || 'Visão consolidada'}</strong><span>{active ? valueLabel(active.value) : valueLabel(total)}</span></div>
        </div>
        <div className="interactive-pie__legend" aria-label="Categorias e valores">{slices.map((item) => <button type="button" key={item.label} className={`interactive-pie__row${active?.label === item.label ? ' is-active' : ''}`} aria-pressed={selected === item.label}
          onMouseEnter={() => setHovered(item.label)} onMouseLeave={() => setHovered(null)} onFocus={() => setHovered(item.label)} onBlur={() => setHovered(null)} onClick={() => toggle(item.label)}
          onKeyDown={(event) => { if (event.key === 'Escape') { setSelected(null); setHovered(null); } }}>
          <i style={{ background: item.color }} /><span className="interactive-pie__label">{item.label}<small>{isCount ? count(item.value) : 'Valor contratado'}</small></span>
          <span className="interactive-pie__value"><strong>{money.format(isCount ? item.detailTotalValue ?? 0 : item.value)}</strong><b>{percent.format(item.share)}</b></span>
          <span className="interactive-pie__mini-track" aria-hidden="true"><span style={{ width: `${item.share * 100}%`, background: item.color }} /></span>
        </button>)}</div>
      </div>
      <div className="interactive-pie__footer"><span>Passe o mouse ou toque em uma categoria para explorar.</span><button type="button" disabled={!pinned} onClick={() => { setSelected(null); setHovered(null); }}>Limpar seleção</button></div>
    </> : <div className="interactive-pie__empty" role="status">Nenhum dado disponível para os filtros selecionados.</div>}
  </section>;
}
