(() => {
  const $ = (selector) => document.querySelector(selector);
  const form = $('#seoCheckerForm');
  if (!form) return;
  const fields = { title: $('#pageTitle'), description: $('#metaDesc'), keyword: $('#targetKeyword'), url: $('#pageUrl'), content: $('#pageContent') };
  const results = $('#resultsContent');
  const placeholder = $('#resultsPlaceholder');
  const checks = $('#checkList');
  const scoreNumber = $('#scoreNumber');
  const scoreArc = $('#scoreArc');
  const graph = $('#seoGraph');
  const wordCount = (text) => (text.match(/\b[\p{L}\p{N}][\p{L}\p{N}'’-]*\b/gu) || []).length;
  const getChecks = () => {
    const title = fields.title.value.trim();
    const description = fields.description.value.trim();
    const keyword = fields.keyword.value.trim().toLowerCase();
    const content = fields.content.value.trim();
    const words = wordCount(content);
    return [
      { ok: title.length >= 30 && title.length <= 60, label: title ? `Title is ${title.length} characters (aim for 30–60).` : 'Add a descriptive page title.' },
      { ok: description.length >= 120 && description.length <= 160, label: description ? `Meta description is ${description.length} characters (aim for 120–160).` : 'Add a meta description.' },
      { ok: Boolean(keyword && title.toLowerCase().includes(keyword)), label: keyword ? 'Target keyword appears in the page title.' : 'Add a target keyword to check relevance.' },
      { ok: Boolean(keyword && description.toLowerCase().includes(keyword)), label: keyword ? 'Target keyword appears in the meta description.' : 'Add a target keyword to check the description.' },
      { ok: Boolean(keyword && content.toLowerCase().includes(keyword)), label: keyword ? 'Target keyword appears naturally in the content.' : 'Add page content to check keyword usage.' },
      { ok: words >= 300, label: content ? `${words.toLocaleString()} words found${words < 300 ? ' — consider adding useful detail.' : '.'}` : 'Add page content to check its length.' },
      { ok: /(^|\n)\s{0,3}#{1,6}\s|<h[1-6](?:\s|>)/i.test(content), label: 'Content has a clear heading structure.' },
      { ok: (() => { try { return fields.url.value && new URL(fields.url.value).protocol === 'https:'; } catch { return false; } })(), label: 'Page URL uses HTTPS.' }
    ];
  };
  const drawGraph = (score) => {
    if (!graph) return;
    const values = [Math.max(22, score - 23), Math.max(29, score - 15), Math.max(35, score - 11), Math.max(42, score - 7), Math.max(51, score - 4), Math.max(58, score - 2), score];
    const points = values.map((value, index) => `${index * 50 + 10},${108 - value * 0.82}`).join(' ');
    graph.innerHTML = `<defs><linearGradient id="graphFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6366f1" stop-opacity=".24"/><stop offset="1" stop-color="#6366f1" stop-opacity="0"/></linearGradient></defs><line x1="10" y1="20" x2="310" y2="20"/><line x1="10" y1="64" x2="310" y2="64"/><line x1="10" y1="108" x2="310" y2="108"/><polygon points="10,108 ${points} 310,108" fill="url(#graphFill)"/><polyline points="${points}" fill="none" stroke="#6366f1" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>${values.map((value, index) => `<circle cx="${index * 50 + 10}" cy="${108 - value * 0.82}" r="3.5" fill="#fff" stroke="#6366f1" stroke-width="2"/>`).join('')}`;
  };
  const render = () => {
    const hasInput = Object.values(fields).some((field) => field.value.trim());
    $('#titleCount').textContent = `${fields.title.value.length}/70`;
    $('#descCount').textContent = `${fields.description.value.length}/160`;
    $('#serpTitle').textContent = fields.title.value.trim() || 'Your page title will appear here';
    $('#serpDesc').textContent = fields.description.value.trim() || 'Your meta description will appear here in search results.';
    try { $('#serpSite').textContent = new URL(fields.url.value).hostname.replace(/^www\./, ''); } catch { $('#serpSite').textContent = 'yoursite.com'; }
    if (!hasInput) return;
    const items = getChecks();
    const score = Math.round(items.filter((item) => item.ok).length / items.length * 100);
    placeholder?.classList.add('hidden');
    results?.classList.remove('hidden');
    scoreNumber.textContent = score;
    scoreArc.style.strokeDashoffset = String(326.7 - (326.7 * score / 100));
    $('#scoreGrade').textContent = score >= 80 ? 'Excellent foundation' : score >= 50 ? 'Good start' : 'Needs attention';
    $('#scoreDescription').textContent = score >= 80 ? 'Your page is well-optimised. Tackle the remaining items for an even stronger result.' : 'Use the checklist below to turn your biggest SEO opportunities into quick wins.';
    checks.replaceChildren(...items.map((item) => { const li = document.createElement('li'); li.className = item.ok ? 'check-good' : 'check-needs-work'; li.textContent = `${item.ok ? '✓' : '○'} ${item.label}`; return li; }));
    drawGraph(score);
  };
  Object.values(fields).forEach((field) => field.addEventListener('input', render));
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = $('#analyzeBtn');
    if (!fields.url.value.trim()) { fields.url.focus(); render(); return; }
    button.disabled = true; button.innerHTML = 'Analyzing page…';
    try {
      const response = await fetch('/api/page-audit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: fields.url.value.trim() }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Could not analyze that page.');
      fields.url.value = data.url || fields.url.value; fields.title.value = data.title || ''; fields.description.value = data.description || ''; fields.content.value = data.content || ''; render();
    } catch (error) {
      results?.classList.remove('hidden'); placeholder?.classList.add('hidden'); $('#scoreDescription').textContent = error.message || 'Could not analyze this page. You can still paste the page details manually.';
    } finally { button.disabled = false; button.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg> Analyze live page'; }
  });
  render();
})();
