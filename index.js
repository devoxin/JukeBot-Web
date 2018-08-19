const { Client }  = require('eris');
const Storage     = require('./storage');
const config      = require('./config');
const audioPlayer = require('./audioPlayer');
const webServer   = require('./webServer');

const client  = new Client(config.token);
const players = new Storage();
const web     = new webServer(client, players);

client.once('ready', () => {
  console.log('gucci gang');
});

client.on('messageCreate', async (msg) => {
  if (msg.author.bot || !msg.channel.guild || !msg.content.startsWith(config.prefix)) {
    return;
  }

  const [command, ...args] = msg.content.slice(config.prefix.length).split(' ');
  const player = players.getOrCreate(msg.channel.guild.id, (key) => new audioPlayer(client, key));

  if ('join' === command) {
    await client.joinVoiceChannel(msg.member.voiceState.channelID);
    player.setAnnounce(msg.channel.id);
  }

  if ('skip' === command) {
    player.stop();
  }
});

client.connect();
