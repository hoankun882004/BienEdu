import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const input = resolve(process.argv[2] ?? ".audit/embedded-script-1.js");
const output = resolve(process.argv[3] ?? ".audit/catalog-summary.json");
const source = readFileSync(input, "utf8");
const marker = "window.BIEN_STUDENT_REVIEW=";
const start = source.indexOf(marker);
if (start < 0) throw new Error("Catalog assignment not found.");

const payload = source.slice(start + marker.length).trim().replace(/;$/, "");
const review = JSON.parse(payload);
const catalog = review.catalog;

const summary = {
  counts: Object.fromEntries(
    Object.entries(catalog).map(([key, value]) => [key, Array.isArray(value) ? value.length : typeof value]),
  ),
  topics: catalog.topics,
  resources: catalog.resources ?? catalog.documents ?? [],
  sessions: catalog.sessions,
  exams: catalog.exams,
  questions: catalog.questions.map((question) => ({
    id: question.id,
    topic_id: question.topic_id,
    session_id: question.session_id,
    kind: question.kind,
    title: question.title,
    level: question.level,
    stem_html: question.stem_html,
    options: question.options,
    options_html: question.options_html,
    solution: question.solution,
    answer_html: question.answer_html,
    explanation_html: question.explanation_html,
  })),
};

writeFileSync(output, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ output, ...summary.counts }, null, 2));
