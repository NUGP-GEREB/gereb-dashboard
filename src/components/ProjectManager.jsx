import { useMemo, useState } from "react";
import { createBlankProject, normalizeProjects } from "../data/projectCsv";
import { brl } from "../utils/formatters";

const pageSize = 10;

const textFields = [
  ["id", "Projeto ID"],
  ["title", "Título"],
  ["coordinator", "Coordenador Geral"],
  ["unit", "Coordenação"],
  ["process", "Nº do Processo"],
  ["instrumentType", "Tipo de Instrumento Contratual"],
  ["funder", "Parceiro"],
  ["tedCategory", "Categoria TEDs"],
  ["instrumentNumber", "Nº Instrumento Contratual"],
  ["nature", "Naturezas Projetos"],
  ["axis", "Eixo Mapa Estratégico Fiocruz"],
];

const moneyFields = [
  ["total", "Valor total"],
  ["released", "Liberado"],
  ["receivable", "A receber"],
  ["realized", "Realizado"],
  ["committed", "Comprometido"],
  ["currentBalance", "Saldo atual"],
];

function isSupportTed(value) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .includes("suporte");
}

export function ProjectManager({ projects, onChange, onBack, onReset }) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [draftOpen, setDraftOpen] = useState(false);
  const [draftProject, setDraftProject] = useState(() => createBlankProject(1));

  const updateProject = (index, key, value) => {
    const updated = projects.map((project, projectIndex) => {
      if (projectIndex !== index) return project;

      const next = {
        ...project,
        [key]: moneyFields.some(([field]) => field === key)
          ? Number(value)
          : value,
      };

      if (key === "released" || key === "receivable") {
        next.budgetBalance = Number(next.released || 0) + Number(next.receivable || 0);
      }

      if (key === "tedCategory") {
        next.supportTed = isSupportTed(value);
      }

      return next;
    });

    onChange(normalizeProjects(updated));
  };

  const openDraft = () => {
    const nextItem = Math.max(0, ...projects.map((project) => Number(project.item || 0))) + 1;
    setDraftProject(createBlankProject(nextItem));
    setDraftOpen(true);
  };

  const updateDraft = (key, value) => {
    setDraftProject((current) => {
      const next = {
        ...current,
        [key]: moneyFields.some(([field]) => field === key) ? Number(value) : value,
      };

      if (key === "released" || key === "receivable") {
        next.budgetBalance = Number(next.released || 0) + Number(next.receivable || 0);
      }

      if (key === "tedCategory") {
        next.supportTed = isSupportTed(value);
      }

      return next;
    });
  };

  const addProject = (event) => {
    event.preventDefault();
    onChange(normalizeProjects([...projects, draftProject]));
    setSearch("");
    setPage(Math.ceil((projects.length + 1) / pageSize));
    setDraftOpen(false);
  };

  const deleteProject = (index) => {
    onChange(normalizeProjects(projects.filter((_, projectIndex) => projectIndex !== index)));
  };

  const totalValue = projects.reduce((total, project) => total + Number(project.total || 0), 0);
  const filteredProjects = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return projects.map((project, index) => ({ project, index }));
    }

    return projects
      .map((project, index) => ({ project, index }))
      .filter(({ project }) =>
        [
          project.id,
          project.title,
          project.coordinator,
          project.unit,
          project.process,
          project.instrumentType,
          project.funder,
          project.tedCategory,
          project.instrumentNumber,
          project.nature,
          project.axis,
        ]
          .join(" ")
          .toLowerCase()
          .includes(query),
      );
  }, [projects, search]);
  const totalPages = Math.max(1, Math.ceil(filteredProjects.length / pageSize));
  const activePage = Math.min(page, totalPages);
  const visibleProjects = filteredProjects.slice(
    (activePage - 1) * pageSize,
    activePage * pageSize,
  );
  const pageStart = filteredProjects.length ? (activePage - 1) * pageSize + 1 : 0;
  const pageEnd = Math.min(activePage * pageSize, filteredProjects.length);

  return (
    <main className="finance-dashboard manager-page">
      <section className="manager-hero" aria-label="Tabela editável de projetos">
        <div>
          <span>BASE EDITÁVEL</span>
          <h1>Tabela de Projetos FIOTEC</h1>
          <p>{projects.length} projetos cadastrados. As alterações recalculam o dashboard automaticamente.</p>
        </div>
        <div className="manager-hero__actions">
          <button type="button" onClick={onBack}>
            Voltar
          </button>
          <button type="button" onClick={openDraft}>
            Adicionar
          </button>
          <button type="button" onClick={onReset}>
            Restaurar CSV
          </button>
          <button type="button" className="manager-filter-button">
            Filtros
          </button>
        </div>
      </section>

      <section className="manager-summary" aria-label="Resumo da tabela">
        <article>
          <span>Projetos</span>
          <strong>{projects.length}</strong>
        </article>
        <article>
          <span>Valor total</span>
          <strong>{brl.format(totalValue)}</strong>
        </article>
      </section>

      <section className="manager-toolbar" aria-label="Busca e controles da tabela">
        <label className="manager-search">
          <span aria-hidden="true" />
          <input
            type="search"
            placeholder="Buscar em todos os campos..."
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
        </label>
      </section>

      <section className="manager-table-panel">
        <div className="manager-table-wrap">
          <table className="manager-table">
            <thead>
              <tr>
                <th>Item</th>
                {textFields.map(([, label]) => (
                  <th key={label}>{label}</th>
                ))}
                <th>Data Início Vigência</th>
                <th>Data Fim Vigência</th>
                {moneyFields.map(([, label]) => (
                  <th key={label}>{label}</th>
                ))}
                <th>Excluir</th>
              </tr>
            </thead>
            <tbody>
              {visibleProjects.map(({ project, index }) => (
                <tr key={`${project.id}-${project.instrumentNumber}-${index}`}>
                  <td>{project.item}</td>
                  {textFields.map(([field, label]) => (
                    <td key={`${field}-${index}`}>
                      <input
                        aria-label={`${label} do projeto ${project.item}`}
                        value={project[field] ?? ""}
                        onChange={(event) => updateProject(index, field, event.target.value)}
                      />
                    </td>
                  ))}
                  <td>
                    <input
                      aria-label={`Início do projeto ${project.item}`}
                      type="date"
                      value={project.start ?? ""}
                      onChange={(event) => updateProject(index, "start", event.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      aria-label={`Fim do projeto ${project.item}`}
                      type="date"
                      value={project.end ?? ""}
                      onChange={(event) => updateProject(index, "end", event.target.value)}
                    />
                  </td>
                  {moneyFields.map(([field, label]) => (
                    <td key={`${field}-${index}`}>
                      <input
                        aria-label={`${label} do projeto ${project.item}`}
                        type="number"
                        step="0.01"
                        value={project[field] ?? 0}
                        onChange={(event) => updateProject(index, field, event.target.value)}
                      />
                    </td>
                  ))}
                  <td>
                    <button type="button" className="manager-delete" onClick={() => deleteProject(index)}>
                      Excluir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="manager-pager" aria-label="Paginação da tabela editável">
          <button type="button" onClick={() => setPage(1)} disabled={activePage === 1}>
            Primeira
          </button>
          <button type="button" onClick={() => setPage(activePage - 1)} disabled={activePage === 1}>
            Anterior
          </button>
          <span>
            {pageStart}-{pageEnd} de {filteredProjects.length}
          </span>
          <button type="button" onClick={() => setPage(activePage + 1)} disabled={activePage === totalPages}>
            Próxima
          </button>
          <button type="button" onClick={() => setPage(totalPages)} disabled={activePage === totalPages}>
            Última
          </button>
        </div>
      </section>
      {draftOpen ? (
        <div className="manager-modal" role="dialog" aria-modal="true" aria-labelledby="new-project-title">
          <form className="manager-modal__panel" onSubmit={addProject}>
            <div className="manager-modal__header">
              <div>
                <span>Novo registro</span>
                <h2 id="new-project-title">Adicionar projeto {draftProject.item}</h2>
              </div>
              <button type="button" onClick={() => setDraftOpen(false)} aria-label="Fechar popup">
                Fechar
              </button>
            </div>
            <div className="manager-modal__grid">
              {textFields.map(([field, label]) => (
                <label key={field}>
                  <span>{label}</span>
                  <input
                    value={draftProject[field] ?? ""}
                    onChange={(event) => updateDraft(field, event.target.value)}
                    required={field === "id" || field === "title" || field === "process"}
                  />
                </label>
              ))}
              <label>
                <span>Data Início Vigência</span>
                <input
                  type="date"
                  value={draftProject.start ?? ""}
                  onChange={(event) => updateDraft("start", event.target.value)}
                />
              </label>
              <label>
                <span>Data Fim Vigência</span>
                <input
                  type="date"
                  value={draftProject.end ?? ""}
                  onChange={(event) => updateDraft("end", event.target.value)}
                />
              </label>
              {moneyFields.map(([field, label]) => (
                <label key={field}>
                  <span>{label}</span>
                  <input
                    type="number"
                    step="0.01"
                    value={draftProject[field] ?? 0}
                    onChange={(event) => updateDraft(field, event.target.value)}
                  />
                </label>
              ))}
            </div>
            <div className="manager-modal__actions">
              <button type="button" onClick={() => setDraftOpen(false)}>
                Cancelar
              </button>
              <button type="submit">Salvar projeto</button>
            </div>
          </form>
        </div>
      ) : null}
    </main>
  );
}
