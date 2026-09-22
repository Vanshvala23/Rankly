const mongoose = require('mongoose');

const accountSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  passwordHash: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const auditSchema = new mongoose.Schema({
  email: { type: String, required: true, lowercase: true, trim: true, index: true },
  createdAt: { type: Date, default: Date.now }
});

const Account = mongoose.models.Account || mongoose.model('Account', accountSchema);
const Audit = mongoose.models.Audit || mongoose.model('Audit', auditSchema);

let connectionPromise;

async function connectDatabase() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not configured.');
  if (mongoose.connection.readyState === 1) return mongoose.connection;
  if (!connectionPromise) {
    connectionPromise = mongoose.connect(uri, { bufferCommands: false }).catch((error) => {
      connectionPromise = undefined;
      throw error;
    });
  }
  await connectionPromise;
  return mongoose.connection;
}

module.exports = { Account, Audit, connectDatabase };
