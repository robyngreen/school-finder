'use strict';

const express = require('express');
const next = require('next');
const app = next();
const handle = app.getRequestHandler();
const normalizePort = require('./lib/normalize-port');

process.title = process.argv[2];

const port = normalizePort(process.env.PORT || 3000);

app.prepare()
  .then(() => {
    const newServer = express();

    newServer.get('*', (req, res) => {
      return handle(req, res);
    });

    newServer.listen(port, (err) => {
      if (err) {
        throw err;
      }
      console.log('> Ready on localhost:' + port);
    });
  });
