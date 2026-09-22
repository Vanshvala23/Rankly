const express = require('express');
const crypto = require('node:crypto');
const path = require('node:path');
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

app.post('/api/auth/register', async (request, response) => {
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
});

app.post('/api/auth/login', async (request, response) => {
  const { email, password } = request.body;
  await connectDatabase();
  const account = await Account.findOne({ email: email?.trim().toLowerCase() }).select('+passwordHash');
  if (!account || typeof password !== 'string' || !(await verifyPassword(password, account.passwordHash))) {
    return response.status(401).json({ message: 'Email or password is incorrect.' });
  }
  return response.json({ user: { name: account.name, email: account.email }, token: createSession(account) });
});

app.get('/api/auth/me', async (request, response) => {
  const session = readSession(request);
  if (!session) return response.status(401).json({ message: 'Your session has expired.' });
  await connectDatabase();
  const account = await Account.findById(session.id);
  if (!account) return response.status(401).json({ message: 'Account not found.' });
  return response.json({ user: { name: account.name, email: account.email } });
});

app.post('/api/audits', async (request, response) => {
  const { email } = request.body;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || '')) return response.status(400).json({ message: 'Please enter a valid email address.' });
  await connectDatabase();
  await Audit.create({ email: email.trim().toLowerCase() });
  return response.status(201).json({ message: 'Your free SEO audit request has been received.' });
});

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
