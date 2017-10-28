'use strict';

const express = require('express');
const mysql = require('mysql');
const next = require('next');
const app = next({ dev: true });
const handle = app.getRequestHandler();
const normalizePort = require('./lib/normalize-port');

// Setup some port stuff.
process.title = process.argv[2];
const port = normalizePort(process.env.PORT || 3000);

// Establish a DB connection.
let connection = mysql.createConnection({
  host: '127.0.0.1',
  user: 'root',
  password: '',
  database: 'school_finder',
  'supportBigNumbers': true
});

app.prepare()
  .then(() => {
    const server = express();

    server.get('/api/v1/school', (request, response) => {
      connection.query('SELECT s.id, s.name, s.address, s.latitude, s.longitude, s.startage, s.endage, s.num_students, s.type, c.name as city, st.name as state from school s INNER JOIN city c on s.city = c.id INNER JOIN state st on st.id = c.state', function (error, result) {
        if (error) {
          return response.status(500).send(error.message);
        }
        response.writeHead(200, { 'Content-Type': 'application/json'});
        response.end(JSON.stringify(result));
      });
    });

    server.get(['/api/v1/state', '/api/v1/state/:id'], (request, response) => {
      let condition = '';
      let params = [];
      if (request.params.id) {
        condition = ' WHERE id = ? OR abbr = ? OR name = ?';
        params = [request.params.id, request.params.id, request.params.id];
      }
      connection.query('SELECT id, name, abbr from state' + condition, params, function (error, result) {
        if (error) {
          return response.status(500).send(error.message);
        }
        response.writeHead(200, { 'Content-Type': 'application/json'});
        response.end(JSON.stringify(result));
      });
    });

    server.get('*', (req, res) => {
      return handle(req, res);
    });

    server.listen(port, (err) => {
      if (err) {
        throw err;
      }
      console.log('> Ready new on localhost:' + port);
    });
  });
