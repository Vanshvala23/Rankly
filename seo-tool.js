(() => {
  const fields = {
    title: document.querySelector('#page-title'),
    description: document.querySelector('#page-description'),
    keyword: document.querySelector('#target-keyword'),
    url: document.querySelector('#page-url'),
    content: document.querySelector('#page-content')
  };
  const checks = document.querySelector('#seo-check-list');
  const scoreOutput = document.querySelector('#seo-score');
  const summary = document.querySelector('#score-summary');
  if (!checks || !scoreOutput) return;

  const wordCount = (text) => (text.trim().match(/\b[\p{L}\p{N}][\p{L}\p{N}'’-]*\b/gu) || []).length;
  const render = () => {
    const title = fields.title.value.trim();
    const description = fields.description.value.trim();
    const keyword = fields.keyword.value.trim().toLocaleLowerCase();
    const urlText = fields.url.value.trim();
    const content = fields.content.value.trim();
    const titleCount = title.length;
    const descriptionCount = description.length;
    document.querySelector('#title-count').textContent = `${titleCount} / 60`;
    document.querySelector('#description-count').textContent = `${descriptionCount} / 160`;
    document.querySelector('#snippet-title').textContent = title || 'Your page title will appear here';
    document.querySelector('#snippet-description').textContent = description || 'Your meta description preview will appear here.';
    let displayUrl = 'example.com › your-page';
    if (urlText) {
      try { displayUrl = new URL(urlText).hostname.replace(/^www\./, '') + ' › ' + new URL(urlText).pathname.split('/').filter(Boolean).join(' › '); }
      catch { displayUrl = urlText; }
    }
    document.querySelector('#snippet-url').textContent = displayUrl;

    const words = wordCount(content);
    const headingCount = (content.match(/^\s{0,3}#{1,6}\s|<h[1-6](?:\s|>)/gim) || []).length;
    const items = [
      { ok: titleCount >= 30 && titleCount <= 60, label: titleCount ? `Title is ${titleCount} characters (aim for 30–60).` : 'Add a descriptive page title.' },
      { ok: descriptionCount >= 120 && descriptionCount <= 160, label: descriptionCount ? `Meta description is ${descriptionCount} characters (aim for 120–160).` : 'Add a meta description.' },
      { ok: Boolean(keyword && title.toLocaleLowerCase().includes(keyword)), label: keyword ? 'Include your target keyword in the page title.' : 'Add a target keyword to check relevance.' },
      { ok: Boolean(keyword && description.toLocaleLowerCase().includes(keyword)), label: keyword ? 'Include your target keyword in the meta description.' : 'Add a target keyword to check the description.' },
      { ok: Boolean(keyword && content.toLocaleLowerCase().includes(keyword)), label: keyword ? 'Use your target keyword naturally in the page content.' : 'Add page content to check keyword usage.' },
      { ok: words >= 300, label: content ? `Content has ${words} words${words < 300 ? ' (consider adding useful detail).' : '.'}` : 'Add your page content to check its length.' },
      { ok: headingCount > 0, label: headingCount ? `${headingCount} heading${headingCount === 1 ? '' : 's'} found. Keep content structured.` : 'Add headings (use Markdown # or HTML <h2>) to structure the page.' },
      { ok: Boolean(urlText && (() => { try { return new URL(urlText).protocol === 'https:'; } catch { return false; } })()), label: urlText ? 'Use a valid HTTPS page URL.' : 'Add your page URL (HTTPS recommended).' }
    ];
    const score = Math.round(items.filter((item) => item.ok).length / items.length * 100);
    scoreOutput.textContent = score;
    scoreOutput.style.color = 'var(--ink)';
    scoreOutput.dataset.score = String(score);
    scoreOutput.style.setProperty('--score-angle', `${score * 3.6}deg`);
    summary.textContent = score >= 80 ? 'Looking strong — review the remaining items.' : score >= 50 ? 'Good start — a few improvements can help.' : 'Work through the checklist to improve this page.';
    checks.replaceChildren(...items.map((item) => {
      const li = document.createElement('li');
      li.className = item.ok ? 'check-good' : 'check-needs-work';
      li.textContent = item.label;
      return li;
    }));
  };
  document.querySelector('#seo-checker-form').addEventListener('submit', (event) => event.preventDefault());
  Object.values(fields).forEach((field) => field.addEventListener('input', render));
  render();
})();
