require('dotenv-safe').config();

const express = require('express');

const app = express();
const http = require('http').Server(app);

const io = require('socket.io')(http);
const { v4: uuid } = require('uuid');

const { PORT } = process.env;

const responseObjLookup = {};
const socketLookup = {};

app.use(express.json());

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

  console.log('Socket client connected', { hostId });

  // join unique room for this host
  socket.join(hostId);

  socketLookup[hostId] = socket.id;

  socket.on('disconnect', () => {
    console.log('Socket client disconnected', { hostId });
    delete socketLookup[hostId];
  });

  socket.on('response', (payload) => {
    const { requestId, data, status = 200, headers } = payload;
    if (responseObjLookup[requestId]) {
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
  const { method, headers, query, path, params, body } = req;
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
  };

  console.info('Forwarding the request', data);
  io.sockets.in(hostId).emit('request', data);

  // we don't respond to the request, but just track this response obj in memory
  // on receiving response via Socket client along with request id, we will use the response object

  responseObjLookup[requestId] = res;
});

http.listen(PORT, () => {
  console.log(`listening on *:${PORT}`);
});
