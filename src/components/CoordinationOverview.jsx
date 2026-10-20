import { useState } from 'react';
import './coordination-overview.css';

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const columns = ['Realizado', 'Comprometido', 'Saldo'];
const colors = ['#209d9c', '#77bcc8', '#24579a'];
const cents = (value) => Math.round(Number(value || 0) * 100);

function Amount({ value, index, max }) {
  return <div className={`coord-overview__amount${value < 0 ? ' is-negative' : ''}`} role="cell">
    <span className="coord-overview__mobile-label">{columns[index]}</span>
    <strong>{money.format(value)}</strong>
    <div className="coord-overview__track" aria-hidden="true"><span className="coord-overview__zero" /><i style={{ width: `${Math.abs(value) / max * 50}%`, left: value < 0 ? 'auto' : '50%', right: value < 0 ? '50%' : 'auto', background: value < 0 ? '#c15a65' : colors[index] }} /></div>
  </div>;
}

export function CoordinationOverview({ groups }) {
  const [order, setOrder] = useState('0');
  const sorted = [...groups].sort((a, b) => order === 'name' ? a.label.localeCompare(b.label, 'pt-BR') : b.values[Number(order)] - a.values[Number(order)]);
  const max = Math.max(1, ...groups.flatMap((group) => group.values.map(Math.abs)));
  const totals = columns.map((_, index) => groups.reduce((sum, group) => sum + cents(group.values[index]), 0) / 100);
  function exportCsv() {
    const rows = [['Coordenação', ...columns], ...sorted.map((group) => [group.label, ...group.values.map((value) => value.toFixed(2).replace('.', ','))]), ['TOTAL', ...totals.map((value) => value.toFixed(2).replace('.', ','))]];
    const csv = '\uFEFF' + rows.map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(';')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = 'financeiro-por-coordenacao.csv'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <section className="panel coord-overview" aria-label="Execução financeira por coordenação">
    <div className="coord-overview__heading"><div className="panel-title"><div className="title-dot" /><div><h2>Realizado, Comprometido e Saldo por Coordenação</h2><p>Todas as coordenações do recorte, com valores completos em reais.</p></div></div><span className="coord-overview__badge">{groups.length} coordenações</span></div>
    <div className="coord-overview__toolbar"><p>Barras na mesma escala. Valores negativos à esquerda do zero.</p><div><label>Ordenar por <select value={order} onChange={(event) => setOrder(event.target.value)}><option value="0">Maior realizado</option><option value="1">Maior comprometido</option><option value="2">Maior saldo</option><option value="name">Nome da coordenação</option></select></label><button type="button" onClick={exportCsv} disabled={!groups.length}>Exportar CSV</button></div></div>
    <div className="coord-overview__table" role="table" aria-label="Valores consolidados por coordenação">
      <div className="coord-overview__row coord-overview__header" role="row"><span role="columnheader">Coordenação</span>{columns.map((column, index) => <span role="columnheader" key={column}><i style={{ background: colors[index] }} />{column}</span>)}</div>
      {sorted.map((group) => <div className="coord-overview__row coord-overview__data" role="row" key={group.label}><strong role="rowheader" className="coord-overview__name">{group.label}</strong>{group.values.map((value, index) => <Amount key={columns[index]} value={value} index={index} max={max} />)}</div>)}
      {groups.length > 0 && <div className="coord-overview__row coord-overview__total" role="row"><strong role="rowheader">Total do recorte</strong>{totals.map((value, index) => <div role="cell" key={columns[index]}><span className="coord-overview__mobile-label">{columns[index]}</span><strong>{money.format(value)}</strong></div>)}</div>}
    </div>
    {groups.length === 0 && <p className="coord-overview__empty" role="status">Nenhuma coordenação encontrada para os filtros selecionados.</p>}
    <p className="coord-overview__footnote">Todos os valores permanecem visíveis, inclusive centavos e saldos negativos. As barras comparam os valores das coordenações; os totais são apresentados na última linha.</p>
  </section>;
}
