import { renderMath } from './canonical-math-renderer.js';
export function renderVariationTable(spec, container) {
  const wrap = document.createElement('div'); wrap.className = 'native-variation'; wrap.tabIndex = 0;
  const table = document.createElement('table'), caption = document.createElement('caption');
  caption.textContent = spec.description; table.append(caption);
  const head = document.createElement('thead'), header = document.createElement('tr');
  const first = document.createElement('th'); first.scope = 'col'; first.textContent = 'x'; header.append(first);
  for (const column of spec.columns) {
    const cell = document.createElement('th'); cell.scope = 'col'; cell.className = `native-variation__${column.kind}`;
    if (column.latex) renderMath(column.latex, cell);
    if (column.kind === 'excluded') cell.setAttribute('aria-label', `Điểm bị loại: ${column.latex}`);
    header.append(cell);
  }
  head.append(header); table.append(head);
  const body = document.createElement('tbody');
  for (const row of spec.rows) {
    const tr = document.createElement('tr'), label = document.createElement('th'); label.scope = 'row'; renderMath(row.label, label); tr.append(label);
    row.cells.forEach((value, index) => {
      const cell = document.createElement('td'); cell.className = `native-variation__${spec.columns[index].kind}`;
      if (value) renderMath(value, cell); tr.append(cell);
    }); body.append(tr);
  }
  table.append(body); wrap.append(table); container.append(wrap); return wrap;
}
