require('dotenv-safe').config();
const logger = require('./logger');
const jwt = require('jsonwebtoken');

const express = require('express');

const app = express();
const http = require('http').Server(app);

const io = require('socket.io')(http);
const { v4: uuid } = require('uuid');
const MESSAGES = require('./constants/messages');

const {
  PORT,
  USERNAME,
  PASSWORD,
  SECRET_KEY,
  IS_AUTH_ENABLED = 0,
} = process.env;

const responseObjLookup = {};
const socketLookup = {};

const rawBodySaver = (req, res, buf, encoding) => {
  if (buf && buf.length) {
    req.rawBody = buf.toString(encoding || 'utf8');
  }
};

app.use(express.json({ verify: rawBodySaver }));
app.use(express.urlencoded({ verify: rawBodySaver, extended: true }));
app.use(express.raw({ verify: rawBodySaver, type: '*/*' }));

// using auth middleware
io.use(function (socket, next) {
  // env variable gets converted to string thats why followed numeric approach
  if (Number(IS_AUTH_ENABLED) === 0) next();
  else {
    if (socket.handshake.query) {
      jwt.verify(
        socket.handshake.query.token,
        SECRET_KEY,
        function (err, decoded) {
          if (err) {
            logger.error(MESSAGES.ERROR.INVALID_TOKEN);
            return next(new Error(MESSAGES.ERROR.INVALID_TOKEN));
          }
          socket.decoded = decoded;
          next();
        }
      );
    } else {
      logger.error(MESSAGES.ERROR.INVALID_TOKEN);
      return next(new Error(MESSAGES.ERROR.INVALID_TOKEN));
    }
  }
});

io.on('connection', (socket) => {
  const {
    handshake: {
      query: { hostId },
    },
  } = socket;

  if (socketLookup[hostId]) {
    // if there is already a socket connection corresponding to the hostId (unique system & PORT)
    // we terminate it!
    socket.emit('duplicate');
    return;
  }

  logger.info('Socket client connected', { hostId });

  // join unique room for this host
  socket.join(hostId);

  socketLookup[hostId] = socket.id;

  socket.on('disconnect', () => {
    logger.info('Socket client disconnected', { hostId });
    delete socketLookup[hostId];
  });

  socket.on('response', (payload) => {
    const { requestId, data, status = 200, headers } = payload;
    if (responseObjLookup[requestId]) {
      console.info(`Responding back with response for request: ${requestId}`, {
        status,
        headers,
        data,
      });
      const res = responseObjLookup[requestId];
      // pass received status, headers & data as is
      res.set(headers);
      res.status(status).send(data);

      // now delete the response object as we no longer need that
      delete responseObjLookup[requestId];
    }
  });
});

app.get('/', (req, res) => {
  res.send('Up & running');
});

/** BASIC AUTH PROTECTED ROUTES START */

// make sure the routes you want to keep authenticated present below this middleware
app.use((req, res, next) => {
  const auth = { login: USERNAME, password: PASSWORD };
  const b64auth = (req.headers.authorization || '').split(' ')[1] || '';
  const [login, password] = Buffer.from(b64auth, 'base64')
    .toString()
    .split(':');

  if (login && password && login === auth.login && password === auth.password) {
    return next();
  }

  res.set('WWW-Authenticate', 'Basic realm="401"');
  res.status(401).send('Authentication required.');
});

app.get('/authenticate', (_req, res) => {
  // later on we can capture user details which could be used while generating token
  const token = jwt.sign({ USERNAME, PASSWORD }, SECRET_KEY);
  return res.send(token);
});

/** BASIC AUTH PROTECTED ROUTES END */

app.use('/:hostId?', (req, res) => {
  const { method, headers, query, path, params, body, rawBody } = req;
  const { hostId } = params;
  const requestId = uuid();

  //  TODO add support for cookies
  const data = {
    method,
    headers,
    query,
    path,
    requestId,
    body,
    rawBody,
  };

  console.info(`Forwarding the request: ${requestId}`, data);
  io.sockets.in(hostId).emit('request', data);

  // we don't respond to the request, but just track this response obj in memory
  // on receiving response via Socket client along with request id, we will use the response object

  responseObjLookup[requestId] = res;
});

http.listen(PORT, () => {
  logger.info(`listening on *:${PORT}`);
});
