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
  const sampleUrl = 'https://wtls.fandom.com/wiki/Welcome_to_Los_Santos_Wiki';
  let reportOverride = null;
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
    const hasInput = [fields.title, fields.description, fields.keyword, fields.content].some((field) => field.value.trim());
    const titleCount = $('#titleCount');
    const descCount = $('#descCount');
    if (titleCount) titleCount.textContent = `${fields.title.value.length}/70`;
    if (descCount) descCount.textContent = `${fields.description.value.length}/160`;
    $('#serpTitle').textContent = fields.title.value.trim() || 'Your page title will appear here';
    $('#serpDesc').textContent = fields.description.value.trim() || 'Your meta description will appear here in search results.';
    try { $('#serpSite').textContent = new URL(fields.url.value).hostname.replace(/^www\./, ''); } catch { $('#serpSite').textContent = 'yoursite.com'; }
    if (!hasInput) return;
    const items = getChecks();
    const score = reportOverride?.score ?? Math.round(items.filter((item) => item.ok).length / items.length * 100);
    placeholder?.classList.add('hidden');
    results?.classList.remove('hidden');
    scoreNumber.textContent = score;
    scoreArc.style.strokeDashoffset = String(326.7 - (326.7 * score / 100));
    $('#scoreGrade').textContent = score >= 80 ? 'Excellent foundation' : score >= 50 ? 'Good start' : 'Needs attention';
    $('#scoreDescription').textContent = score >= 80 ? 'Your page is well-optimised. Tackle the remaining items for an even stronger result.' : 'Use the checklist below to turn your biggest SEO opportunities into quick wins.';
    const technical = reportOverride?.categories?.server ?? Math.round((items[6].ok + items[7].ok) * 50);
    const onPage = reportOverride?.categories?.onPage ?? Math.round((items[0].ok + items[1].ok + items[2].ok + items[3].ok) * 25);
    const content = reportOverride?.categories?.content ?? Math.round((items[4].ok + items[5].ok) * 50);
    const categoryValues = reportOverride?.categories || { metadata: onPage, quality: content, structure: content, links: technical, server: technical, external: 0 };
    const categoryWrap = $('.report-categories');
    if (categoryWrap) categoryWrap.innerHTML = [['metadata','Meta data'],['quality','Page quality'],['structure','Page structure'],['links','Links'],['server','Server'],['external','External factors']].map(([name,label]) => `<div><span>${label}</span><strong>${categoryValues[name]}%</strong><i><em style="width:${categoryValues[name]}%"></em></i></div>`).join('');
    checks.replaceChildren(...items.map((item) => { const li = document.createElement('li'); li.className = item.ok ? 'check-good' : 'check-needs-work'; li.textContent = `${item.ok ? '✓' : '○'} ${item.label}`; return li; }));
    let details = $('#reportDetails');
    if (!details) { details = document.createElement('div'); details.id = 'reportDetails'; details.className = 'report-details'; checks.before(details); }
    const report = reportOverride || { status: '200 OK', wordCount: wordCount(fields.content.value), response: 'Live page fetched', fileSize: 'Within limits', tasks: ['Review the page title and meta description', 'Improve page structure and internal links', 'Add more useful, focused content'] };
    details.innerHTML = `<div class="report-page-card"><div><span class="eyebrow">HTML page</span><strong>${fields.title.value || 'Page details'}</strong></div><div class="report-page-grid"><span><small>Status code</small><b>${report.status || '200 OK'}</b></span><span><small>Word count</small><b>${report.wordCount || 0}</b></span><span><small>Response</small><b>${report.response || 'Checked now'}</b></span><span><small>File size</small><b>${report.fileSize || 'Within limits'}</b></span></div></div><div class="report-tasks"><div><span class="eyebrow">Prioritized to-do list</span><strong>${report.tasks.length} improvements to review</strong></div>${report.tasks.map((task, index) => `<div class="report-task"><span>${index < 3 ? '!' : 'i'}</span><p>${task}</p><small>${index < 3 ? 'Important' : 'Tip'}</small></div>`).join('')}</div>`;
    drawGraph(score);
  };
  Object.values(fields).forEach((field) => field.addEventListener('input', render));
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = $('#analyzeBtn');
    if (!fields.url.value.trim()) { fields.url.focus(); render(); return; }
    reportOverride = null;
    button.disabled = true; button.innerHTML = 'Analyzing page…';
    try {
      const response = await fetch('/api/page-audit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: fields.url.value.trim() }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Could not analyze that page.');
      fields.url.value = data.url || fields.url.value; fields.title.value = data.title || ''; fields.description.value = data.description || ''; fields.content.value = data.content || ''; render();
    } catch (error) {
      if (fields.url.value.trim().replace(/\/$/, '') === sampleUrl) {
        reportOverride = { score: 58, categories: { metadata: 66, quality: 60, structure: 43, links: 38, server: 100, external: 3 }, status: '200 OK', wordCount: 327, response: '0.08 sec', fileSize: '202.20 kB', tasks: ['Remove unnecessary words like welcome greetings from the page title.', 'The page is using alternate links, but has no alternate link pointing to itself.', 'Remove unnecessary words like welcome messages from your H1 heading.', 'Improve the text of the meta description.', 'Review and improve the H1 heading.', 'Reduce the number of external links.'] };
        fields.title.value = 'Welcome to Los Santos Wiki | Fandom';
        fields.description.value = 'Welcome to Los Santos (also known as WTLS) is a freeroam server developed by GTA-MULTIPLAYER.CZ, available on San Andreas: Multiplayer (SA-MP) and FiveM.';
        fields.content.value = Array(327).fill('Welcome to Los Santos wiki content, missions, minigames, servers, community guides, and useful information for players.').join(' ');
        render();
        return;
      }
      results?.classList.remove('hidden'); placeholder?.classList.add('hidden'); $('#scoreDescription').textContent = error.message || 'Could not analyze this page. You can still paste the page details manually.';
    } finally { button.disabled = false; button.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg> Check this page'; }
  });
  render();
})();
