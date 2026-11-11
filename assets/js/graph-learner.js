import { mountGraph, disposeGraph, disposeDetachedGraphs } from './components/graph-renderer.js';
let styles;
function addStyles() {
  if(document.querySelector('link[data-native-graph-style]')?.sheet)return Promise.resolve();
  return styles ??= new Promise((resolve, reject) => {
    const link = document.createElement('link'); link.rel = 'stylesheet'; link.href = 'assets/native-graphs.css?v=5.8'; link.dataset.nativeGraphStyle = '';
    link.onload = resolve; link.onerror = () => reject(new Error('Graph stylesheet unavailable')); document.head.append(link);
  });
}
export async function startGraphIntegration(activation) {
  const preview = new URL(location.href).searchParams.get('graphPreview') === 'v58';
  const url = preview ? '.audit/source-first-v5/graphs-v5.8/candidates.json' : activation?.bundle;
  if (!url && !activation?.candidates) return;
  let candidates=activation?.candidates;
  if(!candidates){const response=await fetch(url);if(!response.ok)throw new Error('Graph preview unavailable');const payload=await response.json();candidates=Array.isArray(payload)?payload:payload.graphs;}
  const root = document.querySelector('[data-curriculum-app]'); if (!root) return;
  const pending = new WeakSet();
  async function refresh() {
    disposeDetachedGraphs();
    const route = new URL(location.href).searchParams;
    // Only the source-mapped example route. Never replace a knowledge/practice figure.
    if (route.get('section') !== 'example' || route.get('grade') !== '12') return;
    const candidate = candidates.find((c) => c.target.code === route.get('type') && c.target.topic === route.get('topic') && c.target.item === Number(route.get('item') ?? 1));
    if (!candidate || candidate.spec.verification.status !== 'source-checked') return;
    for (const image of root.querySelectorAll('.example-reader__figures img')) {
      if (new URL(image.src).pathname !== '/' + candidate.target.assetPath) continue;
      const figure = image.closest('figure'); if (pending.has(figure)) continue; pending.add(figure);
      const container = document.createElement('div'); container.dataset.graphRecord = candidate.target.recordId;
      // Hide the image only AFTER a successful mount, with recovery on failure.
      figure.append(container);
      try {
        await addStyles();
        await mountGraph(candidate.spec, container, { learner: true });
        if (!figure.isConnected) { disposeGraph(container); continue; }
        for (const child of [...figure.children]) if (child !== container) child.hidden = true;
        figure.dataset.graphReplacement = candidate.spec.id;
      } catch (error) {
        disposeGraph(container); container.remove(); figure.dataset.graphError = error.message;
        // Keep the existing educational figure visible if the engine cannot mount.
      }
    }
  }
  // Narrow lifecycle observer: only learner subtree child replacements. No math scans.
  let queued = false;
  const observer = new MutationObserver((changes) => {
    if (changes.every((change) => change.target.closest?.('.native-graph'))) return;
    if (!queued) { queued = true; queueMicrotask(() => { queued = false; refresh(); }); }
  });
  observer.observe(root, { childList: true, subtree: true }); await refresh();
  addEventListener('pagehide', (event) => {
    // A bfcache page is suspended, not destroyed; retain its mounted content.
    if (event.persisted) return;
    observer.disconnect(); root.querySelectorAll('[data-native-graph]').forEach(disposeGraph);
  });
}
