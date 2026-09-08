import { useMemo, useState } from "react";
import { AxisOverview } from "./components/AxisOverview";
import { BarList } from "./components/BarList";
import { ColumnChart } from "./components/ColumnChart";
import { DonutChart } from "./components/DonutChart";
import { MetricCard } from "./components/MetricCard";
import { ProjectManager } from "./components/ProjectManager";
import { ProjectTable } from "./components/ProjectTable";
import { ResourceDistribution } from "./components/ResourceDistribution";
import fiocruzLogo from "./assets/marca-300x200_1.jpg";
import { csvProjects, normalizeProjects } from "./data/projectCsv";
import {
  brl,
  groupBySum,
  percent,
  sumBy,
} from "./utils/formatters";
import "./styles/dashboard.css";

const allOption = "Todos";
const supportOptions = [allOption, "Sim", "Não"];
const ministryOfHealth = "MINISTÉRIO DA SAÚDE";
const storageKey = "gereb-projects-editable-v4";
const oldStorageKeys = [
  "gereb-projects-editable-v1",
  "gereb-projects-editable-v2",
  "gereb-projects-editable-v3",
];
const fullBrl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const optionList = (values) => [
  allOption,
  ...new Set(
    values
      .filter(Boolean)
      .map((value) => String(value).trim())
      .sort((a, b) => a.localeCompare(b, "pt-BR")),
  ),
];

function groupFinancials(items, groupKey) {
  const groups = new Map();

  items.forEach((project) => {
    const label = project[groupKey] || "Não informado";
    const current = groups.get(label) || {
      label,
      value: 0,
      detailValue: 0,
      committedValue: 0,
      balanceValue: 0,
      count: 0,
    };

    current.value += Number(project.total || 0);
    current.detailValue += Number(project.realized || 0);
    current.committedValue += Number(project.committed || 0);
    current.balanceValue += Number(project.currentBalance || 0);
    current.count += 1;
    groups.set(label, current);
  });

  return [...groups.values()]
    .sort((a, b) => b.value - a.value)
    .map((item) => ({
      ...item,
      detailLabel: "Realizado",
      meta: `${percent.format(item.value ? item.detailValue / item.value : 0)} executado`,
    }));
}

const instrumentOrder = [
  "CONVÊNIO PD&I",
  "TED",
  "EMENDA PARLAMENTAR",
  "LOA",
  "CARTA ACORDO",
  "DISPENSA DE TED",
];

const instrumentColors = {
  "CONVÊNIO PD&I": "#124986",
  TED: "#2EA6A1",
  "EMENDA PARLAMENTAR": "#77C6CC",
  LOA: "#8DA0B4",
  "CARTA ACORDO": "#1B2D4A",
  "DISPENSA DE TED": "#0F4C8A",
};

function normalizeInstrumentType(value) {
  if (value === "EMENDAS") return "EMENDA PARLAMENTAR";
  return value || "Não informado";
}

const isTedProject = (project) =>
  normalizeInstrumentType(project.instrumentType) === "TED";

function getTedCategory(project) {
  if (project.supportTed) return "TED de suporte";
  if (project.funder === ministryOfHealth) return "TED MS";
  return "TEDs outros órgãos";
}

function getTedYear(project) {
  return (
    String(project.instrumentNumber || "").match(/\/(\d{4})(?:\D|$)/)?.[1] ||
    String(project.start || "").slice(0, 4)
  );
}

const tedFilterKeys = ["tedCategory", "ted", "tedYear", "tedFunder", "tedSupport"];

function groupInstrumentTypes(items) {
  const groups = new Map();

  items.forEach((project) => {
    const label = normalizeInstrumentType(project.instrumentType);
    const current = groups.get(label) || {
      label,
      value: 0,
      detailValue: 0,
      detailTotalValue: 0,
      detailLabel: "Total",
      color: instrumentColors[label],
    };

    current.value += 1;
    current.detailValue += Number(project.total || 0);
    current.detailTotalValue += Number(project.total || 0);
    groups.set(label, current);
  });

  const knownGroups = instrumentOrder
    .map((label) => groups.get(label))
    .filter(Boolean);
  const remainingGroups = [...groups.values()]
    .filter((item) => !instrumentOrder.includes(item.label))
    .sort((a, b) => b.value - a.value);

  return [...knownGroups, ...remainingGroups];
}

function groupCoordinationFinancials(items) {
  const groups = new Map();

  items.forEach((project) => {
    const label = project.unit || "N\u00e3o informado";
    const current = groups.get(label) || {
      label,
      values: [0, 0, 0],
    };

    current.values[0] += Number(project.realized || 0);
    current.values[1] += Number(project.committed || 0);
    current.values[2] += Number(project.currentBalance || 0);
    groups.set(label, current);
  });

  return [...groups.values()].sort((a, b) => b.values[0] - a.values[0]);
}

function groupTedResources(items) {
  const tedProjects = items.filter(isTedProject);

  return [
    {
      label: "TED MS",
      value: sumBy(
        tedProjects.filter(
          (project) => project.funder === ministryOfHealth && !project.supportTed,
        ),
        "total",
      ),
      color: "#2EA6A1",
    },
    {
      label: "TED de SUPORTE",
      value: sumBy(
        tedProjects.filter((project) => project.supportTed),
        "total",
      ),
      color: "#124986",
    },
    {
      label: "TEDs outros \u00d3rg\u00e3os",
      value: sumBy(
        tedProjects.filter(
          (project) => project.funder !== ministryOfHealth && !project.supportTed,
        ),
        "total",
      ),
      color: "#77C6CC",
    },
  ];
}

function loadProjects() {
  try {
    const saved = window.localStorage.getItem(storageKey);
    return saved ? normalizeProjects(JSON.parse(saved)) : csvProjects;
  } catch {
    return csvProjects;
  }
}

const tedCategoryOptions = [
  allOption,
  "TED MS",
  "TED de suporte",
  "TEDs outros órgãos",
];

function App() {
  const [projects, setProjects] = useState(loadProjects);
  const [managerOpen, setManagerOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState({
    project: allOption,
    tedCategory: allOption,
    ted: allOption,
    tedYear: allOption,
    tedFunder: allOption,
    tedSupport: allOption,
    modality: allOption,
    funder: allOption,
    nature: allOption,
    axis: allOption,
    supportTed: allOption,
    instrumentNumber: allOption,
    start: "",
    end: "",
  });

  const updateFilter = (key, value) =>
    setFilters((current) => ({ ...current, [key]: value }));

  const updateProjects = (nextProjects) => {
    const normalized = normalizeProjects(nextProjects);
    setProjects(normalized);
    window.localStorage.setItem(storageKey, JSON.stringify(normalized));
  };

  const resetProjects = () => {
    setProjects(csvProjects);
    window.localStorage.removeItem(storageKey);
    oldStorageKeys.forEach((key) => window.localStorage.removeItem(key));
  };

  const projectOptions = useMemo(
    () => [allOption, ...projects.map((project) => project.id)],
    [projects],
  );
  const modalityOptions = useMemo(
    () =>
      optionList(
        projects.map((project) => normalizeInstrumentType(project.instrumentType)),
      ),
    [projects],
  );
  const funderOptions = useMemo(
    () => optionList(projects.map((project) => project.funder)),
    [projects],
  );
  const natureOptions = useMemo(
    () => optionList(projects.map((project) => project.nature)),
    [projects],
  );
  const axisOptions = useMemo(
    () => optionList(projects.map((project) => project.axis)),
    [projects],
  );
  const instrumentOptions = useMemo(
    () => optionList(projects.map((project) => project.instrumentNumber)),
    [projects],
  );

  const allTedProjects = useMemo(
    () => projects.filter(isTedProject),
    [projects],
  );
  const tedOptions = useMemo(
    () => optionList(allTedProjects.map((project) => project.instrumentNumber)),
    [allTedProjects],
  );
  const tedYearOptions = useMemo(
    () => optionList(allTedProjects.map(getTedYear)),
    [allTedProjects],
  );
  const tedFunderOptions = useMemo(
    () => optionList(allTedProjects.map((project) => project.funder)),
    [allTedProjects],
  );
  const allTedCount = allTedProjects.length;

  const updateTedFilter = (key, value) =>
    setFilters((current) => ({
      ...current,
      project: allOption,
      modality: allOption,
      instrumentNumber: allOption,
      ...(key === "tedFunder" ? { funder: allOption } : {}),
      ...(key === "tedSupport" ? { supportTed: allOption } : {}),
      [key]: value,
    }));

  const clearTedFilters = () =>
    setFilters((current) => ({
      ...current,
      tedCategory: allOption,
      ted: allOption,
      tedYear: allOption,
      tedFunder: allOption,
      tedSupport: allOption,
    }));

  const filteredProjects = useMemo(
    () =>
      projects.filter((project) => {
        const matchesProject =
          filters.project === allOption || project.id === filters.project;
        const hasTedFilters = tedFilterKeys.some(
          (key) => filters[key] && filters[key] !== allOption,
        );
        const matchesTedFilters =
          !hasTedFilters ||
          (isTedProject(project) &&
            (filters.tedCategory === allOption ||
              getTedCategory(project) === filters.tedCategory) &&
            (filters.ted === allOption ||
              project.instrumentNumber === filters.ted) &&
            (filters.tedYear === allOption ||
              getTedYear(project) === filters.tedYear) &&
            (filters.tedFunder === allOption ||
              project.funder === filters.tedFunder) &&
            (filters.tedSupport === allOption ||
              (filters.tedSupport === "Sim") === project.supportTed));
        const matchesModality =
          filters.modality === allOption ||
          normalizeInstrumentType(project.instrumentType) === filters.modality;
        const matchesFunder =
          filters.funder === allOption || project.funder === filters.funder;
        const matchesNature =
          filters.nature === allOption || project.nature === filters.nature;
        const matchesAxis =
          filters.axis === allOption || project.axis === filters.axis;
        const matchesSupport =
          filters.supportTed === allOption ||
          (filters.supportTed === "Sim") === project.supportTed;
        const matchesInstrument =
          filters.instrumentNumber === allOption ||
          project.instrumentNumber === filters.instrumentNumber;
        const matchesStart = !filters.start || project.start >= filters.start;
        const matchesEnd = !filters.end || project.end <= filters.end;

        return (
          matchesProject &&
          matchesTedFilters &&
          matchesModality &&
          matchesFunder &&
          matchesNature &&
          matchesAxis &&
          matchesSupport &&
          matchesInstrument &&
          matchesStart &&
          matchesEnd
        );
      }),
    [filters, projects],
  );

  const totals = useMemo(
    () => {
      const today = new Date();
      const supportTedCount = filteredProjects.filter(
        (project) => project.supportTed,
      ).length;
      const closed = filteredProjects.filter((project) => {
        const end = new Date(`${project.end}T12:00:00`);
        return !Number.isNaN(end.getTime()) && end < today;
      }).length;

      return {
        projects: filteredProjects.length,
        total: sumBy(filteredProjects, "total"),
        budgetBalance: sumBy(filteredProjects, "budgetBalance"),
        released: sumBy(filteredProjects, "released"),
        receivable: sumBy(filteredProjects, "receivable"),
        realized: sumBy(filteredProjects, "realized"),
        committed: sumBy(filteredProjects, "committed"),
        balance: sumBy(filteredProjects, "currentBalance"),
        supportTedCount,
        closed,
        active: filteredProjects.length - closed,
        expiring: filteredProjects.filter((project) => {
          const end = new Date(`${project.end}T12:00:00`);
          if (Number.isNaN(end.getTime())) return false;

          const days = Math.ceil((end.getTime() - today.getTime()) / 86400000);
          return days >= 0 && days <= 180;
        }).length,
        negativeBalance: filteredProjects.filter(
          (project) => Number(project.currentBalance || 0) < 0,
        ).length,
      };
    },
    [filteredProjects],
  );

  const activeFilterCount = Object.values(filters).filter(
    (value) => value && value !== allOption,
  ).length;
  const filterKey = JSON.stringify(filters);
  const projectCountLabel = activeFilterCount
    ? `${filteredProjects.length} projetos no recorte`
    : `${projects.length} projetos monitorados`;
  const activeTedFilterCount = tedFilterKeys.filter(
    (key) => filters[key] && filters[key] !== allOption,
  ).length;

  const tedProjectsInScope = useMemo(
    () => filteredProjects.filter(isTedProject),
    [filteredProjects],
  );

  const tedTotals = useMemo(
    () => ({
      tedCount: tedProjectsInScope.length,
      projects: tedProjectsInScope.length,
      total: sumBy(tedProjectsInScope, "total"),
      realized: sumBy(tedProjectsInScope, "realized"),
      balance: sumBy(tedProjectsInScope, "currentBalance"),
    }),
    [tedProjectsInScope],
  );

  const selectedTed = filters.ted !== allOption;
  const hasTedFilter = activeTedFilterCount > 0;
  const tedCountLabel = selectedTed
    ? `TED ${filters.ted}`
    : activeFilterCount
      ? `${tedTotals.tedCount} TEDs no recorte`
      : `${allTedCount} TEDs monitorados`;

  const topRealizedProjects = useMemo(
    () =>
      [...filteredProjects]
        .sort((a, b) => b.realized - a.realized)
        .map((project) => ({ label: project.id, value: project.realized })),
    [filteredProjects],
  );

  const topTotalProjects = useMemo(
    () =>
      [...filteredProjects]
        .sort((a, b) => b.total - a.total)
        .map((project) => ({ label: project.id, value: project.total })),
    [filteredProjects],
  );

  const instrumentItems = useMemo(
    () => groupInstrumentTypes(filteredProjects),
    [filteredProjects],
  );

  const natureItems = useMemo(
    () => groupFinancials(filteredProjects, "nature"),
    [filteredProjects],
  );

  const funderItems = useMemo(
    () => groupBySum(filteredProjects, "funder", "total"),
    [filteredProjects],
  );

  const axisItems = useMemo(
    () => groupFinancials(filteredProjects, "axis"),
    [filteredProjects],
  );

  const coordinationGroups = useMemo(
    () => groupCoordinationFinancials(filteredProjects),
    [filteredProjects],
  );

  const resourceItems = useMemo(
    () => groupTedResources(filteredProjects),
    [filteredProjects],
  );

  const dashboardCards = [
    {
      label: "Projetos Vigentes",
      value: totals.projects,
      tone: "neutral",
      icon: "grid",
      info: "Projetos da base que entram no recorte atual.",
    },
    {
      label: "TED de Suporte",
      value: totals.supportTedCount,
      tone: "blue",
      icon: "trend",
      info: "Projetos marcados como Sim em TED de Suporte.",
    },
    {
      label: "Valor Total dos Instrumentos",
      value: fullBrl.format(totals.total),
      tone: "green",
      icon: "money",
      info: "Soma da coluna Valor Total Instrumento Contratual.",
    },
    {
      label: "Recurso Liberado",
      value: fullBrl.format(totals.released),
      tone: "teal",
      icon: "down",
      info: "Total que ja foi disponibilizado para os projetos.",
    },
    {
      label: "Recurso a Receber",
      value: fullBrl.format(totals.receivable),
      tone: "indigo",
      icon: "up",
      info: "Valor previsto que ainda nao foi liberado.",
    },
    {
      label: "Total Realizado",
      value: fullBrl.format(totals.realized),
      tone: "cyan",
      icon: "wallet",
      info: "Soma executada ou gasta pelos projetos.",
    },
    {
      label: "Total Comprometido",
      value: fullBrl.format(totals.committed),
      tone: "violet",
      icon: "piggy",
      info: "Compromissos registrados, ainda nao necessariamente pagos.",
    },
    {
      label: "Saldo Total Atual",
      value: fullBrl.format(totals.balance),
      tone: "rose",
      icon: "arrow",
      info: "Saldo financeiro atual informado na base.",
    },
  ];

  const resetFilters = () =>
    setFilters({
      project: allOption,
      tedCategory: allOption,
      ted: allOption,
      tedYear: allOption,
      tedFunder: allOption,
      tedSupport: allOption,
      modality: allOption,
      funder: allOption,
      nature: allOption,
      axis: allOption,
      supportTed: allOption,
      instrumentNumber: allOption,
      start: "",
      end: "",
    });

  if (managerOpen) {
    return (
      <ProjectManager
        projects={projects}
        onChange={updateProjects}
        onBack={() => setManagerOpen(false)}
        onReset={resetProjects}
      />
    );
  }

  return (
    <main className="finance-dashboard">
      <section className="page-header" aria-label="Cabeçalho do Painel de Projetos GEREB">
        <div className="page-header__main">
          <div className="page-brand">
            <img src={fiocruzLogo} alt="Fiocruz Brasília" />
          </div>
          <div className="page-title-block">
            <span>Fiocruz Brasília</span>
            <h1>Painel de Projetos GEREB</h1>
          </div>
          <div className="page-status" aria-label="Atualização do painel">
            <span>Situação em junho/2026</span>
            <strong>{projectCountLabel}</strong>
          </div>
        </div>
      </section>

      <section className="filter-shell" aria-label="Filtros da base GEREB">
        <div className="filter-summary">
          <div>
            <strong>Filtros</strong>
            <span>
              {activeFilterCount
                ? `${activeFilterCount} filtro${activeFilterCount > 1 ? "s" : ""} ativo${activeFilterCount > 1 ? "s" : ""}`
                : "Nenhum filtro ativo"}
            </span>
          </div>
          <button
            type="button"
            className="filter-toggle"
            aria-expanded={filtersOpen}
            onClick={() => setFiltersOpen((current) => !current)}
          >
            {filtersOpen ? "Ocultar" : "Mostrar"}
          </button>
        </div>
        <div className={filtersOpen ? "filter-panel is-open" : "filter-panel"}>
        <FilterSelect
          label="Projeto"
          value={filters.project}
          onChange={(value) => updateFilter("project", value)}
          options={projectOptions}
        />
        <FilterSelect
          label="Instrumento"
          value={filters.modality}
          onChange={(value) => updateFilter("modality", value)}
          options={modalityOptions}
        />
        <FilterSelect
          label="Ente financiador"
          value={filters.funder}
          onChange={(value) => updateFilter("funder", value)}
          options={funderOptions}
        />
        <FilterSelect
          label="Natureza"
          value={filters.nature}
          onChange={(value) => updateFilter("nature", value)}
          options={natureOptions}
        />
        <FilterSelect
          label="Eixo estratégico"
          value={filters.axis}
          onChange={(value) => updateFilter("axis", value)}
          options={axisOptions}
        />
        <FilterSelect
          label="Nº instrumento"
          value={filters.instrumentNumber}
          onChange={(value) => updateFilter("instrumentNumber", value)}
          options={instrumentOptions}
        />
        <FilterSelect
          label="TED suporte"
          value={filters.supportTed}
          onChange={(value) => updateFilter("supportTed", value)}
          options={supportOptions}
        />
        <label className="filter-control">
          <span>Início vigência</span>
          <input
            type="date"
            value={filters.start}
            onChange={(event) => updateFilter("start", event.target.value)}
          />
        </label>
        <label className="filter-control">
          <span>Fim vigência</span>
          <input
            type="date"
            value={filters.end}
            onChange={(event) => updateFilter("end", event.target.value)}
          />
        </label>
        <div className="filter-actions">
          <button type="button" onClick={() => setFiltersOpen(false)}>
            Aplicar
          </button>
          <button type="button" onClick={resetFilters}>
            Limpar
          </button>
        </div>
        </div>
      </section>

      <section className="dashboard-summary" aria-label="Resumo da carteira">
        {dashboardCards.map((card) => (
          <MetricCard
            key={card.label}
            label={card.label}
            value={card.value}
            info={card.info}
            tone={card.tone}
            icon={card.icon}
            format="text"
          />
        ))}
      </section>
      <section className="dashboard-grid">
        <ResourceDistribution items={resourceItems} />
        <DonutChart
          title="Tipos de Instrumentos"
          info="Mostra a distribuição dos projetos por tipo de instrumento contratual."
          items={instrumentItems}
          detailTitle="Detalhamento"
          showDetailCount
          showDetailFacts={false}
          showDetailTotal
          valueType="count"
        />
      </section>

      <ColumnChart
        title="Realizado, Comprometido e Saldo por Coordenação"
        subtitle="Concentração financeira das coordenações com maior execução"
        info="Compara as coordenações com maior execução para mostrar onde estão concentrados os valores realizados, os compromissos assumidos e os saldos disponíveis."
        groups={coordinationGroups}
      />

      <section className="charts-row">
        <BarList
          title="Projetos por Total Realizado"
          subtitle="Ranking de execução financeira"
          info="Lista os projetos com maior total realizado. Serve para identificar quais projetos mais executaram recursos dentro do filtro selecionado."
          items={topRealizedProjects}
          limit={10}
          expandable
          wideLabels
          fullValues
        />
        <BarList
          title="Projetos por Valor Contratado"
          subtitle="Ranking do valor total do instrumento"
          info="Lista os maiores projetos pelo valor total contratado. Ajuda a separar porte contratual de execução financeira."
          items={topTotalProjects}
          limit={10}
          expandable
          wideLabels
          fullValues
        />
      </section>

      <section className="dashboard-grid dashboard-grid--support">
        <BarList
          title="Ente Financiador"
          subtitle="Valor total contratado por financiador"
          info="Mostra quais entes financiadores concentram o maior valor contratado na carteira filtrada."
          items={funderItems}
          limit={15}
          expandable
          wideLabels
          fullValues
        />
        <DonutChart
          title="Naturezas dos Projetos"
          subtitle="Valor total contratado por natureza"
          info="Mostra como o valor contratado se divide por natureza do projeto, como ensino, pesquisa, extensão e desenvolvimento institucional."
          items={natureItems}
          detailTitle="Detalhamento"
          showDetailCount
          showDetailFacts={false}
          showDetailTotal
        />
      </section>

      <section className="dashboard-grid dashboard-grid--support dashboard-grid--single">
        <AxisOverview
          title="Eixo Mapa Estratégico Fiocruz"
          items={axisItems}
          limit={6}
        />
      </section>

      <ProjectTable key={filterKey} projects={filteredProjects} />

      <section className="project-consultation" aria-label="Consulta de TEDs">
        <div className="project-consultation__heading">
          <div>
            <h2>Consulta de TEDs</h2>
          </div>
          <strong>
            {tedCountLabel}
          </strong>
        </div>
        <div className="project-consultation__controls">
          <label className="project-consultation__field">
            <span>Categoria TED</span>
            <select
              value={filters.tedCategory}
              onChange={(event) => updateTedFilter("tedCategory", event.target.value)}
            >
              {tedCategoryOptions.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>
          <label className="project-consultation__field">
            <span>Nº do TED</span>
            <select
              value={filters.ted}
              onChange={(event) => updateTedFilter("ted", event.target.value)}
            >
              {tedOptions.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>
          <label className="project-consultation__field">
            <span>Ano do TED</span>
            <select
              value={filters.tedYear}
              onChange={(event) => updateTedFilter("tedYear", event.target.value)}
            >
              {tedYearOptions.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>
          <label className="project-consultation__field">
            <span>Órgão concedente</span>
            <select
              value={filters.tedFunder}
              onChange={(event) => updateTedFilter("tedFunder", event.target.value)}
            >
              {tedFunderOptions.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>
          <label className="project-consultation__field">
            <span>TED suporte</span>
            <select
              value={filters.tedSupport}
              onChange={(event) => updateTedFilter("tedSupport", event.target.value)}
            >
              {supportOptions.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={clearTedFilters}
            disabled={!hasTedFilter}
          >
            Limpar consulta
          </button>
        </div>
        <div className="project-consultation__result">
          <article>
            <span>{hasTedFilter ? "Filtro de TED ativo" : "Recorte atual"}</span>
            <strong>
              {selectedTed
                ? `TED ${filters.ted}`
                : hasTedFilter
                  ? `${activeTedFilterCount} filtro${activeTedFilterCount === 1 ? "" : "s"} aplicado${activeTedFilterCount === 1 ? "" : "s"}`
                  : "Todos os TEDs"}
            </strong>
          </article>
          <div className="project-consultation__facts">
            <div>
              <span>{selectedTed ? "Projetos vinculados" : "TEDs no recorte"}</span>
              <strong>
                {selectedTed
                  ? `${tedTotals.projects} projeto${tedTotals.projects === 1 ? "" : "s"}`
                  : tedCountLabel}
              </strong>
            </div>
            <div>
              <span>Valor total</span>
              <strong>{brl.format(tedTotals.total)}</strong>
            </div>
            <div>
              <span>Realizado</span>
              <strong>{brl.format(tedTotals.realized)}</strong>
            </div>
            <div>
              <span>Saldo atual</span>
              <strong>{brl.format(tedTotals.balance)}</strong>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function FilterSelect({ label, value, onChange, options }) {
  return (
    <label className="filter-control">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

export default App;
