const config     = require('./config');
const express    = require('express');
const handlebars = require('express-handlebars');
const bodyParser = require('body-parser');
const { Worker } = require('worker_threads');

class WebServer {
  constructor (client) {
    this.client = client;
    this.start();
  }

  searchFor (identifier) {
    return new Promise((resolve, reject) => {
      const worker = new Worker('./searchHook.js', {
        workerData: identifier
      });

      worker.once('message', (msg) => {
        if (Array.isArray(msg)) {
          resolve(msg);
        } else {
          reject(msg);
        }
      });
      worker.once('error', reject);
    });
  }

  start () {
    const server = this.server = express();

    server.engine('.hbs', handlebars({
      extname: '.hbs',
      helpers: {
        json: (ctx) => JSON.stringify(ctx)
      }
    }));
    server.set('view engine', '.hbs');
    server.use(express.static('views'));
    server.use(bodyParser.json());
    server.use(bodyParser.urlencoded({ extended: true }));

    server.get('/guild/:id', (req, res) => {
      const guildId = req.params.id;

      if (!guildId || !this.client.guilds.has(guildId)) {
        return res.status(404).send('No guilds found matching that ID.');
      }

      const player = this.client.getPlayer(guildId);
      const voiceConnection = this.client.voiceConnections.get(guildId);
      const channel = voiceConnection && this.client.getChannel(voiceConnection.channelID);
      const isPlaying = voiceConnection && voiceConnection.playing;
      const progressMs = isPlaying ? voiceConnection.current.playTime : 0;
      const progressPc = isPlaying ? progressMs / player.current.durationMs * 100 : 0;
      const current = Object.assign({ progressMs, progressPc }, player.current);

      res.render('guild', {
        name: this.client.guilds.get(guildId).name,
        queue: player.queue,
        playing: !!player.current,
        current,
        channel: {
          connected: !!channel,
          name: channel ? channel.name : null,
          colour: channel ? '#35d563' : '#be2f2f'
        }
      });
    });

    server.get('/search', (req, res) => {
      if (!req.query.identifier) {
        return res.status(400).json({ error: 'No identifier provided.' });
      }

      this.searchFor(req.query.identifier)
        .catch((err) => {
          res.status(500).json({ error: err });
        })
        .then((results) => {
          res.render('results', { results });
        });
    });

    server.put('/guild/:id/queue', (req, res) => {
      const track = req.body;

      const player = this.client.getPlayer(req.params.id);
      player.add(track);

      res.status(204).send();
    });

    server.listen(config.webPort, () => {
      console.log(`WebServer running on port ${config.webPort}`);
    });
  }
}

module.exports = WebServer;
