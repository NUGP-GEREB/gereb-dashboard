import { Fragment, useMemo, useState } from 'react'
import { CardHelpButton } from './CardHelpButton'
import { brl, formatDateShort, lifecycleStatus, percent } from '../utils/formatters'

const pageSize = 12

function escapeXml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

function columnName(index) {
  let name = ''
  let value = index + 1

  while (value > 0) {
    const remainder = (value - 1) % 26
    name = String.fromCharCode(65 + remainder) + name
    value = Math.floor((value - 1) / 26)
  }

  return name
}

function crc32(bytes) {
  let crc = -1

  for (let index = 0; index < bytes.length; index += 1) {
    crc ^= bytes[index]
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1))
    }
  }

  return (crc ^ -1) >>> 0
}

function uint16(value) {
  return [value & 255, (value >>> 8) & 255]
}

function uint32(value) {
  return [value & 255, (value >>> 8) & 255, (value >>> 16) & 255, (value >>> 24) & 255]
}

function createZip(files) {
  const encoder = new TextEncoder()
  const chunks = []
  const centralDirectory = []
  let offset = 0

  files.forEach((file) => {
    const nameBytes = encoder.encode(file.name)
    const contentBytes = encoder.encode(file.content)
    const checksum = crc32(contentBytes)
    const localHeader = new Uint8Array([
      ...uint32(0x04034b50),
      ...uint16(20),
      ...uint16(0),
      ...uint16(0),
      ...uint16(0),
      ...uint16(0),
      ...uint32(checksum),
      ...uint32(contentBytes.length),
      ...uint32(contentBytes.length),
      ...uint16(nameBytes.length),
      ...uint16(0),
    ])

    chunks.push(localHeader, nameBytes, contentBytes)
    centralDirectory.push({ nameBytes, checksum, size: contentBytes.length, offset })
    offset += localHeader.length + nameBytes.length + contentBytes.length
  })

  const centralOffset = offset

  centralDirectory.forEach((file) => {
    const header = new Uint8Array([
      ...uint32(0x02014b50),
      ...uint16(20),
      ...uint16(20),
      ...uint16(0),
      ...uint16(0),
      ...uint16(0),
      ...uint16(0),
      ...uint32(file.checksum),
      ...uint32(file.size),
      ...uint32(file.size),
      ...uint16(file.nameBytes.length),
      ...uint16(0),
      ...uint16(0),
      ...uint16(0),
      ...uint16(0),
      ...uint32(0),
      ...uint32(file.offset),
    ])

    chunks.push(header, file.nameBytes)
    offset += header.length + file.nameBytes.length
  })

  const centralSize = offset - centralOffset
  chunks.push(
    new Uint8Array([
      ...uint32(0x06054b50),
      ...uint16(0),
      ...uint16(0),
      ...uint16(centralDirectory.length),
      ...uint16(centralDirectory.length),
      ...uint32(centralSize),
      ...uint32(centralOffset),
      ...uint16(0),
    ]),
  )

  return new Blob(chunks, {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}

function xlsxCell(value, rowIndex, columnIndex, style = 0, type = 'text') {
  const ref = `${columnName(columnIndex)}${rowIndex + 1}`

  if (type === 'number') {
    return `<c r="${ref}" s="${style}"><v>${Number(value || 0)}</v></c>`
  }

  return `<c r="${ref}" s="${style}" t="inlineStr"><is><t>${escapeXml(value)}</t></is></c>`
}

function makeWorksheet(rows) {
  const widths = [18, 48, 62, 28, 18, 22, 24, 34, 22, 28, 16, 16, 42, 18, 18, 18, 18, 18, 18, 18, 18, 14, 16, 14]
  const columnCount = Math.max(...rows.map((row) => row.length), 1)
  const columns = Array.from({ length: columnCount }, (_, index) => {
    const width = widths[index] ?? 18
    return `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`
  }).join('')
  const lastColumn = columnName(columnCount - 1)
  const xmlRows = rows
    .map((row, rowIndex) => {
      const isHeader = rowIndex === 0
      const style = isHeader ? 1 : rowIndex % 2 === 0 ? 3 : 2
      const height = isHeader ? 30 : 25
      const cells = row
        .map((cell, columnIndex) =>
          xlsxCell(
            cell.value,
            rowIndex,
            columnIndex,
            cell.style ?? style,
            cell.type ?? 'text',
          ),
        )
        .join('')

      return `<row r="${rowIndex + 1}" ht="${height}" customHeight="1">${cells}</row>`
    })
    .join('')

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
  <cols>${columns}</cols>
  <sheetData>${xmlRows}</sheetData>
  <autoFilter ref="A1:${lastColumn}${rows.length}"/>
</worksheet>`
}

function downloadXlsx(projects) {
  const headers = [
    'Projeto ID Fiotec',
    'Título do Projeto',
    'Objetivo Geral',
    'Coordenador Geral',
    'Coordenação',
    'Nº do Processo',
    'Tipo de Instrumento Contratual',
    'Ente Financiador',
    'Nº Instrumento Contratual',
    'Naturezas Projetos',
    'Data Início Vigência Projeto',
    'Data Fim Vigência Projeto',
    'Eixo Mapa Estratégico Fiocruz',
    'Valor Total Instrumento Contratual',
    'Saldo Orçamentário Atual',
    'Recurso Liberado',
    'Recurso a Receber',
    'Total Realizado',
    'Total Comprometido',
    'Saldo total Atual',
    'Rendimentos',
    'TED de Suporte',
    'Status',
    'Execução',
  ]

  const rows = projects.map((project) => {
    const execution = project.total ? project.realized / project.total : 0
    const status = lifecycleStatus(project)

    return [
      { value: project.id, style: 6 },
      { value: project.title },
      { value: project.objective },
      { value: project.coordinator },
      { value: project.unit, style: 5 },
      { value: project.process },
      { value: project.instrumentType },
      { value: project.funder },
      { value: project.instrumentNumber },
      { value: project.nature },
      { value: formatDateShort(project.start) },
      { value: formatDateShort(project.end) },
      { value: project.axis },
      { value: project.total, type: 'number', style: 4 },
      { value: project.budgetBalance, type: 'number', style: 4 },
      { value: project.released, type: 'number', style: 4 },
      { value: project.receivable, type: 'number', style: 4 },
      { value: project.realized, type: 'number', style: 4 },
      { value: project.committed, type: 'number', style: 4 },
      { value: project.currentBalance, type: 'number', style: 4 },
      { value: project.earnings, type: 'number', style: 4 },
      { value: project.supportTed ? 'Sim' : 'Não' },
      { value: status.label, style: status.tone === 'danger' ? 7 : status.tone === 'warning' ? 8 : 9 },
      { value: percent.format(execution), style: 10 },
    ]
  })

  const workbookRows = [headers.map((value) => ({ value })), ...rows]
  const worksheet = makeWorksheet(workbookRows)
  const blob = createZip([
    {
      name: '[Content_Types].xml',
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`,
    },
    {
      name: '_rels/.rels',
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`,
    },
    {
      name: 'xl/workbook.xml',
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets><sheet name="Base Projetos GEREB" sheetId="1" r:id="rId1"/></sheets>
</workbook>`,
    },
    {
      name: 'xl/_rels/workbook.xml.rels',
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`,
    },
    {
      name: 'xl/styles.xml',
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="2">
    <font><sz val="11"/><color rgb="FF20323A"/><name val="Aptos"/></font>
    <font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Aptos"/></font>
  </fonts>
  <fills count="9">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF0071AD"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFFFFFFF"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFEFF8FB"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFDFF3FB"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFF7D4D0"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFFDE6B9"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFD9F2EA"/></patternFill></fill>
  </fills>
  <borders count="2">
    <border><left/><right/><top/><bottom/><diagonal/></border>
    <border>
      <left style="thin"><color rgb="FFC3D5DD"/></left>
      <right style="thin"><color rgb="FFC3D5DD"/></right>
      <top style="thin"><color rgb="FFC3D5DD"/></top>
      <bottom style="thin"><color rgb="FFC3D5DD"/></bottom>
      <diagonal/>
    </border>
  </borders>
  <numFmts count="1"><numFmt numFmtId="164" formatCode="R$ #,##0.00"/></numFmts>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="11">
    <xf numFmtId="0" fontId="0" fillId="3" borderId="1" xfId="0" applyBorder="1"/>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="0" fillId="3" borderId="1" xfId="0" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center"/></xf>
    <xf numFmtId="0" fontId="0" fillId="4" borderId="1" xfId="0" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center"/></xf>
    <xf numFmtId="164" fontId="0" fillId="3" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
    <xf numFmtId="0" fontId="0" fillId="5" borderId="1" xfId="0" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="0" fillId="4" borderId="1" xfId="0" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="0" fillId="6" borderId="1" xfId="0" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="0" fillId="7" borderId="1" xfId="0" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="0" fillId="8" borderId="1" xfId="0" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="0" fillId="5" borderId="1" xfId="0" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
  </cellXfs>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`,
    },
    { name: 'xl/worksheets/sheet1.xml', content: worksheet },
  ])
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = `base-projetos-gereb-${new Date().toISOString().slice(0, 10)}.xlsx`
  document.body.append(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function projectKey(project) {
  return `${project.id}-${project.instrumentNumber}`
}

function projectDetails(project) {
  return [
    ['Objetivo geral', project.objective],
    ['Processo', project.process],
    ['Eixo estratégico', project.axis],
    ['Início da vigência', formatDateShort(project.start)],
    ['Fim da vigência', formatDateShort(project.end)],
    ['Saldo orçamentário', brl.format(project.budgetBalance)],
    ['Recurso a receber', brl.format(project.receivable)],
    ['Rendimentos', brl.format(project.earnings)],
  ]
}

export function ProjectTable({ projects }) {
  const [page, setPage] = useState(1)
  const [expandedProject, setExpandedProject] = useState(null)
  const totalPages = Math.max(1, Math.ceil(projects.length / pageSize))
  const activePage = Math.min(page, totalPages)

  const visibleProjects = useMemo(() => {
    const start = (activePage - 1) * pageSize
    return projects.slice(start, start + pageSize)
  }, [activePage, projects])

  const pageNumbers = useMemo(() => {
    const start = Math.max(1, Math.min(activePage - 2, totalPages - 4))
    const end = Math.min(totalPages, start + 4)

    return Array.from({ length: end - start + 1 }, (_, index) => start + index)
  }, [activePage, totalPages])

  const goToPage = (nextPage) => {
    setPage(Math.min(Math.max(nextPage, 1), totalPages))
    setExpandedProject(null)
  }

  const toggleProject = (project) => {
    const key = projectKey(project)
    setExpandedProject((current) => (current === key ? null : key))
  }

  return (
    <section className="panel table-panel">
      <CardHelpButton
        title="Base de Projetos GEREB"
        description="Tabela analítica com os projetos do recorte atual. Ela permite conferir os registros que alimentam os cards, rankings e gráficos do dashboard."
        detail="O botão exporta a mesma seleção filtrada para XLSX."
        value={`${projects.length} projetos filtrados`}
      />
      <div className="table-header">
        <div>
          <h2>Base de Projetos GEREB</h2>
          <p>Projetos filtrados com coordenação, ente financiador, vigência e execução financeira.</p>
        </div>
        <button
          className="export-button"
          type="button"
          onClick={() => downloadXlsx(projects)}
          disabled={!projects.length}
        >
          Exportar XLSX filtrado
        </button>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Título</th>
              <th>Valor total</th>
              <th>Liberado</th>
              <th>Realizado</th>
              <th>Comprometido</th>
              <th>Saldo atual</th>
              <th>Coordenação</th>
              <th>Coordenador / Ente financiador</th>
              <th>Projeto</th>
              <th>Instrumento</th>
              <th>Natureza</th>
              <th>TED suporte</th>
              <th>Vigência</th>
              <th>Status</th>
              <th>Detalhes</th>
            </tr>
          </thead>
          <tbody>
            {visibleProjects.map((project) => {
              const execution = project.total ? project.realized / project.total : 0
              const status = lifecycleStatus(project)
              const key = projectKey(project)
              const isExpanded = expandedProject === key

              return (
                <Fragment key={key}>
                  <tr>
                    <td className="description-cell">
                      <span>{project.title}</span>
                    </td>
                    <td className="money-cell">{brl.format(project.total)}</td>
                    <td className="money-cell">{brl.format(project.released)}</td>
                    <td className="money-cell">{brl.format(project.realized)}</td>
                    <td className="money-cell">{brl.format(project.committed)}</td>
                    <td className="money-cell">{brl.format(project.currentBalance)}</td>
                    <td>
                      <span className="area-pill">{project.unit}</span>
                    </td>
                    <td>
                      <strong>{project.coordinator}</strong>
                      <span>{project.funder}</span>
                    </td>
                    <td>
                      <strong>{project.id}</strong>
                      <span>{project.process}</span>
                    </td>
                    <td>
                      <strong>{project.instrumentType}</strong>
                      <span>{project.instrumentNumber}</span>
                    </td>
                    <td>{project.nature}</td>
                    <td>{project.supportTed ? 'Sim' : 'Não'}</td>
                    <td>
                      {formatDateShort(project.start)}
                      <span>{formatDateShort(project.end)}</span>
                    </td>
                    <td className="sr-cell">
                      <span className={'status status--' + status.tone}>{status.label}</span>
                      <small>{percent.format(execution)}</small>
                    </td>
                    <td>
                      <button
                        className="details-button"
                        type="button"
                        onClick={() => toggleProject(project)}
                        aria-expanded={isExpanded}
                      >
                        {isExpanded ? 'Ocultar' : 'Ver mais'}
                      </button>
                    </td>
                  </tr>
                  {isExpanded ? (
                    <tr className="project-detail-row">
                      <td colSpan={15}>
                        <div className="project-detail-grid">
                          {projectDetails(project).map(([label, value]) => (
                            <div className="project-detail-block" key={key + '-' + label}>
                              <span>{label}</span>
                              <strong>{value}</strong>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
      <div className="project-card-list" aria-label="Projetos em cards">
        {visibleProjects.map((project) => {
          const execution = project.total ? project.realized / project.total : 0
          const status = lifecycleStatus(project)
          const key = projectKey(project)
          const isExpanded = expandedProject === key

          return (
            <article className="project-card" key={project.id + '-card'}>
              <div className="project-card__heading">
                <strong>{project.id}</strong>
                <span className={'status status--' + status.tone}>{status.label}</span>
              </div>
              <h3>{project.title}</h3>
              <dl>
                <div>
                  <dt>Total</dt>
                  <dd>{brl.format(project.total)}</dd>
                </div>
                <div>
                  <dt>Realizado</dt>
                  <dd>{brl.format(project.realized)}</dd>
                </div>
                <div>
                  <dt>Saldo</dt>
                  <dd>{brl.format(project.currentBalance)}</dd>
                </div>
                <div>
                  <dt>Execução</dt>
                  <dd>{percent.format(execution)}</dd>
                </div>
              </dl>
              <p>{project.coordinator}</p>
              <small>{project.funder}</small>
              <button
                className="details-button project-card__button"
                type="button"
                onClick={() => toggleProject(project)}
                aria-expanded={isExpanded}
              >
                {isExpanded ? 'Ocultar' : 'Ver mais'}
              </button>
              {isExpanded ? (
                <div className="project-card__details">
                  {projectDetails(project).map(([label, value]) => (
                    <div key={key + '-card-' + label}>
                      <span>{label}</span>
                      <strong>{value}</strong>
                    </div>
                  ))}
                </div>
              ) : null}
            </article>
          )
        })}
      </div>
      <div className="pager" aria-label="Paginação da tabela">
        <button type="button" onClick={() => goToPage(1)} disabled={activePage === 1}>
          {'Primeira'}
        </button>
        <button type="button" onClick={() => goToPage(activePage - 1)} disabled={activePage === 1}>
          {'Anterior'}
        </button>
        {pageNumbers.map((pageNumber) => (
          <button
            type="button"
            key={pageNumber}
            className={pageNumber === activePage ? 'is-active' : ''}
            onClick={() => goToPage(pageNumber)}
          >
            {pageNumber}
          </button>
        ))}
        <button type="button" onClick={() => goToPage(activePage + 1)} disabled={activePage === totalPages}>
          {'Próxima'}
        </button>
        <button type="button" onClick={() => goToPage(totalPages)} disabled={activePage === totalPages}>
          {'Última'}
        </button>
        <span className="pager-summary">
          {projects.length ? (activePage - 1) * pageSize + 1 : 0}-{Math.min(activePage * pageSize, projects.length)} de{' '}
          {projects.length}
        </span>
      </div>
    </section>
  )
}
