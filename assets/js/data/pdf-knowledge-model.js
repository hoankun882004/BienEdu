// Additive source editions. Legacy lessons, example IDs and progress IDs remain
// untouched; no PDF edition is substituted with a TEX edition or another PDF.
export function articlesFor(dataset, key) {
  return (dataset?.articles ?? []).filter(article => article.targets.includes(key));
}

export function attachPdfKnowledge(reading, articles) {
  if (!articles.length) return reading;
  const sourceReading = reading ?? {lead:'', formulae:[], points:[], title:articles[0].title};
  if (sourceReading.pages?.length) {
    return {...sourceReading, pages:sourceReading.pages.map((page,index) => index ? page : {...page,pdfArticles:articles})};
  }
  return {...sourceReading,pdfArticles:articles};
}
