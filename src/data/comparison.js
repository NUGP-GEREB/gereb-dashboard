export const comparisonFields = [
  ['title', 'Título'], ['objective', 'Objetivo geral'],
  ['coordinator', 'Coordenador'], ['unit', 'Coordenação'],
  ['process', 'Processo'], ['instrumentType', 'Tipo de instrumento'],
  ['funder', 'Ente financiador'], ['tedCategory', 'Categoria TED'],
  ['instrumentNumber', 'Número do instrumento'], ['nature', 'Natureza'],
  ['start', 'Início da vigência', 'date'], ['end', 'Fim da vigência', 'date'],
  ['axis', 'Eixo estratégico'],
  ['total', 'Valor contratado', 'money'], ['released', 'Recurso liberado', 'money'],
  ['receivable', 'A receber', 'money'], ['realized', 'Realizado', 'money'],
  ['committed', 'Comprometido', 'money'], ['currentBalance', 'Saldo atual', 'money'],
];

export const financialFields = comparisonFields.filter((field) => field[2] === 'money');
const cents = (value) => Math.round(Number(value || 0) * 100);
export function changedFields(before, after) {
  return comparisonFields.filter(([key, , type]) => type === 'money'
    ? cents(before[key]) !== cents(after[key])
    : String(before[key] ?? '').trim() !== String(after[key] ?? '').trim());
}

export function compareProjects(previous, current) {
  const oldMap = new Map(previous.map((project) => [project.id, project]));
  const newMap = new Map(current.map((project) => [project.id, project]));
  return [...new Set([...newMap.keys(), ...oldMap.keys()])].map((id) => {
    const before = oldMap.get(id);
    const after = newMap.get(id);
    const fields = before && after ? changedFields(before, after) : comparisonFields;
    return { id, before, after, fields, status: !before ? 'Incluído' : !after ? 'Retirado' : fields.length ? 'Alterado' : 'Sem alteração' };
  });
}

export function financialTotal(projects, field) {
  return projects.reduce((total, project) => total + cents(project[field]), 0) / 100;
}

export function groupComparison(previous, current, dimension, metric) {
  const groups = new Map();
  for (const [side, projects] of [['before', previous], ['after', current]]) {
    for (const project of projects) {
      const label = String(project[dimension] || 'Não informado').trim();
      if (!groups.has(label)) groups.set(label, { label, before: 0, after: 0, beforeCount: 0, afterCount: 0 });
      const group = groups.get(label);
      group[side] += cents(project[metric]);
      group[`${side}Count`] += 1;
    }
  }
  return [...groups.values()].map((group) => ({ ...group, before: group.before / 100, after: group.after / 100 }))
    .sort((a, b) => Math.abs(b.after - b.before) - Math.abs(a.after - a.before));
}
