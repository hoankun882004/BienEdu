// ONE Common Math Renderer; this module only lays out source-backed paragraphs
// and semantic tables. It never invokes another KaTeX engine or rescans the DOM.
import * as common from './canonical-math-renderer.js';
export * from './canonical-math-renderer.js';
const escape = value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');

function blockMarkup(block) {
  if(block.kind==='paragraph') return `<div class="pdf-theory__paragraph" data-source-block="${escape(block.id)}">${common.mathContentMarkup(block.content)}</div>`;
  if(block.kind==='table') return `<div class="pdf-theory__table-scroll" tabindex="0" role="region" aria-label="Bảng kiến thức từ tài liệu"><table><tbody>${block.rows.map((row,index)=>`<tr>${row.map(cell=>`<${index?'td':'th'}${index?'':' scope="col"'}>${common.mathContentMarkup(cell)}</${index?'td':'th'}>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  return '';
}

function articleMarkup(article) {
  const incomplete = article.unresolvedText > 0;
  return `<section class="pdf-theory__edition" data-pdf-knowledge="${escape(article.id)}" data-source-complete="${!incomplete}" data-source-id="${escape(article.source.sourceId)}">
    <header class="pdf-theory__source"><span>${escape(article.source.file.split('/').at(-1))}</span><small>Trang ${article.sourcePages.join(', ')}</small></header>
    ${incomplete?'<p class="pdf-theory__notice" role="note">Bản PDF này chưa được chuyển đổi đầy đủ. Phần bài đọc hiện có được giữ nguyên; dưới đây chỉ là các đoạn đã trích xuất được.</p>':''}
    ${article.blocks.map(blockMarkup).join('')}
    ${article.unresolvedFigures?`<p class="pdf-theory__figure-note">${article.unresolvedFigures} hình minh họa trong PDF chưa được chuyển sang hình tương tác. Nội dung chữ và công thức được giữ riêng, không suy đoán hình.</p>`:''}
  </section>`;
}

export function renderKnowledgeMarkdown(options) {
  const articles = options.slide.reading?.pdfArticles;
  if(!articles?.length) return common.renderKnowledgeMarkdown(options);
  const complete = articles.filter(article=>article.unresolvedText===0 && article.kind==='knowledge');
  // Prefer the explicitly independent new PDF; retain older editions below.
  const primary = complete.find(a=>a.scope==='type'&&a.source.sourceId.endsWith('-2026'))
    ?? complete.find(a=>a.scope==='type') ?? complete[0];
  const rest = articles.filter(article=>article!==primary);
  const legacy = primary ? '' : common.renderKnowledgeMarkdown(options);
  const title = options.slide.reading.title ?? options.exercise.title;
  return `${legacy}<article class="pdf-theory" data-native-pdf-knowledge aria-label="Kiến thức từ PDF">
    ${primary?`<header class="pdf-theory__heading"><p>${escape(options.exercise.code)} · Kiến thức từ tài liệu</p><h2 id="lesson-content-title">${escape(title)}</h2></header>${articleMarkup(primary)}`:''}
    ${rest.map(article=>`<details class="pdf-theory__alternative" ${!primary && articles.length===1?'open':''}><summary>${escape(article.kind==='method'?'Phương pháp giải':article.kind==='notes'?'Lưu ý từ tài liệu':article.title)} <span>· ${escape(article.source.file.split('/').at(-1))}</span></summary>${articleMarkup(article)}</details>`).join('')}
  </article>`;
}
