'use strict';
/**
 * @file pbkdf2 example
 * @module cookie-encryption
 * @subpackage examples
 * @version 0.0.1
 * @author hex7c0 <hex7c0@gmail.com>
 * @license GPLv3
 */

/*
 * initialize module
 */
var cookiee = require('..'); // use require('cookie-encryption') instead
var app = require('express')();
var cookie = require('cookie-parser');

var vault = cookiee('ciao', {
  cipher: 'pbkdf2',
  encoding: 'base64', // output encoding
  extra: [ 'salt', 4, 5 ], // salt, iterations, keylen
});

app.use(cookie('foo')); // using only for parsing header cookie

app.get('/', function(req, res) {

  res.send('write: ' + vault.write(req, 'pippo'));
}).get('/r', function(req, res) {

  // throw TypeError
  res.send('read: ' + vault.read(req));
}).listen(3000);
console.log('starting "hello world" on port 3000');
