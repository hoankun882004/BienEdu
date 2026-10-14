import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const pages = ["index.html", "course.html", "documents.html", "quiz.html", "contact.html"];
const missing = [];

for (const page of pages) {
  const source = readFileSync(page, "utf8");
  const references = [...source.matchAll(/(?:href|src)="([^"]+)"/g)].map((match) => match[1]);
  for (const reference of references) {
    if (/^(?:https?:|#|mailto:|tel:)/.test(reference)) continue;
    const target = resolve(dirname(resolve(page)), reference.split(/[?#]/)[0]);
    if (!existsSync(target)) missing.push(`${page} -> ${reference}`);
  }
}

if (missing.length) {
  console.error(`Missing local references:\n${missing.join("\n")}`);
  process.exitCode = 1;
} else {
  console.log(`Checked ${pages.length} pages: no missing local href/src targets.`);
}
