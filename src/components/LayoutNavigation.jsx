import { useEffect, useState } from 'react';

const sections = [['visao-geral', 'Visão geral'], ['analises', 'Análises financeiras'], ['rankings', 'Rankings e grupos'], ['projetos', 'Projetos'], ['teds', 'Consulta de TEDs']];

export function LayoutNavigation({ compact, onCompactChange }) {
  const [active, setActive] = useState('visao-geral');
  useEffect(() => {
    const update = () => {
      const entries = sections.map(([id]) => document.getElementById(id)).filter(Boolean);
      const current = entries.filter((element) => element.getBoundingClientRect().top <= 160).at(-1);
      setActive(current?.id || 'visao-geral');
    };
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, []);
  return <nav className="workspace-nav" aria-label="Navegação do dashboard">
    <div className="workspace-nav__links">{sections.map(([id, label]) => <a href={`#${id}`} key={id} aria-current={active === id ? 'location' : undefined} onClick={() => setActive(id)}>{label}</a>)}</div>
    <button type="button" className="density-toggle" aria-pressed={compact} onClick={onCompactChange}><svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><rect x="3" y="3" width="14" height="5" rx="1"/><rect x="3" y="12" width="14" height="5" rx="1"/></svg>{compact ? 'Visão confortável' : 'Visão compacta'}</button>
  </nav>;
}
