import { useMemo, useState } from 'react';
import previousProjects from '../data/previousProjects.json';
import { compareProjects, financialFields, financialTotal, groupComparison } from '../data/comparison';

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const percentage = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2, signDisplay: 'exceptZero' });
const signedMoney = (value) => `${value > 0 ? '+' : ''}${currency.format(value)}`;
const rate = (before, after) => before ? `${percentage.format((after - before) / Math.abs(before) * 100)}%` : after ? 'Base anterior zero' : '0%';
const display = (value, type) => {
  if (value === undefined || value === null || value === '') return '—';
  if (type === 'money') return currency.format(value);
  if (type === 'date' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value.split('-').reverse().join('/');
  return String(value);
};
const fold = (value) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export function HistoricalComparison({ projects }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('Todos');
  const [dimension, setDimension] = useState('unit');
  const [metric, setMetric] = useState('total');
  const [page, setPage] = useState(1);
  const changes = useMemo(() => compareProjects(previousProjects, projects), [projects]);
  const groups = useMemo(() => groupComparison(previousProjects, projects, dimension, metric), [projects, dimension, metric]);
  const visible = changes.filter((entry) => (status === 'Todos' || entry.status === status) &&
    fold([entry.id, entry.before?.title, entry.after?.title, entry.before?.coordinator, entry.after?.coordinator].filter(Boolean).join(' ')).includes(fold(search)));
  const pageCount = Math.max(1, Math.ceil(visible.length / 10));
  const safePage = Math.min(page, pageCount);

  function exportChanges() {
    const rows = [['Projeto', 'Situação', 'Campo', 'Anterior', 'Atual', 'Diferença']];
    for (const entry of visible) {
      for (const [key, label, type] of entry.fields) {
        const before = entry.before?.[key];
        const after = entry.after?.[key];
        rows.push([entry.id, entry.status, label, display(before, type), display(after, type), type === 'money' ? signedMoney((after || 0) - (before || 0)) : '']);
      }
    }
    const csv = '\uFEFF' + rows.map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(';')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'comparacao-gereb-20-10-2026.csv';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return <section className="history-panel" aria-label="Comparação com a base anterior">
    <div className="history-heading">
      <div><h2>O que mudou na carteira</h2><p>Versão anterior × base de 20/10/2026</p></div>
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open}>{open ? 'Recolher comparação' : 'Ver comparação completa'}</button>
    </div>
    <div className="history-counts">
      <span><strong>{previousProjects.length} → {projects.length}</strong> projetos</span>
      {['Incluído', 'Retirado', 'Alterado', 'Sem alteração'].map((label) => <span key={label}><strong>{changes.filter((entry) => entry.status === label).length}</strong> {label === 'Incluído' ? 'incluídos' : label === 'Retirado' ? 'retirados' : label === 'Alterado' ? 'alterados' : 'sem alteração'}</span>)}
    </div>
    {open && <div className="history-content">
      <p className="history-note">A versão anterior tinha 169 projetos e exibia “junho/2026”; a data efetiva de seus dados não está confirmada. A comparação usa a carteira completa e não acompanha os filtros dos outros painéis. Alterações de texto também são contabilizadas. Inclusões, retiradas e reclassificações influenciam os totais.</p>
      <h3>Indicadores financeiros</h3>
      <div className="history-scroll" tabIndex={0} aria-label="Indicadores financeiros comparados"><table><thead><tr><th>Indicador</th><th>Anterior</th><th>Atual</th><th>Diferença</th><th>Variação</th></tr></thead><tbody>
        {financialFields.map(([key, label]) => {
          const before = financialTotal(previousProjects, key);
          const after = financialTotal(projects, key);
          return <tr key={key}><th scope="row">{label}</th><td>{currency.format(before)}</td><td>{currency.format(after)}</td><td>{signedMoney(after - before)}</td><td>{rate(before, after)}</td></tr>;
        })}
      </tbody></table></div>
      <h3>Comparação por grupo</h3>
      <div className="history-controls">
        <label>Agrupar por<select value={dimension} onChange={(event) => setDimension(event.target.value)}>{[['unit', 'Coordenação'], ['coordinator', 'Coordenador'], ['funder', 'Ente financiador'], ['instrumentType', 'Instrumento'], ['tedCategory', 'Categoria TED'], ['nature', 'Natureza'], ['axis', 'Eixo estratégico']].map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
        <label>Indicador<select value={metric} onChange={(event) => setMetric(event.target.value)}>{financialFields.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
      </div>
      <div className="history-scroll history-groups" tabIndex={0} aria-label="Comparação por grupo"><table><thead><tr><th>Grupo</th><th>Projetos anterior / atual</th><th>Anterior</th><th>Atual</th><th>Diferença</th><th>Variação</th></tr></thead><tbody>{groups.map((group) => <tr key={group.label}><th scope="row">{group.label}</th><td>{group.beforeCount} / {group.afterCount}</td><td>{currency.format(group.before)}</td><td>{currency.format(group.after)}</td><td>{signedMoney(group.after - group.before)}</td><td>{rate(group.before, group.after)}</td></tr>)}</tbody></table></div>
      <h3>Alterações por projeto</h3>
      <div className="history-controls">
        <label>Buscar projeto ou coordenador<input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Código, título ou coordenador" /></label>
        <label>Situação<select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}>{['Todos', 'Incluído', 'Retirado', 'Alterado', 'Sem alteração'].map((label) => <option key={label}>{label}</option>)}</select></label>
        <button type="button" onClick={exportChanges}>Exportar alterações (CSV)</button>
      </div>
      <p>{visible.length} projetos encontrados. Abra um projeto para conferir os campos.</p>
      <div className="history-projects">{visible.slice((safePage - 1) * 10, safePage * 10).map((entry) => <details key={entry.id}>
        <summary><span className="history-badge">{entry.status}</span> <strong>{entry.id}</strong> — {entry.after?.title || entry.before?.title} <small>({entry.fields.length} campos)</small></summary>
        {entry.status === 'Sem alteração' ? <p>Nenhuma alteração nos campos comparados.</p> : <div className="history-scroll" tabIndex={0} aria-label={`Alterações de ${entry.id}`}><table className="history-field-table"><thead><tr><th>Campo</th><th>Anterior</th><th>Atual</th><th>Diferença financeira</th></tr></thead><tbody>{entry.fields.map(([key, label, type]) => <tr key={key}><th scope="row">{label}</th><td>{display(entry.before?.[key], type)}</td><td>{display(entry.after?.[key], type)}</td><td>{type === 'money' ? signedMoney((entry.after?.[key] || 0) - (entry.before?.[key] || 0)) : '—'}</td></tr>)}</tbody></table></div>}
      </details>)}</div>
      {visible.length === 0 && <p>Nenhum projeto corresponde à busca.</p>}
      <div className="history-pagination"><button type="button" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}>Anterior</button><span>Página {safePage} de {pageCount}</span><button type="button" disabled={safePage >= pageCount} onClick={() => setPage(safePage + 1)}>Próxima</button></div>
    </div>}
  </section>;
}
