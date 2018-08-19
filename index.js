const config      = require('./config');
const audioPlayer = require('./audioPlayer');
const { Client }  = require('eris');
const express     = require('express');
const handlebars  = require('express-handlebars');
const bodyParser  = require('body-parser');
const threadPool  = require('worker-threads-pool');

const client    = new Client(config.token);
const players   = new Map();
const pool      = new threadPool({ max: 5 });
const webServer = express();

webServer.engine('.hbs', handlebars({
  extname: '.hbs',
  helpers: {
    json: (ctx) => JSON.stringify(ctx)
  }
}));
webServer.set('view engine', '.hbs');
webServer.use(express.static('views'));
webServer.use(bodyParser.json());
webServer.use(bodyParser.urlencoded({ extended: true }));

webServer.get('/guild/:id', (req, res) => {
  const guildId = req.params.id;

  if (!guildId || !client.guilds.has(guildId)) {
    return res.status(404).send('No guilds found matching that ID.');
  }

  const player = getPlayer(guildId);
  const isConnected = client.voiceConnections.has(guildId);
  const channel = isConnected ? client.getChannel(client.voiceConnections.get(guildId).channelID) : null;

  res.render('guild', {
    name: client.guilds.get(guildId).name,
    queue: player.queue,
    current: player.current,
    channel: {
      connected: isConnected,
      name: channel ? channel.name : null,
      colour: isConnected ? '#35d563' : '#be2f2f'
    }
  });
});

webServer.get('/search', (req, res) => {
  if (!req.query.identifier) {
    return res.status(400).json({ error: 'No identifier provided.' });
  }

  searchFor(req.query.identifier)
    .catch((err) => {
      res.status(500).json({ error: err });
    })
    .then((results) => {
      res.render('results', { results });
    });
});

webServer.put('/guild/:id/queue', (req, res) => {
  const track = req.body;

  const player = getPlayer(req.params.id);
  player.add(track);

  res.status(204).send();
});

client.once('ready', () => {
  console.log('gucci gang');
});

client.on('messageCreate', async (msg) => {
  if (msg.author.bot || !msg.channel.guild || !msg.content.startsWith(config.prefix)) {
    return;
  }

  const [command, ...args] = msg.content.slice(config.prefix.length).split(' ');

  if ('join' === command) {
    await client.joinVoiceChannel(msg.member.voiceState.channelID);

    const player = getPlayer(msg.channel.guild.id);
    player.setAnnounce(msg.channel.id);
  }

  if ('skip' === command) {
    const player = getPlayer(msg.channel.guild.id);
    player.stop();
  }

  if ('web' === command) {
    msg.channel.createMessage(`http://127.0.0.1:420/guild/${msg.channel.guild.id}\nhttp://192.168.1.150:420/guild/${msg.channel.guild.id}`);
  }
});

function getPlayer (guildId) {
  if (!players.has(guildId)) {
    players.set(guildId, new audioPlayer(client, guildId));
  }

  return players.get(guildId);
}

function searchFor (identifier) {
  return new Promise((resolve, reject) => {
    pool.acquire('./searchHook.js', {
      workerData: identifier
    }, (worker, err) => {
      if (err) {
        return reject(err.message);
      }

      worker.once('message', (results) => {
        if (Array.isArray(results)) {
          resolve(results);
        } else {
          reject(results);
        }
      });
    });
  });
}

webServer.listen(config.webPort);
client.connect();
