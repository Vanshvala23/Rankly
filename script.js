const menuToggle = document.querySelector('.menu-toggle');
const navLinks = document.querySelector('.nav-links');

menuToggle.addEventListener('click', () => {
  const isOpen = navLinks.classList.toggle('open');
  menuToggle.setAttribute('aria-expanded', String(isOpen));
});

navLinks.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => {
    navLinks.classList.remove('open');
    menuToggle.setAttribute('aria-expanded', 'false');
  });
});

const loginModal = document.querySelector('.modal');
const loginTriggers = document.querySelectorAll('a[href="#login"]');
const registerModal = document.querySelector('#register');
const registerTriggers = document.querySelectorAll('a[href="#register"]');
const userMenu = document.querySelector('.user-menu');
const userButton = document.querySelector('.user-button');
const userDropdown = document.querySelector('.user-dropdown');
const updateAuthNavigation = (user) => {
  if (!user) {
    userMenu.hidden = true;
    document.querySelector('[data-auth-login]').hidden = false;
    document.querySelector('[data-auth-register]').hidden = false;
    return;
  }
  const initials = user.name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase();
  document.querySelectorAll('.user-avatar').forEach((element) => { element.textContent = initials; });
  document.querySelector('.user-button-name').textContent = user.name.split(' ')[0];
  document.querySelector('.user-name').textContent = user.name;
  document.querySelector('.user-email').textContent = user.email;
  userMenu.hidden = false;
  document.querySelector('[data-auth-login]').hidden = true;
  document.querySelector('[data-auth-register]').hidden = true;
};
const restoreSession = async () => {
  if (!localStorage.getItem('ranklyToken')) return;
  try {
    const data = await apiRequest('/api/auth/me');
    updateAuthNavigation(data.user);
  } catch {
    localStorage.removeItem('ranklyToken');
    updateAuthNavigation(null);
  }
};
const apiRequest = async (url, options = {}) => {
  const token = localStorage.getItem('ranklyToken');
  let response;
  try {
    response = await fetch(url, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers }
    });
  } catch {
    throw new Error('Unable to connect to the server. Please try again.');
  }
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error('The API is not connected. Deploy the Netlify Function and try again.');
  }
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Something went wrong.');
  return data;
};
const openModal = (modal, focusSelector) => {
  modal.classList.add('is-open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  modal.querySelector(focusSelector).focus();
};
const closeLogin = () => {
  loginModal.classList.remove('is-open');
  loginModal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
};
const closeRegister = () => {
  registerModal.classList.remove('is-open');
  registerModal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
};
loginTriggers.forEach((trigger) => trigger.addEventListener('click', (event) => {
  event.preventDefault();
  closeRegister();
  openModal(loginModal, '#login-email');
}));
registerTriggers.forEach((trigger) => trigger.addEventListener('click', (event) => {
  event.preventDefault();
  closeLogin();
  openModal(registerModal, '#register-name');
}));
loginModal.querySelectorAll('[data-close-login]').forEach((element) => element.addEventListener('click', closeLogin));
loginModal.querySelector('[data-switch-register]').addEventListener('click', (event) => {
  event.preventDefault();
  closeLogin();
  openModal(registerModal, '#register-name');
});
registerModal.querySelector('[data-switch-login]').addEventListener('click', (event) => {
  event.preventDefault();
  closeRegister();
  openModal(loginModal, '#login-email');
});
registerModal.querySelectorAll('[data-close-register]').forEach((element) => element.addEventListener('click', closeRegister));
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    if (loginModal.classList.contains('is-open')) closeLogin();
    if (registerModal.classList.contains('is-open')) closeRegister();
  }
});
userButton.addEventListener('click', () => {
  const isOpen = !userDropdown.hidden;
  userDropdown.hidden = isOpen;
  userButton.setAttribute('aria-expanded', String(!isOpen));
});
document.addEventListener('click', (event) => {
  if (!userMenu.contains(event.target)) {
    userDropdown.hidden = true;
    userButton.setAttribute('aria-expanded', 'false');
  }
});
document.querySelector('[data-logout]').addEventListener('click', () => {
  localStorage.removeItem('ranklyToken');
  userDropdown.hidden = true;
  userButton.setAttribute('aria-expanded', 'false');
  updateAuthNavigation(null);
});
document.querySelector('.login-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const email = form.querySelector('#login-email').value.trim();
  const password = form.querySelector('#login-password').value;
  const message = event.currentTarget.querySelector('.login-message');
  message.textContent = 'Signing you in…';
  try {
    const data = await apiRequest('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    localStorage.setItem('ranklyToken', data.token);
    updateAuthNavigation(data.user);
    message.textContent = `Welcome back, ${data.user.name.split(' ')[0]}!`;
    form.reset();
  } catch (error) {
    message.textContent = error.message;
  }
});
document.querySelector('.register-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const name = form.querySelector('#register-name').value.trim();
  const email = form.querySelector('#register-email').value.trim();
  const password = form.querySelector('#register-password').value;
  const confirm = form.querySelector('#register-confirm').value;
  const message = form.querySelector('.register-message');
  if (password !== confirm) {
    message.textContent = 'Passwords do not match.';
    return;
  }
  message.textContent = 'Creating your workspace…';
  try {
    const data = await apiRequest('/api/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password }) });
    localStorage.setItem('ranklyToken', data.token);
    updateAuthNavigation(data.user);
    message.textContent = `Account created. Welcome, ${data.user.name.split(' ')[0]}!`;
    form.reset();
  } catch (error) {
    message.textContent = error.message;
  }
});

const testimonials = [
  {
    quote: 'Rankly helped us stop treating SEO like a side project. In six months, organic became our number one acquisition channel.',
    name: 'Emma Chen',
    role: 'Head of Growth, Lattice',
    initials: 'EC'
  },
  {
    quote: 'We found our clearest path to growth in the first week. Rankly turns complex SEO into decisions our whole team can act on.',
    name: 'Marcus Reid',
    role: 'Marketing Director, Northstar',
    initials: 'MR'
  },
  {
    quote: 'The visibility is a game changer. We know what is working, what is next, and why our traffic keeps compounding.',
    name: 'Aisha Khan',
    role: 'Founder, Sonder',
    initials: 'AK'
  }
];

let testimonialIndex = 0;
const quote = document.querySelector('.testimonial blockquote');
const authorName = document.querySelector('.quote-author strong');
const authorRole = document.querySelector('.quote-author small');
const authorAvatar = document.querySelector('.author-avatar');
const counter = document.querySelector('.quote-controls span');

function showTestimonial(index) {
  const item = testimonials[index];
  quote.innerHTML = item.quote.replace(/(number one|clearest path to growth|what is next)/, '<em>$1</em>');
  authorName.textContent = item.name;
  authorRole.textContent = item.role;
  authorAvatar.textContent = item.initials;
  counter.textContent = `0${index + 1} / 03`;
}

document.querySelector('.quote-controls button:last-child').addEventListener('click', () => {
  testimonialIndex = (testimonialIndex + 1) % testimonials.length;
  showTestimonial(testimonialIndex);
});

document.querySelector('.quote-controls button:first-child').addEventListener('click', () => {
  testimonialIndex = (testimonialIndex - 1 + testimonials.length) % testimonials.length;
  showTestimonial(testimonialIndex);
});

document.querySelector('.audit-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const email = form.querySelector('input').value;
  const message = form.querySelector('.form-message');
  message.textContent = 'Sending your request…';
  try {
    const data = await apiRequest('/api/audits', { method: 'POST', body: JSON.stringify({ email }) });
    message.textContent = data.message;
    form.reset();
  } catch (error) {
    message.textContent = error.message;
  }
});

restoreSession();
