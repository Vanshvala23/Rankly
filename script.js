(() => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  const header = $('#siteHeader');
  const hamburger = $('#hamburger');
  const mobileMenu = $('#mobileMenu');
  const setMobileMenu = (open) => {
    hamburger?.classList.toggle('open', open);
    hamburger?.setAttribute('aria-expanded', String(open));
    mobileMenu?.classList.toggle('open', open);
    mobileMenu?.setAttribute('aria-hidden', String(!open));
  };
  hamburger?.addEventListener('click', () => setMobileMenu(!mobileMenu.classList.contains('open')));
  $$('.mobile-menu a').forEach((link) => link.addEventListener('click', () => setMobileMenu(false)));
  window.addEventListener('scroll', () => header?.classList.toggle('scrolled', window.scrollY > 8), { passive: true });
  $('#announcementClose')?.addEventListener('click', () => $('.announcement-bar')?.remove());

  const loginModal = $('#loginModal');
  const registerModal = $('#registerModal');
  const showModal = (modal) => {
    if (!modal) return;
    modal.hidden = false;
    requestAnimationFrame(() => modal.classList.add('open'));
    document.body.style.overflow = 'hidden';
  };
  const hideModal = (modal) => {
    if (!modal) return;
    modal.classList.remove('open');
    setTimeout(() => { modal.hidden = true; }, 220);
    if (!loginModal?.classList.contains('open') && !registerModal?.classList.contains('open')) document.body.style.overflow = '';
  };
  const openLogin = () => { hideModal(registerModal); showModal(loginModal); $('#loginEmail')?.focus(); };
  const openRegister = () => { hideModal(loginModal); showModal(registerModal); $('#regFirstName')?.focus(); };
  ['#openLogin', '#openLoginMobile'].forEach((id) => $(id)?.addEventListener('click', openLogin));
  ['#openRegister', '#openRegisterMobile'].forEach((id) => $(id)?.addEventListener('click', openRegister));
  $$('[data-close]').forEach((button) => button.addEventListener('click', () => hideModal($('#' + button.dataset.close))));
  [loginModal, registerModal].forEach((modal) => modal?.addEventListener('click', (event) => { if (event.target === modal) hideModal(modal); }));
  $('#switchToRegister')?.addEventListener('click', openRegister);
  $('#switchToLogin')?.addEventListener('click', openLogin);
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') { hideModal(loginModal); hideModal(registerModal); setMobileMenu(false); } });
  $$('.toggle-password').forEach((button) => button.addEventListener('click', () => {
    const input = $('#' + button.dataset.target);
    if (!input) return;
    input.type = input.type === 'password' ? 'text' : 'password';
    button.setAttribute('aria-label', input.type === 'password' ? 'Show password' : 'Hide password');
  }));

  const apiRequest = async (url, options = {}) => {
    const response = await fetch(url, { ...options, headers: { 'Content-Type': 'application/json', ...(options.headers || {}) } });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || 'Something went wrong.');
    return data;
  };
  const showAuthState = (user) => {
    const menu = $('#userMenu');
    if (!menu) return;
    menu.classList.toggle('hidden', !user);
    $('#openLogin')?.classList.toggle('hidden', Boolean(user));
    $('#openRegister')?.classList.toggle('hidden', Boolean(user));
    if (user) $('#userInitials').textContent = user.name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase();
  };
  const submitAuth = (form, endpoint, errorId, getPayload) => form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const error = $('#' + errorId);
    error?.classList.add('hidden');
    try {
      const data = await apiRequest(endpoint, { method: 'POST', body: JSON.stringify(getPayload(form)) });
      if (data.token) localStorage.setItem('ranklyToken', data.token);
      showAuthState(data.user);
      hideModal(form.closest('.modal-overlay'));
    } catch (err) {
      if (error) { error.textContent = err.message; error.classList.remove('hidden'); }
    }
  });
  submitAuth($('#loginForm'), '/api/auth/login', 'loginError', (form) => ({ email: $('#loginEmail', form).value.trim(), password: $('#loginPassword', form).value }));
  submitAuth($('#registerForm'), '/api/auth/register', 'registerError', (form) => ({ name: `${$('#regFirstName', form).value.trim()} ${$('#regLastName', form).value.trim()}`.trim(), email: $('#regEmail', form).value.trim(), password: $('#regPassword', form).value }));
  $('#logoutBtn')?.addEventListener('click', () => { localStorage.removeItem('ranklyToken'); showAuthState(null); });
  $('#userAvatarBtn')?.addEventListener('click', () => { const dropdown = $('#userDropdown'); dropdown.hidden = !dropdown.hidden; });

  // FAQ accordion and monthly/annual pricing toggle
  $$('.faq-question').forEach((button) => button.addEventListener('click', () => {
    const answer = $('#' + button.getAttribute('aria-controls'));
    const open = button.getAttribute('aria-expanded') === 'true';
    $$('.faq-question').forEach((other) => { other.setAttribute('aria-expanded', 'false'); const panel = $('#' + other.getAttribute('aria-controls')); if (panel) panel.hidden = true; });
    button.setAttribute('aria-expanded', String(!open));
    if (answer) answer.hidden = open;
  }));
  const setBilling = (annual) => {
    $('#monthlyToggle')?.classList.toggle('active', !annual);
    $('#annualToggle')?.classList.toggle('active', annual);
    $('#monthlyToggle')?.setAttribute('aria-pressed', String(!annual));
    $('#annualToggle')?.setAttribute('aria-pressed', String(annual));
    $$('.price-amount').forEach((price) => { price.textContent = `$${price.dataset[annual ? 'annual' : 'monthly']}`; });
  };
  $('#monthlyToggle')?.addEventListener('click', () => setBilling(false));
  $('#annualToggle')?.addEventListener('click', () => setBilling(true));

  $('#ctaForm')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const message = $('#ctaForm .form-message');
    if (message) { message.textContent = 'Thanks — your free audit request is on its way.'; message.classList.add('is-visible'); }
    event.currentTarget.reset();
  });

  const metricObserver = new IntersectionObserver((entries, observer) => entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    const element = entry.target;
    const target = Number(element.dataset.countFloat || element.dataset.count || 0);
    const suffix = element.dataset.suffix || '';
    const start = performance.now();
    const tick = (now) => {
      const progress = Math.min((now - start) / 900, 1);
      const value = target % 1 ? (target * progress).toFixed(1) : Math.round(target * progress).toLocaleString();
      element.textContent = value + suffix;
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    observer.unobserve(element);
  }), { threshold: 0.35 });
  $$('[data-count], [data-count-float]').forEach((element) => metricObserver.observe(element));
})();
