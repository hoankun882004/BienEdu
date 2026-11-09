import { renderMarkdownMath, renderMathText, validateLatexExpression } from "/assets/js/components/markdown-math-renderer.js";

const $ = (selector) => document.querySelector(selector);
const token = $("meta[name=review-session]").content;
let items = [], active = null, cropUrl = null, cropRequest = 0;
let contextMode = false;
const drafts = new Map();
const decisions = new Map();
async function loadDevelopmentOverview() {
  try {
    const data = await (await request("/api/development")).json();
    $("#development-summary").textContent = !data.prepared ? "Chạy npm.cmd run content:dev:preview để chuẩn bị một bản sửa chung." : `${data.summary.eligibleCorrections} bản sửa · ${data.summary.eligibleFields} trường · ${data.summary.files} file. Chưa rõ: ${data.summary.classifications.AMBIGUOUS}; xung đột: ${data.summary.classifications.CONFLICT}. SymPy: ${data.symbolic.checks.filter((check) => check.status === "passed").length}/${data.symbolic.checks.length} kiểm tra được hỗ trợ đã qua. Trạng thái: ${data.status.status}${data.stale ? " · Bằng chứng cũ — cần chuẩn bị lại" : ""}.`;
    $("#development-command").textContent = data.prepared && !data.stale ? data.applyCommand : "npm.cmd run content:dev:preview";
    $("#development-files").replaceChildren();
    for (const file of data.files ?? []) {
      const section = document.createElement("details"), title = document.createElement("summary"); title.textContent = `${file.file} · ${file.changes.length} trường`; section.append(title);
      for (const change of file.changes) {
        const label = document.createElement("p"); label.textContent = `${change.recordId} · ${change.fieldId}`;
        const before = document.createElement("div"), after = document.createElement("div"); before.innerHTML = change.current === null ? "Nội dung runtime đã thay đổi ngoài bản sửa — cần kiểm tra lại." : renderMathText(change.current ?? change.before); after.innerHTML = renderMathText(change.after);
        section.append(label, document.createTextNode("Hiện có"), before, document.createTextNode("Đề xuất local — chưa áp dụng"), after);
      }
      $("#development-files").append(section);
    }
  } catch (error) { $("#development-summary").textContent = error.message; }
}
const request = async (url) => {
  const response = await fetch(url, { headers: { "x-review-token": token } });
  if (!response.ok) throw new Error(`Không đọc được nguồn (${response.status})`);
  return response;
};
const workflow = (item) => item.workflow ?? { machineChecksPassed: true, humanSourceVerified: false, editorialApproved: false };
function filteredItems() {
  return items.filter((item) => {
    const state = workflow(item), status = $("#status").value;
    return (!$("#topic").value || item.topicId === $("#topic").value)
      && (!$("#error-type").value || (item.categories ?? []).includes($("#error-type").value))
      && (!$("#comparison-filter").value || item.preparation?.automaticComparison?.classification === $("#comparison-filter").value)
      && (!status || (status === "machine-passed" && state.machineChecksPassed) || (status === "human-pending" && !state.humanSourceVerified)
        || (status === "source-verified" && state.humanSourceVerified) || (status === "editorial-approved" && state.editorialApproved)
        || (status === "editorial-pending" && state.humanSourceVerified && !state.editorialApproved)
        || (status === "needs-correction" && ["confirmed-error", "needs-correction"].includes(item.review.status))
        || (status === "unresolved-ambiguity" && item.review.status === "unresolved-ambiguity"));
  }).sort((a, b) => (a.preparation?.automaticComparison?.priority ?? 1) - (b.preparation?.automaticComparison?.priority ?? 1) || a.id.localeCompare(b.id, "en"));
}

function queue() {
  const filtered = filteredItems();
  $("#queue").replaceChildren();
  for (const item of filtered) {
    const button = document.createElement("button");
    button.type = "button";
    button.setAttribute("aria-current", String(item.id === active?.id));
    const strong = document.createElement("strong"); strong.textContent = `${item.sectionId} · ${item.kind}`;
    const label = document.createElement("span"); label.textContent = item.id;
    const pendingLabel = item.review.status === "unresolved-ambiguity" ? "Chưa rõ — cần đối chiếu thêm" : ["confirmed-error", "needs-correction"].includes(item.review.status) ? "Cần sửa" : "Chờ người đối chiếu nguồn";
    const status = document.createElement("small"); status.textContent = (workflow(item).editorialApproved ? "Người duyệt toán học đã xác nhận" : workflow(item).humanSourceVerified ? "Người đối chiếu nguồn đã xác nhận" : pendingLabel) + (decisions.has(item.id) ? " · Patch chưa áp dụng" : "");
    button.append(strong, label, status);
    button.addEventListener("click", () => select(item));
    $("#queue").append(button);
  }
  if (!filtered.length) $("#queue").textContent = "Không có mục khớp bộ lọc.";
  $("#queue-count").textContent = `${items.filter((item) => !workflow(item).humanSourceVerified).length} / ${items.length} mục chờ người đối chiếu`;
}

function showDiff(after) {
  const before = active.normalizedLatex ?? "";
  let start = 0, end = 0;
  while (start < before.length && start < after.length && before[start] === after[start]) start += 1;
  while (end < before.length - start && end < after.length - start && before[before.length - end - 1] === after[after.length - end - 1]) end += 1;
  for (const [selector, text, tag] of [["#diff-before", before, "del"], ["#diff-after", after, "ins"]]) {
    const node = $(selector); node.replaceChildren();
    node.append(document.createTextNode(text.slice(0, start)));
    const changed = document.createElement(tag); changed.textContent = text.slice(start, end ? text.length - end : text.length); node.append(changed);
    if (end) node.append(document.createTextNode(text.slice(text.length - end)));
  }
  $("#diff-status").textContent = before === after ? "Chưa thay đổi biểu thức." : "Có thay đổi ký tự; cần đối chiếu ý nghĩa với nguồn.";
}

function preview() {
  const latex = $("#latex").value;
  const result = validateLatexExpression(latex);
  $("#preview").innerHTML = result.valid && latex.trim() ? renderMarkdownMath(`$$${latex}$$`) + (active.conditions ?? []).map((condition) => renderMarkdownMath(`Điều kiện từ nguồn: \\(${condition.normalizedLatex}\\)`)).join("") : "";
  $("#render-status").textContent = result.valid && latex.trim() ? "Render-valid" : "Cần sửa cú pháp";
  $("#syntax-error").textContent = result.valid ? "" : result.error;
  $("#approve").disabled = !result.valid || !latex.trim() || workflow(active).editorialApproved && workflow(active).versionBound;
  drafts.set(active.id, latex);
  showDiff(latex);
  const comparison = active.preparation?.automaticComparison;
  $("#automatic-state").textContent = latex !== active.normalizedLatex ? "Ứng viên đã sửa: bằng chứng so khớp và xác nhận trước đó không còn áp dụng. Chuẩn bị lại sau khi lưu patch."
    : `${comparison?.classification ?? "AMBIGUOUS"} · Ưu tiên ${comparison?.priority ?? 1}. Không tự tạo phê duyệt của người duyệt.`;
  for (const button of document.querySelectorAll("[data-export-field]")) button.disabled = latex !== active.normalizedLatex;
}

async function loadCrop() {
  const item = active, requestId = ++cropRequest;
  $("#source-crop").hidden = true;
  if (cropUrl) { URL.revokeObjectURL(cropUrl); cropUrl = null; }
  if (item.source.kind !== "pdf") return;
  try {
    const response = await request(`/api/${contextMode ? "context" : "crop"}?id=${encodeURIComponent(item.id)}${contextMode ? `&page=${$("#source-page").value}` : ""}`);
    const blob = await response.blob();
    if (requestId !== cropRequest) return;
    cropUrl = URL.createObjectURL(blob); $("#source-crop").src = cropUrl; $("#source-crop").hidden = false;
    $("#source-context").textContent = contextMode ? "Trở lại vùng công thức" : "Xem cả trang";
    $("#source-context").setAttribute("aria-pressed", String(contextMode));
  } catch (error) { if (requestId === cropRequest) $("#feedback").textContent = error.message; }
}

async function select(item) {
  active = item;
  contextMode = false;
  $("#item-location").textContent = `${item.topicId} · Dạng ${item.sectionId} · ${item.source.kind === "tex" ? `Dòng ${item.source.location.lines.join("–")}` : `Trang ${item.source.location.page}`}`;
  $("#item-title").textContent = item.id;
  $("#source-kind").textContent = item.source.kind === "tex" ? "TeX nguyên bản" : "Crop từ PDF gốc";
  $("#source-tex").textContent = item.originalExpression;
  $("#source-tex").hidden = item.source.kind !== "tex";
  $("#source-detail").textContent = `${item.source.file}\nSHA-256: ${item.source.sha256}\nVị trí biểu thức: ${JSON.stringify(item.source.location)}\n\n${item.widerSourceContext ?? item.rawContext}`;
  $("#latex").value = drafts.get(item.id) ?? item.normalizedLatex ?? "";
  $("#latex").readOnly = item.review.status === "source-verified" || workflow(item).humanSourceVerified;
  $("#mark-error").disabled = $("#latex").readOnly;
  $("#mark-ambiguous").disabled = workflow(item).editorialApproved;
  $("#reason").value = "";
  $("#source-compared").checked = false;
  $("#human-source").checked = false;
  $("#editorial-confirmed").checked = false;
  $("#editorial-reviewer").value = "";
  $("#source-tools").hidden = item.source.kind !== "pdf";
  const prepared = item.preparation;
  $("#automatic-state").textContent = `${prepared?.automaticComparison?.classification ?? "AMBIGUOUS"} · Ưu tiên ${prepared?.automaticComparison?.priority ?? 1}. Không tự tạo phê duyệt của người duyệt.`;
  $("#automatic-evidence").textContent = JSON.stringify(prepared?.automaticComparison ?? {}, null, 2);
  let pageSelect = $("#source-page");
  if (!pageSelect) {
    pageSelect = document.createElement("select"); pageSelect.id = "source-page"; pageSelect.setAttribute("aria-label", "Trang nguồn để đối chiếu");
    pageSelect.addEventListener("change", () => { contextMode = true; loadCrop(); }); $("#source-tools").append(pageSelect);
  }
  pageSelect.replaceChildren();
  for (const page of prepared?.supportPages ?? []) { const option = document.createElement("option"); option.value = page; option.textContent = `Trang ${page}`; pageSelect.append(option); }
  pageSelect.value = item.source.location.page ?? "";
  $("#review-version").textContent = `Phiên bản ${item.contentVersion} · ${prepared?.previousComparison ?? "Chờ so sánh cấu trúc"}`;
  $("#review-questions").replaceChildren();
  for (const text of ["Ký hiệu và cách nhóm tử, mẫu, số mũ, chỉ số.", "Điều kiện trong vùng nguồn và toàn bộ ngữ cảnh.", "Đúng mục học và đúng bản hiện có trên website.", ...(prepared?.editorialQuestions ?? []).map((question) => question.issue)]) {
    const point = document.createElement("li"); point.textContent = text; $("#review-questions").append(point);
  }
  $("#review-warning").textContent = item.staleReview ? "Lịch sử đã cũ: cần giải quyết bằng CLI trước khi áp dụng bản vá mới." : "Kiểm tra máy không thay thế quyết định của người rà soát.";
  $("#runtime-state").textContent = prepared?.runtimeTarget ? `Dạng ${item.sectionId} · Phiên bản ${prepared.targetVersion}. Đối chiếu công thức dưới đây với bản đề xuất.` : "Chưa xác định đích runtime chính xác; mục này chỉ được chuẩn bị trong staging.";
  $("#runtime-route").textContent = prepared?.learnerRoute ?? "";
  $("#runtime-preview").innerHTML = prepared?.runtimeBefore ? renderMarkdownMath(`$$${prepared.runtimeBefore}$$`) : "";
  $("#runtime-diffs").replaceChildren();
  if (prepared?.runtimeMapping) {
    $("#runtime-state").textContent = `${prepared.runtimeMapping.classification} · ${prepared.targetVersion ?? "source-bound field versions below"}: ${prepared.runtimeMapping.reason}`;
    for (const usage of prepared.runtimeUsages ?? []) {
      const section = document.createElement("section"); section.className = "runtime-field-diff";
      const title = document.createElement("h4"); title.textContent = `${usage.recordId} · ${usage.selector.fieldId}`;
      const provenance = document.createElement("p"); provenance.textContent = `${usage.origin} · ${usage.contentVersion} · ${usage.sourceBlockId ?? "source section"}`;
      section.append(title, provenance);
      for (const [label, value] of [["Hiện có", usage.before], [usage.changed ? "Đề xuất — chưa xuất bản" : "Giữ nguyên", usage.after]]) {
        const heading = document.createElement("strong"); heading.textContent = label;
        const raw = document.createElement("pre"); raw.textContent = Array.isArray(value) ? value.join("\n") : value;
        const rendered = document.createElement("div"); rendered.innerHTML = (Array.isArray(value) ? value : [value]).map(renderMathText).join("");
        section.append(heading, raw, rendered);
      }
      if (usage.conditionContext) { const conditions = document.createElement("p"); conditions.textContent = usage.conditionContext; section.append(conditions); }
      const approval = prepared.fieldReviews?.find((entry) => entry.binding.targetId === usage.targetId);
      if (approval) {
        const state = document.createElement("p"); state.textContent = approval.stale ? "Quyết định cũ — cần duyệt lại phiên bản hiện tại." : `Duyệt trường: nguồn ${approval.sourceVerified ? "đã xác nhận" : "chưa xác nhận"}; toán học ${approval.mathematicalApproved ? "đã xác nhận" : "chưa xác nhận"}.`;
        const source = document.createElement("input"), mathematics = document.createElement("input"); source.type = mathematics.type = "checkbox";
        source.dataset.fieldSource = usage.targetId; mathematics.dataset.fieldMath = usage.targetId;
        const sourceLabel = document.createElement("label"), mathLabel = document.createElement("label"); sourceLabel.className = mathLabel.className = "field-confirm";
        sourceLabel.append(source, document.createTextNode("Tôi đã đối chiếu toàn bộ trường này với trang nguồn, gồm điều kiện."));
        mathLabel.append(mathematics, document.createTextNode("Tôi xác nhận tính đúng đắn toán học của chính trường này."));
        const button = document.createElement("button"); button.type = "button"; button.dataset.exportField = usage.targetId; button.textContent = "Xuất quyết định riêng cho trường";
        button.addEventListener("click", () => {
          const reviewer = $("#reviewer").value.trim(), reason = $("#reason").value.trim();
          if (!reviewer || !reason || !source.checked || mathematics.checked && !source.checked || $("#latex").value !== item.normalizedLatex) { $("#feedback").textContent = "Cần tên, ghi chú, xác nhận nguồn của trường và ứng viên chưa thay đổi. Duyệt toán học là quyết định riêng."; return; }
          const patch = { schemaVersion: "bienedu.math-field-review.v1", binding: approval.binding, parentHash: approval.parentHash, sourceVerified: source.checked, mathematicalApproved: mathematics.checked, reviewerType: "human", reviewer, reason, exportedAt: new Date().toISOString() };
          const filename = `field-${usage.targetId.replace(/[^a-zA-Z0-9.-]/gu, "-")}.json`;
          const url = URL.createObjectURL(new Blob([JSON.stringify(patch, null, 2) + "\n"], { type: "application/json" }));
          const anchor = document.createElement("a"); anchor.href = url; anchor.download = filename; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
          $("#apply-command").textContent = `npm.cmd run content:source:field-apply -- --patch .content-work/source-first-v5/${filename} --reviewer '${reviewer.replaceAll("'", "''")}'`;
          $("#feedback").textContent = "Đã xuất quyết định riêng. Chưa lưu phê duyệt hoặc thay đổi website; cần áp dụng bằng CLI rồi đọc lại quyết định.";
        });
        section.append(state, sourceLabel, mathLabel, button);
      }
      $("#runtime-diffs").append(section);
    }
  }
  $("#feedback").textContent = "Patch được tải về máy. Áp dụng bằng CLI để lưu vào staging; nội dung học sinh không thay đổi.";
  $("#checks").replaceChildren();
  for (const [key, title] of [["syntax", "A · Cú pháp máy kiểm tra"], ["structure", "B · Cấu trúc máy kiểm tra"], ["fidelity", "C · Người đối chiếu nguồn"], ["consistency", "D · Người duyệt toán học"]]) {
    const paragraph = document.createElement("p");
    paragraph.dataset.status = key === "fidelity" ? (workflow(item).humanSourceVerified ? "passed" : "needs-review")
      : key === "consistency" ? (workflow(item).editorialApproved ? "passed" : "needs-review") : item.checks[key].status;
    const label = document.createElement("b"); label.textContent = title;
    paragraph.append(label, document.createTextNode(key === "fidelity" ? (workflow(item).humanSourceVerified ? "Đã xác nhận" : "Chưa xác nhận") : key === "consistency" ? (workflow(item).editorialApproved ? "Đã xác nhận" : "Chưa xác nhận") : item.checks[key].status));
    $("#checks").append(paragraph);
  }
  preview(); queue();
  await loadCrop();
}

async function exportPatch(status) {
  const item = active;
  const form = $("#review-form");
  if (!form.reportValidity()) return;
  if (status === "source-verified" && (!$("#source-compared").checked || !$("#human-source").checked)) {
    $("#feedback").textContent = "Cần xác nhận người trực tiếp đối chiếu và việc so sánh với nguồn."; return;
  }
  const after = $("#latex").value;
  if (status === "unresolved-ambiguity" && after !== item.normalizedLatex) { $("#feedback").textContent = "Quyết định Chưa rõ phải giữ nguyên biểu thức. Dùng Cần sửa để xuất bản nháp đã chỉnh."; return; }
  if (status === "source-verified" && !validateLatexExpression(after).valid) return;
  if (status === "source-verified" && $("#editorial-confirmed").checked && !$("#editorial-reviewer").value.trim()) { $("#feedback").textContent = "Cần ghi rõ người xác nhận kiểm duyệt toán học."; return; }
  const reviewer = $("#reviewer").value.trim(), reason = $("#reason").value.trim();
  const sourceCompared = $("#source-compared").checked, humanSourceConfirmed = $("#human-source").checked;
  const editorialApproval = { confirmed: status === "source-verified" && $("#editorial-confirmed").checked, reviewer: status === "source-verified" ? $("#editorial-reviewer").value.trim() : "", reviewerType: "human" };
  const content = new TextEncoder().encode(JSON.stringify({ normalizedLatex: after, conditions: item.conditions ?? [] }));
  const hash = [...new Uint8Array(await crypto.subtle.digest("SHA-256", content))].map((byte) => byte.toString(16).padStart(2, "0")).join("").toUpperCase();
  const patch = {
    schemaVersion: "bienedu.math-review-patch.v3", itemId: item.id, baseHash: item.baseHash,
    itemVersion: item.contentVersion, sourceIdentityHash: item.sourceIdentityHash, originalExpressionHash: item.originalExpressionHash,
    sourceSha256: item.source.sha256, before: item.normalizedLatex, after, status,
    reviewer, reason, sourceCompared,
    reviewerType: "human", humanSourceConfirmed, reviewedContentHash: hash, editorialApproval,
    exportedAt: new Date().toISOString()
  };
  const url = URL.createObjectURL(new Blob([JSON.stringify(patch, null, 2) + "\n"], { type: "application/json" }));
  const anchor = document.createElement("a"); anchor.href = url; anchor.download = `${item.id}.review-patch.json`; anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  decisions.set(item.id, patch);
  $("#feedback").textContent = "Đã xuất patch. Chép file vào .content-work/source-first-v5 rồi chạy lệnh CLI để lưu quyết định vào staging.";
  const quotedReviewer = `'${patch.reviewer.replaceAll("'", "''")}'`;
  $("#apply-command").textContent = `npm.cmd run content:source:apply -- --patch .content-work/source-first-v5/${anchor.download} --reviewer ${quotedReviewer}`;
  queue();
}

$("#latex").addEventListener("input", () => {
  for (const selector of ["#source-compared", "#human-source", "#editorial-confirmed"]) $(selector).checked = false;
  for (const checkbox of document.querySelectorAll("[data-field-source],[data-field-math]")) checkbox.checked = false;
  preview();
});
$("#topic").addEventListener("change", queue);
$("#status").addEventListener("change", queue);
$("#error-type").addEventListener("change", queue);
$("#comparison-filter").addEventListener("change", queue);
$("#mark-error").addEventListener("click", () => exportPatch("needs-correction"));
$("#mark-ambiguous").addEventListener("click", () => exportPatch("unresolved-ambiguity"));
$("#review-form").addEventListener("submit", (event) => { event.preventDefault(); exportPatch("source-verified"); });
function navigate(direction) {
  const list = filteredItems();
  if (!list.length) return;
  const index = list.indexOf(active);
  const next = list[index < 0 ? (direction > 0 ? 0 : list.length - 1) : (index + direction + list.length) % list.length];
  if (next) select(next);
}
$("#next").addEventListener("click", () => navigate(1));
$("#previous").addEventListener("click", () => navigate(-1));
function nextUnresolved() {
  const list = filteredItems();
  const start = list.indexOf(active);
  for (let step = 1; step <= list.length; step += 1) {
    const item = list[(Math.max(start, -1) + step) % list.length];
    if ((!workflow(item).editorialApproved || !workflow(item).versionBound) && !decisions.has(item.id)) { select(item); return; }
  }
  $("#feedback").textContent = "Không còn mục chưa xử lý trong bộ lọc. Patch đã xuất vẫn chờ áp dụng bằng CLI.";
}
$("#next-unresolved").addEventListener("click", nextUnresolved);
$("#refresh-reviews").addEventListener("click", async () => {
  if (active && $("#latex").value !== active.normalizedLatex && !decisions.has(active.id)) { $("#feedback").textContent = "Hãy xuất patch hoặc lưu bản nháp trước khi đọc lại quyết định."; return; }
  try {
    const data = await (await request("/api/items")).json();
    for (const item of data.items) if (items.find((old) => old.id === item.id)?.baseHash !== item.baseHash) { drafts.delete(item.id); decisions.delete(item.id); }
    const selected = data.items.find((item) => item.id === active?.id) ?? data.items[0];
    items = data.items; queue(); if (selected) await select(selected);
    $("#feedback").textContent = "Đã đọc lại các quyết định thực sự lưu bằng CLI. Xuất patch không tự tạo phê duyệt.";
  } catch (error) { $("#feedback").textContent = error.message; }
});
document.addEventListener("keydown", (event) => {
  if (!event.altKey || event.ctrlKey || event.metaKey || /INPUT|TEXTAREA|SELECT/u.test(event.target.tagName) || $("#source-zoom").open) return;
  if (event.key.toLowerCase() === "n") { event.preventDefault(); nextUnresolved(); return; }
  if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
  event.preventDefault(); navigate(event.key === "ArrowLeft" ? -1 : 1);
});
$("#source-context").addEventListener("click", () => { contextMode = !contextMode; loadCrop(); });
$("#zoom-source").addEventListener("click", () => {
  if (!cropUrl) return;
  $("#zoom-image").src = cropUrl; $("#zoom-level").value = "1"; $("#zoom-image").style.width = "100%"; $("#source-zoom").showModal();
});
$("#zoom-level").addEventListener("input", () => { $("#zoom-image").style.width = `${Number($("#zoom-level").value) * 100}%`; });
$("#close-zoom").addEventListener("click", () => $("#source-zoom").close());

try {
  await loadDevelopmentOverview();
  const data = await (await request("/api/items")).json(); items = data.items;
  for (const topic of [...new Set(items.map((item) => item.topicId))].sort()) {
    const option = document.createElement("option"); option.value = topic; option.textContent = topic; $("#topic").append(option);
  }
  for (const category of [...new Set(items.flatMap((item) => item.categories ?? []))].sort()) { const option = document.createElement("option"); option.value = category; option.textContent = category; $("#error-type").append(option); }
  queue(); if (items.length) await select(items[0]);
} catch (error) { $("#queue-count").textContent = "Không tải được hàng chờ"; $("#feedback").textContent = error.message; }
