const Client = require('./Client');
const config = require('./config');

const client = new Client();

client.once('ready', () => {
  console.log('gucci gang');
});

client.on('messageCreate', async (msg) => {
  if (msg.author.bot || !msg.channel.guild || !msg.content.startsWith(config.prefix)) {
    return;
  }

  const [command, ...args] = msg.content.slice(config.prefix.length).split(' ');
  const player = client.getPlayer(msg.channel.guild.id);

  if ('join' === command) {
    await client.joinVoiceChannel(msg.member.voiceState.channelID);
    player.setAnnounce(msg.channel.id);
  }

  if ('skip' === command) {
    player.stop();
  }
});

client.start();
