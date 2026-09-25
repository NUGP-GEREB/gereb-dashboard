import csvSource from "../../projetos_fiotec_dashboard.csv?raw";

function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"' && inQuotes && next === '"') {
      value += '"';
      index += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      row.push(value);
      value = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(value);
      if (row.some((cell) => cell.trim())) rows.push(row);
      row = [];
      value = "";
    } else {
      value += char;
    }
  }

  if (value || row.length) {
    row.push(value);
    rows.push(row);
  }

  return rows;
}

function toNumber(value) {
  if (typeof value === "number") return value;
  const raw = String(value ?? "").trim();
  const normalized = raw.includes(",")
    ? raw.replace(/\./g, "").replace(",", ".")
    : raw;

  return Number(normalized) || 0;
}

function toBooleanSupport(value) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .includes("suporte");
}

function rowToProject(row, headers, index) {
  const get = (key) => row[headers.indexOf(key)] ?? "";
  const released = toNumber(get("recurso_liberado"));
  const receivable = toNumber(get("recurso_a_receber"));

  return {
    item: toNumber(get("item")) || index + 1,
    id: get("projeto_id_fiotec").trim(),
    title: get("titulo_projeto").trim(),
    objective: get("objetivo_geral").trim(),
    coordinator: get("coordenador_geral").trim(),
    unit: get("coordenacao").trim(),
    process: get("numero_processo").trim(),
    instrumentType: get("tipo_instrumento_contratual").trim(),
    funder: get("parceiro").trim(),
    tedCategory: get("categoria_teds").trim(),
    instrumentNumber: get("numero_instrumento_contratual").trim(),
    nature: get("natureza_projeto").trim(),
    start: get("data_inicio_vigencia").trim(),
    end: get("data_fim_vigencia").trim(),
    axis: get("eixo_mapa_estrategico_fiocruz").trim(),
    total: toNumber(get("valor_total_projetos")),
    budgetBalance: released + receivable,
    released,
    receivable,
    realized: toNumber(get("total_realizado")),
    committed: toNumber(get("total_comprometido")),
    currentBalance: toNumber(get("saldo_total_atual")),
    earnings: 0,
    supportTed: toBooleanSupport(get("categoria_teds")),
  };
}

export function normalizeProjects(items) {
  return items.map((project, index) => ({
    ...project,
    item: index + 1,
    total: toNumber(project.total),
    budgetBalance:
      project.budgetBalance === undefined
        ? toNumber(project.released) + toNumber(project.receivable)
        : toNumber(project.budgetBalance),
    released: toNumber(project.released),
    receivable: toNumber(project.receivable),
    realized: toNumber(project.realized),
    committed: toNumber(project.committed),
    currentBalance: toNumber(project.currentBalance),
    earnings: toNumber(project.earnings),
    supportTed: Boolean(project.supportTed),
  }));
}

export function createBlankProject(nextItem) {
  return {
    item: nextItem,
    id: `NOVO-${String(nextItem).padStart(3, "0")}`,
    title: "Novo projeto",
    objective: "",
    coordinator: "",
    unit: "",
    process: "",
    instrumentType: "TED",
    funder: "",
    tedCategory: "",
    instrumentNumber: "",
    nature: "",
    start: new Date().toISOString().slice(0, 10),
    end: new Date().toISOString().slice(0, 10),
    axis: "",
    total: 0,
    budgetBalance: 0,
    released: 0,
    receivable: 0,
    realized: 0,
    committed: 0,
    currentBalance: 0,
    earnings: 0,
    supportTed: false,
  };
}

const rows = parseCsv(csvSource);
const headers = rows[0] ?? [];

export const csvProjects = normalizeProjects(
  rows.slice(1).map((row, index) => rowToProject(row, headers, index)),
);
