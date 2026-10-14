import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const input = resolve(process.argv[2] ?? "BienEdu_HocSinh_Preview (6).html");
const output = resolve(process.argv[3] ?? ".audit/embedded-original.html");
const source = readFileSync(input, "utf8");
const marker = "iframe.srcdoc=";
const start = source.indexOf(marker);

if (start < 0) {
  throw new Error("The preview does not contain an iframe.srcdoc assignment.");
}

const quoteStart = start + marker.length;
if (source[quoteStart] !== '"') {
  throw new Error("Expected the iframe.srcdoc value to be a double-quoted string.");
}

let escaped = false;
let quoteEnd = -1;
for (let index = quoteStart + 1; index < source.length; index += 1) {
  const character = source[index];
  if (escaped) {
    escaped = false;
    continue;
  }
  if (character === "\\") {
    escaped = true;
    continue;
  }
  if (character === '"') {
    quoteEnd = index;
    break;
  }
}

if (quoteEnd < 0) {
  throw new Error("Could not find the end of the iframe.srcdoc string.");
}

const embedded = JSON.parse(source.slice(quoteStart, quoteEnd + 1));
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, embedded, "utf8");

const countOccurrences = (haystack, needle) => {
  let count = 0;
  let offset = 0;
  while ((offset = haystack.indexOf(needle, offset)) >= 0) {
    count += 1;
    offset += needle.length;
  }
  return count;
};

const normalized = embedded.toLowerCase();
const scriptSources = [];
let scriptOffset = 0;
while ((scriptOffset = normalized.indexOf("<script", scriptOffset)) >= 0) {
  const contentStart = embedded.indexOf(">", scriptOffset) + 1;
  const contentEnd = normalized.indexOf("</script>", contentStart);
  if (contentStart <= 0 || contentEnd < 0) break;
  scriptSources.push(embedded.slice(contentStart, contentEnd));
  scriptOffset = contentEnd + 9;
}

scriptSources.forEach((script, index) => {
  writeFileSync(resolve(dirname(output), `embedded-script-${index + 1}.js`), script, "utf8");
});

const counts = {
  input,
  output,
  sourceCharacters: source.length,
  embeddedCharacters: embedded.length,
  styles: countOccurrences(normalized, "<style"),
  scripts: countOccurrences(normalized, "<script"),
  scriptCharacters: scriptSources.map((script) => script.length),
  images: countOccurrences(normalized, "<img"),
  pdfDataUrls: countOccurrences(normalized, "data:application/pdf"),
  pdfReferences: countOccurrences(normalized, ".pdf"),
};

console.log(JSON.stringify(counts, null, 2));
