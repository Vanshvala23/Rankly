const serverless = require('serverless-http');
const app = require('../../server');

const handler = serverless(app);

module.exports.handler = (event, context) => {
  if (!event.path.startsWith('/api')) {
    event.path = `/api${event.path}`;
  }
  if (event.rawUrl) {
    event.rawUrl = event.rawUrl.replace('/.netlify/functions/api', '');
  }
  return handler(event, context);
};
