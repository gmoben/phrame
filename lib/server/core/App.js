import express from 'express';
import http from 'http';
import SocketIO from 'socket.io';
import mongoose from 'mongoose';
import {values} from 'lodash';
import debug from 'debug';

export default class App {
  /**
   * Initalize express application and socket.io.
   * @param  {object} models Models to use.
   * @param  {object} config Configuration to use.
   */
  constructor(models, config) {
    this.models = models;
    this.config = config;

    this.debug = debug(this.constructor.name);

    /**
     * @member {express.Application} app
     * @member {http.Server} server
     * @member {socketio.Server} io
     */
    this.app = express();
    this.server = http.Server(this.app);
    this.io = SocketIO(this.server);

    this.config.express(this.app);

    this.io.on('connection', socket => {
      this.debug('[socket.io]', 'Client connected');
      this.socket = socket;
      let events = this.config.socket ? this.config.socket.events : undefined;
      this.setSocket(this.socket, events);
    });
  }

  /**
   * Listen to incoming requests.
   * @param  {number} port      Server port
   * @param  {string} [hostname=localhost]  Server hostname
   * @return {Promise.<Object>} {address, port}
   */
  listen(port, hostname='127.0.0.1') {
    return new Promise((resolve, reject) => {
      this.server.listen(port, hostname, err => {
        if (err) reject(err);
        let addr = this.server.address();
        let uri = addr.address + ':' + addr.port;
        this.debug('[express]', 'Listening @ ', uri);

        // /** @member {socket.io-client.Manager} */
        // this.ioClient = SocketIOClient('ws://' + uri);

        this.connectDB(addr.address)
          .then(() => resolve(addr))
          .catch(e => reject(e));
      });
    });
  }

  /**
   * Close the server.
   * @return {Promise.<string>} Success message
   */
  close() {
    return new Promise((resolve, reject) => {
      this.server.close(err => {
        if (err) reject(err);
        this.disconnectDB()
          .then(resolve)
          .catch(reject);
      });
    });
  }

  /**
   * Connect mongoose to mongodb instance.
   * @param {Object} [options]
   * @param {string} [options.db=test]  Database name
   * @param {string} [options.hostname=localhost]   Host name
   * @param {Object} [options.options]  `mongoose.connect` options
   * @return {Promise.<string>}  URI of mongodb instance.
   */
  connectDB(hostname, db, options) {
    db = db || 'test';
    hostname = hostname || '127.0.0.1';
    options = options || {};

    return new Promise((resolve, reject) => {
      let uri = ['mongodb://', hostname, '/', db].join('');
      mongoose.connect(uri, options, err => {
        if (err) reject(err);
        else {
          this.debug('[mongoose] Connected to', uri);
          resolve(uri);
        }
      });
    });
  }

  disconnectDB() {
    return new Promise((resolve, reject) => {
      mongoose.disconnect(err => {
        if (err) reject(err);
        this.debug('[mongoose]', 'Disconnected');
        resolve();
      });
    });
  }

  /**
   * Add a new socket to all models.
   * @param  {socketio.Socket} socket    Socket.io instance.
   * @param  {Object} [events]           `mongoose` hooks to listen to.
   */
  addSocket(socket, events) {
    values(this.models).forEach(model => model.addSocket(socket, events));
  }
}
