require('dotenv-safe').config();

const express = require('express');

const app = express();
const http = require('http').Server(app);

const io = require('socket.io')(http);
const { v4: uuid } = require('uuid');
const logger = require('./logger');

const { PORT } = process.env;

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

  logger.log('Socket client connected', { hostId });

  // join unique room for this host
  socket.join(hostId);

  socketLookup[hostId] = socket.id;

  socket.on('disconnect', () => {
    logger.log('Socket client disconnected', { hostId });
    delete socketLookup[hostId];
  });

  socket.on('response', (payload) => {
    const { requestId, data, status = 200, headers } = payload;
    if (responseObjLookup[requestId]) {
      logger.info(`Responding back with response for request: ${requestId}`, {
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

  logger.info(`Forwarding the request: ${requestId}`, data);
  io.sockets.in(hostId).emit('request', data);

  // we don't respond to the request, but just track this response obj in memory
  // on receiving response via Socket client along with request id, we will use the response object

  responseObjLookup[requestId] = res;
});

http.listen(PORT, () => {
  logger.info(`listening on *:${PORT}`);
});
