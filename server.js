const express = require('express');
const crypto = require('node:crypto');
const dns = require('node:dns').promises;
const https = require('node:https');
const net = require('node:net');
const path = require('node:path');
const ipaddr = require('ipaddr.js');
const { Account, Audit, connectDatabase } = require('./models');

const app = express();
const port = Number(process.env.PORT || 3000);
const secret = process.env.SESSION_SECRET;

app.use(express.json({ limit: '20kb' }));
const siteDirectory = path.dirname(__filename);
app.use(express.static(siteDirectory));
app.get('/', (_request, response) => {
  response.sendFile(path.join(siteDirectory, 'index.html'));
});
const asyncHandler = (handler) => (request, response, next) => {
  Promise.resolve(handler(request, response, next)).catch(next);
};

const publicAddress = (address) => {
  try {
    const parsed = ipaddr.process(address);
    return parsed.range() === 'unicast';
  } catch {
    return false;
  }
};

async function resolvePublicHost(hostname) {
  let addresses;
  try {
    addresses = await dns.lookup(hostname, { all: true, verbatim: true });
  } catch {
    throw new Error('The website host could not be resolved.');
  }
  if (!addresses.length || addresses.some(({ address }) => !publicAddress(address))) {
    throw new Error('This address is not a publicly reachable website.');
  }
  return addresses[0];
}

async function fetchPageHtml(input, redirects = 0) {
  let url;
  try { url = new URL(input); } catch { throw new Error('Enter a valid website URL.'); }
  if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443')) {
    throw new Error('Use a public HTTPS URL on the standard web port.');
  }
  if (net.isIP(url.hostname) && !publicAddress(url.hostname)) {
    throw new Error('This address is not a publicly reachable website.');
  }
  const address = await resolvePublicHost(url.hostname);
  const result = await new Promise((resolve, reject) => {
    const req = https.request({
      protocol: 'https:', hostname: url.hostname, port: 443,
      path: `${url.pathname}${url.search}`, method: 'GET', servername: url.hostname,
      headers: { 'User-Agent': 'RanklySEOChecker/1.0', Accept: 'text/html', 'Accept-Encoding': 'identity' },
      lookup: (_hostname, _options, callback) => callback(null, address.address, address.family)
    }, (res) => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
        res.resume();
        try { resolve({ redirect: new URL(res.headers.location, url).toString() }); }
        catch { reject(new Error('The website returned an invalid redirect.')); }
        return;
      }
      if (res.statusCode < 200 || res.statusCode >= 300) {
        res.resume();
        reject(new Error(`The website returned HTTP ${res.statusCode}.`));
        return;
      }
      const contentType = (res.headers['content-type'] || '').toLowerCase();
      if (!contentType.includes('text/html') && !contentType.includes('application/xhtml+xml')) {
        res.resume();
        reject(new Error('That URL did not return an HTML page.'));
        return;
      }
      const chunks = [];
      let size = 0;
      res.on('data', (chunk) => {
        size += chunk.length;
        if (size > 1_000_000) {
          req.destroy(new Error('The page is larger than the 1 MB analysis limit.'));
          return;
        }
        chunks.push(chunk);
      });
      res.on('end', () => resolve({ html: Buffer.concat(chunks).toString('utf8'), finalUrl: url.toString() }));
      res.on('error', reject);
    });
    req.setTimeout(8000, () => req.destroy(new Error('The website took too long to respond.')));
    req.on('error', reject);
    req.end();
  });
  if (result.redirect) {
    if (redirects >= 3) throw new Error('The page redirected too many times.');
    return fetchPageHtml(result.redirect, redirects + 1);
  }
  return result;
}

function decodeHtmlEntities(text) {
  const named = { amp: '&', apos: "'", quot: '"', lt: '<', gt: '>', nbsp: ' ' };
  return text.replace(/&(#x[\da-f]+|#\d+|amp|apos|quot|lt|gt|nbsp);/gi, (match, entity) => {
    if (entity[0] === '#') {
      const number = entity[1].toLowerCase() === 'x' ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10);
      try { return String.fromCodePoint(number); } catch { return match; }
    }
    return named[entity.toLowerCase()] || match;
  });
}

function extractPageDetails(html) {
  const getText = (value) => decodeHtmlEntities(value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim());
  const title = getText((html.match(/<title\b[^>]*>([\s\S]*?)<\/title\s*>/i) || [])[1] || '');
  let description = '';
  for (const tag of html.match(/<meta\b[^>]*>/gi) || []) {
    const attributes = Object.fromEntries([...tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s/>]+))/g)].map((match) => [match[1].toLowerCase(), match[2] ?? match[3] ?? match[4] ?? '']));
    if (attributes.name?.toLowerCase() === 'description' || attributes.property?.toLowerCase() === 'og:description') {
      description = decodeHtmlEntities(attributes.content || '').trim();
      if (description) break;
    }
  }
  let content = html
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(script|style|noscript|svg|template)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, ' ')
    .replace(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1\s*>/gi, (_match, level, heading) => `\n${'#'.repeat(Number(level))} ${getText(heading)}\n`)
    .replace(/<\/(p|div|li|section|article|header|footer|tr|blockquote)\s*>/gi, '\n')
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<[^>]*>/g, ' ');
  content = decodeHtmlEntities(content).replace(/[\t\f\r ]+/g, ' ').replace(/ *\n */g, '\n').replace(/\n{3,}/g, '\n\n').trim().slice(0, 30000);
  return { title, description, content };
}

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (error, derivedKey) => {
      if (error) reject(error);
      else resolve(`${salt}:${derivedKey.toString('hex')}`);
    });
  });
}

function verifyPassword(password, storedHash) {
  const [salt, key] = storedHash.split(':');
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (error, derivedKey) => {
      if (error) reject(error);
      else resolve(crypto.timingSafeEqual(Buffer.from(key, 'hex'), derivedKey));
    });
  });
}

function createSession(account) {
  if (!secret) throw new Error('SESSION_SECRET is not configured.');
  const payload = Buffer.from(JSON.stringify({
    id: account.id,
    email: account.email,
    expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 7
  })).toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

function readSession(request) {
  try {
    const token = request.headers.authorization?.replace('Bearer ', '');
    if (!token) return null;
    const [payload, signature] = token.split('.');
    if (!payload || !signature) return null;
    const expected = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
    if (signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return session.expiresAt > Date.now() ? session : null;
  } catch {
    return null;
  }
}

app.post('/api/auth/register', asyncHandler(async (request, response) => {
  try {
    const { name, email, password } = request.body;
    if (!name?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || '') || typeof password !== 'string' || password.length < 6) {
      return response.status(400).json({ message: 'Name, a valid email, and a password of at least 6 characters are required.' });
    }
    await connectDatabase();
    const normalizedEmail = email.trim().toLowerCase();
    const account = await Account.create({ name: name.trim(), email: normalizedEmail, passwordHash: await hashPassword(password) });
    return response.status(201).json({ user: { name: account.name, email: account.email }, token: createSession(account) });
  } catch (error) {
    if (error.code === 11000) return response.status(409).json({ message: 'An account with that email already exists.' });
    throw error;
  }
}));

app.post('/api/auth/login', asyncHandler(async (request, response) => {
  const { email, password } = request.body;
  await connectDatabase();
  const account = await Account.findOne({ email: email?.trim().toLowerCase() }).select('+passwordHash');
  if (!account || typeof password !== 'string' || !(await verifyPassword(password, account.passwordHash))) {
    return response.status(401).json({ message: 'Email or password is incorrect.' });
  }
  return response.json({ user: { name: account.name, email: account.email }, token: createSession(account) });
}));

app.get('/api/auth/me', asyncHandler(async (request, response) => {
  const session = readSession(request);
  if (!session) return response.status(401).json({ message: 'Your session has expired.' });
  await connectDatabase();
  const account = await Account.findById(session.id);
  if (!account) return response.status(401).json({ message: 'Account not found.' });
  return response.json({ user: { name: account.name, email: account.email } });
}));

app.post('/api/audits', asyncHandler(async (request, response) => {
  const { email } = request.body;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || '')) return response.status(400).json({ message: 'Please enter a valid email address.' });
  await connectDatabase();
  await Audit.create({ email: email.trim().toLowerCase() });
  return response.status(201).json({ message: 'Your free SEO audit request has been received.' });
}));

app.post('/api/page-audit', asyncHandler(async (request, response) => {
  const pageUrl = typeof request.body.url === 'string' ? request.body.url.trim() : '';
  if (!pageUrl) return response.status(400).json({ message: 'Enter a page URL to analyze.' });
  try {
    const page = await fetchPageHtml(pageUrl);
    return response.json({ ...extractPageDetails(page.html), url: page.finalUrl });
  } catch (error) {
    return response.status(400).json({ message: error.message || 'Could not analyze that page.' });
  }
}));

app.use('/api', (_request, response) => {
  response.status(404).json({ message: 'API route not found.' });
});

app.use((error, _request, response, _next) => {
  console.error(error);
  response.status(500).json({ message: 'The server could not complete that request.' });
});

if (require.main === module) {
  app.listen(port, () => console.log(`Rankly is running at http://localhost:${port}`));
}

module.exports = app;
