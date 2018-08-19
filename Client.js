const { Client: ErisClient } = require('eris');
const AudioPlayer = require('./audioPlayer');
const SocketServer = require('./socketServer');
const WebServer = require('./webServer');
const config = require('./config');


class Client extends ErisClient {
  constructor () {
    super(config.token);

    this.players = new Map();
  }

  getPlayer (guildId) {
    if (!this.players.has(guildId)) {
      this.players.set(guildId, new AudioPlayer(this, guildId));
    }

    return this.players.get(guildId);
  }

  start () {
    this.web = new WebServer(this);
    this.ws  = new SocketServer(this);

    this.connect();
  }
}

module.exports = Client;
