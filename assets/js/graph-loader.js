import { graphActivation } from './data/graph-activation.js';
import { releaseBundle } from './data/learning-overlay.js';
const local = ['127.0.0.1', 'localhost', '[::1]'].includes(location.hostname);
if (document.querySelector('[data-graph-preview]')) {
  import('./graph-preview.js');
} else if (document.querySelector('[data-release-preview]')) {
  import('./release-preview.js');
} else if (local && releaseBundle) {
  import('./graph-learner.js').then(({ startGraphIntegration }) => startGraphIntegration({candidates:releaseBundle.graphs})).catch(() => {});
} else if (local && (new URL(location.href).searchParams.get('graphPreview') === 'v58' || graphActivation)) {
  // Local experiment only; no graph library or candidate download on ordinary pages.
  import('./graph-learner.js').then(({ startGraphIntegration }) => startGraphIntegration(graphActivation)).catch(() => {});
}
