// Source scanner: offsets refer to the untouched original string, including CRLF.
export function groupAt(source, start) {
  if (source[start] !== "{") throw new Error(`Expected group at ${start}`);
  let depth = 1;
  for (let index = start + 1; index < source.length; index += 1) {
    if (source[index] === "\\") { index += 1; continue; }
    if (source[index] === "{") depth += 1;
    if (source[index] === "}" && --depth === 0) return { start, end: index + 1, value: source.slice(start + 1, index) };
  }
  throw new Error(`Unclosed TeX group at ${start}`);
}

export function commands(source, name) {
  const output = [];
  for (let index = 0; index < source.length;) {
    if (source[index] === "%") { index = source.indexOf("\n", index); if (index < 0) break; continue; }
    if (source[index] !== "\\") { index += 1; continue; }
    const start = index++;
    let command = "";
    while (/[a-zA-Z]/u.test(source[index] ?? "")) command += source[index++];
    if (!command) { index += 1; continue; }
    if (command !== name) continue;
    let cursor = index;
    const args = [];
    while (true) {
      while (/\s/u.test(source[cursor] ?? "")) cursor += 1;
      if (source[cursor] !== "{") break;
      const group = groupAt(source, cursor);
      args.push(group);
      cursor = group.end;
    }
    output.push({ start, end: args.at(-1)?.end ?? index, args });
  }
  return output;
}

export function expandTextScripts(source) {
  let value = String(source);
  for (const [name, symbol] of [["textsubscript", "_"], ["textsuperscript", "^"]]) {
    // Balanced arguments preserve nested scripts instead of converting to Unicode.
    const calls = commands(value, name).filter((call) => call.args.length === 1);
    for (const call of calls.reverse()) value = value.slice(0, call.start) + `${symbol}{${call.args[0].value}}` + value.slice(call.end);
  }
  return value;
}

export function extractDelimitedMath(source) {
  const output = [];
  for (let index = 0; index < source.length; index += 1) {
    if (source[index] === "%") { const end = source.indexOf("\n", index); if (end < 0) break; index = end; continue; }
    const pair = source.slice(index, index + 2);
    const opening = pair === "\\(" || pair === "\\[" || pair === "$$" ? pair : source[index] === "$" ? "$" : null;
    if (!opening) { if (source[index] === "\\") index += 1; continue; }
    const closing = { "\\(": "\\)", "\\[": "\\]", "$$": "$$", "$": "$" }[opening];
    const start = index + opening.length;
    let end = start;
    while (end < source.length) {
      if (source.slice(end, end + closing.length) === closing) break;
      if (source[end] === "\\") end += 1;
      end += 1;
    }
    if (end >= source.length) throw new Error(`Unclosed math delimiter ${opening} at ${index}`);
    const raw = source.slice(start, end);
    output.push({ raw, normalizedLatex: expandTextScripts(raw), offsets: [start, end], display: opening === "$$" || opening === "\\[" });
    index = end + closing.length - 1;
  }
  return output;
}

export function extractNativeElements(source) {
  const kinds = { formulabox: "knowledge", keypoints: "methodology", warningbox: "note", tipbox: "note", notebox: "note", examplebox: "example", leadbox: "knowledge" };
  const topics = commands(source, "topic");
  const chapters = commands(source, "chaptertitle");
  const begins = commands(source, "begin");
  const ends = commands(source, "end");
  const line = (offset) => source.slice(0, offset).split("\n").length;
  const output = [];
  for (let index = 0; index < topics.length; index += 1) {
    const topic = topics[index];
    const code = topic.args[0]?.value;
    if (!/^\d+\.\d+$/u.test(code ?? "")) continue;
    const chapterEnd = chapters.find((item) => item.start > topic.start)?.start ?? source.length;
    const end = Math.min(topics[index + 1]?.start ?? source.length, chapterEnd);
    const blocks = begins.filter((item) => item.start >= topic.end && item.start < end && kinds[item.args[0]?.value]);
    const leadEnd = blocks[0]?.start ?? end;
    if (source.slice(topic.end, leadEnd).trim()) output.push({ code, kind: "knowledge", environment: "intro", start: topic.end, end: leadEnd });
    for (const block of blocks) {
      const environment = block.args[0].value;
      let depth = 1;
      let closing = null;
      const boundaries = [...begins.filter((item) => item.start > block.start && item.start < end && item.args[0]?.value === environment).map((item) => ({ ...item, delta: 1 })), ...ends.filter((item) => item.start > block.start && item.start < end && item.args[0]?.value === environment).map((item) => ({ ...item, delta: -1 }))].sort((a, b) => a.start - b.start);
      for (const boundary of boundaries) { depth += boundary.delta; if (depth === 0) { closing = boundary; break; } }
      if (!closing) throw new Error(`Unclosed ${environment} in ${code}`);
      output.push({ code, kind: kinds[environment], environment, start: block.end, end: closing.start });
    }
  }
  return output.map((item, index) => ({
    ...item, id: `tex-${item.code}-${index + 1}`, topicId: `CD${item.code.split(".")[0]}`,
    sectionId: item.code, rawSource: source.slice(item.start, item.end),
    mathSegments: extractDelimitedMath(source.slice(item.start, item.end)),
    location: { offsets: [item.start, item.end], lines: [line(item.start), line(item.end)] }
  }));
}
