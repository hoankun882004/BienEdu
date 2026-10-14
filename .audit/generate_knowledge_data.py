"""Convert the audited crop manifest to the browser data module."""
from pathlib import Path
import json

root = Path(__file__).resolve().parents[1]
manifest = json.loads((root / ".audit/knowledge-slide-manifest.json").read_text(encoding="utf-8"))
payload = json.dumps(manifest, ensure_ascii=False, separators=(",", ":"))
module = f'''// Generated from .audit/knowledge-slide-manifest.json. Do not edit crop records by hand.
const rawSections = {payload};

export const knowledgeSections = Object.fromEntries(Object.entries(rawSections).map(([topicId, section]) => {{
  const knowledgeSlides = section.knowledgeSlides.map((slide, index) => ({{ ...slide, id: `${{topicId}}-knowledge-${{index + 1}}` }}));
  const exampleSlides = section.exampleSlides.map((slide, index) => ({{ ...slide, id: `${{topicId}}-example-${{index + 1}}` }}));
  return [topicId, {{
    sourceId: section.source,
    startsAt: section.startsAt,
    endsBefore: section.endsBefore,
    knowledgeSlides,
    exampleSlides,
    slides: knowledgeSlides
  }}];
}}));

export function getKnowledgeSection(sourceTopic) {{
  return knowledgeSections[sourceTopic] ?? null;
}}
'''
(root / "assets/js/data/knowledge-slides.js").write_text(module, encoding="utf-8")
print(f"Wrote {len(manifest)} sections")
