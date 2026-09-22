const serverless = require('serverless-http');
const app = require('../../server');

const handler = serverless(app);

module.exports.handler = (event, context) => {
  const functionPrefix = '/.netlify/functions/api';
  const requestPath = event.path || event.rawPath || '/';
  const pathWithoutFunctionPrefix = requestPath.startsWith(functionPrefix)
    ? requestPath.slice(functionPrefix.length) || '/'
    : requestPath;
  event.path = pathWithoutFunctionPrefix.startsWith('/api')
    ? pathWithoutFunctionPrefix
    : `/api${pathWithoutFunctionPrefix}`;
  event.rawPath = event.path;
  event.rawUrl = event.rawUrl?.replace(functionPrefix, '') || event.path;
  return handler(event, context);
};
