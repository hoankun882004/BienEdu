import { parseExpression, compileExpression } from './graph-expression.js';
import { validateMath } from './canonical-math.js';
export const GRAPH_SCHEMA = 'bienedu.graph.v1';
export const bound = (value) => value === '-inf' ? -Infinity : value === 'inf' ? Infinity : value;
const finite = (x) => typeof x === 'number' && Number.isFinite(x) && Math.abs(x) <= 1e9;
const text = (x) => typeof x === 'string' && x.length > 0 && x.length <= 2000;
const latex = (x) => text(x) && validateMath(x).valid;
export function validateGraphSpec(spec) {
  const errors = [], require = (ok, message) => { if (!ok) errors.push(message); };
  try {
    require(spec?.schemaVersion === GRAPH_SCHEMA, 'Unsupported graph schema');
    require(text(spec.id) && /^[\w.-]+$/u.test(spec.id), 'Invalid stable graph ID');
    require(text(spec.description), 'Text alternative required');
    require(text(spec.source?.sourceId) && text(spec.source?.recordId) && /^[A-F0-9]{64}$/u.test(spec.source?.sha256 ?? ''), 'Exact source identity required');
    require(Number.isInteger(spec.source?.page) && spec.source.page > 0, 'Source page required');
    require(['source-checked', 'technical-fixture'].includes(spec.verification?.status), 'Unverified graph');
    if (spec.type === 'variation-table' || spec.type === 'sign-table') {
      require(Array.isArray(spec.columns) && spec.columns.length >= 3 && spec.columns.length <= 25, 'Invalid table columns');
      require(Array.isArray(spec.rows) && spec.rows.length > 0 && spec.rows.length <= 4, 'Invalid table rows');
      for (const c of spec.columns) require(['point', 'interval', 'excluded'].includes(c.kind) && (c.latex === '' || latex(c.latex)), 'Invalid table boundary');
      for (const row of spec.rows) require(latex(row.label) && row.cells.length === spec.columns.length && row.cells.every((c) => c === '' || latex(c)), 'Invalid table cells');
    } else {
      require(spec.type === 'function-2d', 'Unsupported graph type');
      const v = spec.viewport;
      require(v && [v.xMin, v.xMax, v.yMin, v.yMax].every(finite) && v.xMin < v.xMax && v.yMin < v.yMax, 'Invalid viewport');
      require(Array.isArray(spec.branches) && spec.branches.length > 0 && spec.branches.length <= 16, 'Invalid branches');
      for (const b of spec.branches) {
        parseExpression(b.expression, spec.parameters ?? {});
        require(latex(b.latex), 'Invalid formula notation');
        require(Array.isArray(b.domain) && b.domain.length > 0 && b.domain.length <= 16, 'Domain intervals required');
        let previous = -Infinity;
        for (const i of b.domain) {
          require((finite(i.min) || i.min === '-inf') && (finite(i.max) || i.max === 'inf') && bound(i.min) < bound(i.max), 'Invalid domain bounds');
          require(typeof i.minIncluded === 'boolean' && typeof i.maxIncluded === 'boolean' && (finite(i.min) || !i.minIncluded) && (finite(i.max) || !i.maxIncluded), 'Invalid endpoint inclusion');
          require(bound(i.min) >= previous, 'Overlapping or unordered intervals'); previous = bound(i.max);
        }
        require(Array.isArray(b.exclusions) && b.exclusions.length <= 64 && b.exclusions.every(finite), 'Explicit exclusions required');
        require(!b.style || ((!b.style.color || /^#[0-9a-f]{6}$/iu.test(b.style.color)) && (!b.style.width || b.style.width >= 1 && b.style.width <= 5)), 'Invalid curve style');
      }
      require((spec.points ?? []).length <= 32 && (spec.asymptotes ?? []).length <= 16, 'Too many annotations');
      for (const p of spec.points ?? []) require(finite(p.x) && finite(p.y) && typeof p.closed === 'boolean' && (!p.label || latex(p.label)), 'Invalid special point');
      for (const a of spec.asymptotes ?? []) require(['vertical', 'horizontal', 'oblique'].includes(a.type) && (a.type === 'oblique' ? finite(a.slope) && finite(a.intercept) : finite(a.value)) && latex(a.label), 'Invalid asymptote');
    }
  } catch (error) { errors.push(error.message); }
  return { valid: errors.length === 0, errors };
}
export function domainContains(branch, x) {
  return !branch.exclusions.includes(x) && branch.domain.some((i) => (x > bound(i.min) || x === i.min && i.minIncluded) && (x < bound(i.max) || x === i.max && i.maxIncluded));
}
// Each exclusion creates a separate JSXGraph curve, including removable holes.
export function branchIntervals(branch) {
  return branch.domain.flatMap((i) => {
    const cuts = [...new Set(branch.exclusions)].filter((x) => x > bound(i.min) && x < bound(i.max)).sort((a, b) => a - b);
    const bounds = [i.min, ...cuts, i.max];
    return bounds.slice(1).map((max, n) => ({ min: bounds[n], max, minIncluded: n === 0 && i.minIncluded && !branch.exclusions.includes(i.min), maxIncluded: n === bounds.length - 2 && i.maxIncluded && !branch.exclusions.includes(i.max) }));
  });
}
export function branchFunction(branch, parameters) {
  const fn = compileExpression(branch.expression, parameters);
  return (x) => domainContains(branch, x) ? fn(x) : NaN;
}
