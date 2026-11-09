import { validateGraphSpec, branchIntervals, branchFunction, bound } from './graph-spec.js';
import { renderMath } from './canonical-math-renderer.js';
import { renderVariationTable } from './variation-table.js';
let library, sequence = 0;
const instances = new Map();
export function loadGraphLibrary() {
  // Vendored bytes from the already-installed, pinned package; never a CDN.
  return library ??= import('../../vendor/jsxgraph/jsxgraphcore.mjs').then((module) => module.default);
}
export function getGraphInstance(container) { return instances.get(container); }
export function disposeGraph(container) {
  const state = instances.get(container); if (!state) return;
  state.cancelled = true; state.observer?.disconnect();
  if (state.board) state.JXG.JSXGraph.freeBoard(state.board);
  instances.delete(container); container.replaceChildren(); delete container.dataset.nativeGraph;
}
export function disposeDetachedGraphs() { for (const container of instances.keys()) if (!container.isConnected) disposeGraph(container); }
export function activeGraphCount() { return instances.size; }
export async function mountGraph(spec, container, { learner = false } = {}) {
  const check = validateGraphSpec(spec);
  if (!check.valid) throw new Error(check.errors.join('; '));
  const signature = JSON.stringify([spec, learner]);
  if (instances.get(container)?.signature === signature) return instances.get(container).ready;
  disposeGraph(container);
  const state = { signature, cancelled: false, curves: [], spec }; instances.set(container, state);
  container.classList.add('native-graph'); container.dataset.nativeGraph = spec.id;
  const caption = document.createElement('p'); caption.className = 'native-graph__caption'; caption.textContent = spec.description;
  if (spec.type !== 'function-2d') { renderVariationTable(spec, container); state.ready = Promise.resolve(state); return state; }
  container.append(caption);
  // Recognition exercises must not disclose the equation or answer before solving.
  if (!learner) { const formula = document.createElement('div'); renderMath(spec.branches.map((b) => b.latex).join(String.raw`\quad `), formula); container.append(formula); }
  const controls = document.createElement('div'); controls.className = 'native-graph__controls'; controls.setAttribute('aria-label', 'Điều khiển đồ thị');
  const plot = document.createElement('div'); plot.id = `bienedu-graph-${++sequence}`; plot.className = 'native-graph__board'; plot.tabIndex = 0;
  plot.setAttribute('role', 'group'); plot.setAttribute('aria-label', `${spec.description}. Dấu cộng/trừ để thu phóng; phím mũi tên để di chuyển; Home để đặt lại.`);
  container.append(controls, plot);
  state.ready = (async () => {
    try {
      const JXG = await loadGraphLibrary(); if (state.cancelled) return null; state.JXG = JXG;
      const v = spec.viewport, box = [v.xMin, v.yMax, v.xMax, v.yMin];
      const board = JXG.JSXGraph.initBoard(plot.id, { boundingbox: box, axis: false, grid: false, keepaspectratio: !!v.equalUnits,
        showCopyright: false, showNavigation: false, renderer: 'svg', resize: { enabled: false },
        pan: { enabled: true, needShift: false, needTwoFingers: true }, zoom: { enabled: true, wheel: false, pinch: true }, keyboard: { enabled: false } });
      state.board = board;
      const axisStyle = { strokeColor: '#53657d', strokeWidth: 1, fixed: true, highlight: false, withLabel: false, margin: -24,
        ticks: { label: { fontSize: 12, display: 'internal' }, minTicksDistance: 55, minorTicks: 0, drawLabels: true, includeBoundaries: false } };
      board.create('axis', [[0, 0], [1, 0]], axisStyle); board.create('axis', [[0, 0], [0, 1]], axisStyle);
      // Axis names live outside the clipping viewport, not near a screen edge.
      const axes = document.createElement('small'); axes.className = 'native-graph__axes'; axes.textContent = `Trục ngang: ${spec.axes?.x ?? 'x'} · Trục dọc: ${spec.axes?.y ?? 'f(x)'}`; container.append(axes);
      for (const branch of spec.branches) for (const interval of branchIntervals(branch)) {
        const fn = branchFunction(branch, spec.parameters), epsilon = () => (board.getBoundingBox()[2] - board.getBoundingBox()[0]) * 1e-8;
        const start = () => Math.max(bound(interval.min) + (interval.minIncluded ? 0 : epsilon()), board.getBoundingBox()[0]);
        const end = () => Math.min(bound(interval.max) - (interval.maxIncluded ? 0 : epsilon()), board.getBoundingBox()[2]);
        const curve = board.create('functiongraph', [(x) => x >= start() && x <= end() ? fn(x) : NaN, start, end], { strokeColor: branch.style?.color ?? '#2e5ce6', strokeWidth: branch.style?.width ?? 2.5, highlight: false, numberPointsHigh: 400, numberPointsLow: 150 });
        state.curves.push({ curve, interval, expression: branch.expression });
      }
      for (const a of spec.asymptotes ?? []) {
        if (learner && !a.sourceDeclared) continue;
        const points = a.type === 'vertical' ? [[a.value, 0], [a.value, 1]] : a.type === 'horizontal' ? [[0, a.value], [1, a.value]] : [[0, a.intercept], [1, a.slope + a.intercept]];
        board.create('line', points, { dash: 2, strokeColor: '#9b7626', strokeWidth: 1.5, fixed: true, highlight: false });
      }
      for (const point of spec.points ?? []) if (!learner || point.sourceDeclared) board.create('point', [point.x, point.y], { name: '', withLabel: false, size: 3, strokeColor: '#214ba9', fillColor: point.closed ? '#214ba9' : '#ffffff', fixed: true, highlight: false });
      if (!learner && ((spec.points?.length ?? 0) + (spec.asymptotes?.length ?? 0))) {
        const legend = document.createElement('div'); legend.className = 'native-graph__legend';
        for (const item of [...(spec.points ?? []), ...(spec.asymptotes ?? [])]) if (item.label) { const label = document.createElement('span'); renderMath(item.label, label); legend.append(label); }
        container.append(legend);
      }
      const reset = () => board.setBoundingBox(box, !!v.equalUnits);
      const pan = (dx, dy) => { const b = board.getBoundingBox(), x = (b[2] - b[0]) * dx, y = (b[1] - b[3]) * dy; board.setBoundingBox([b[0] + x, b[1] + y, b[2] + x, b[3] + y], !!v.equalUnits); };
      for (const [label, action, name] of [['＋', () => board.zoomIn(), 'Phóng to'], ['−', () => board.zoomOut(), 'Thu nhỏ'], ['Đặt lại', reset, 'Đặt lại góc nhìn']]) {
        const button = document.createElement('button'); button.type = 'button'; button.textContent = label; button.setAttribute('aria-label', name); button.addEventListener('click', action); controls.append(button);
      }
      plot.addEventListener('keydown', (event) => {
        const actions = { '+': () => board.zoomIn(), '=': () => board.zoomIn(), '-': () => board.zoomOut(), Home: reset, ArrowLeft: () => pan(-.1, 0), ArrowRight: () => pan(.1, 0), ArrowUp: () => pan(0, .1), ArrowDown: () => pan(0, -.1) };
        if (actions[event.key]) { event.preventDefault(); event.stopPropagation(); actions[event.key](); }
      });
      state.observer = new ResizeObserver(() => { if (!state.cancelled && plot.clientWidth > 0) board.resizeContainer(plot.clientWidth, plot.clientHeight); }); state.observer.observe(plot);
      return state;
    } catch (error) { disposeGraph(container); throw error; }
  })();
  return state.ready;
}
export const renderGraph = mountGraph;
