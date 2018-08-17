const ytdl = require('ytdl-core');


class AudioPlayer {
  constructor(client, guildId) {
    this._client = client;
    this._guildId = guildId;
    this.queue = [];
    this.current = null;
    this.msgChannel = null;
    this.skips = new Set();
    this.repeat = 0;
  }

  /*
   * Sets repeat mode
   * 0 - off
   * 1 - single
   * 2 - all
   */
  setRepeat(mode) {
    const val = Number(mode) || 0;
    this.repeat = Math.max(Math.min(val, 2), 0);;
  }

  getRepeatReadable() {
    if (this.repeat === 2) {
      return 'all';
    } else if (this.repeat === 1) {
      return 'single';
    } else if (this.repeat === 0) {
      return 'none';
    } else {
      return 'unknown';
    }
  }

  voteSkip(userId) {
    this.skips.add(userId);
    return this.skips.size;
  }

  setAnnounce(channelId) {
    this.msgChannel = channelId;
  }

  async add(track) {
    this.queue.push(track);
    await this._announce('Track Enqueued', track.title);

    if (this.queue.length === 1 && !this.isPlaying()) {
      this.play();
    }
  }

  async play() {
    if (!this.isConnected()) {
      return;
    }

    if (this.queue.length === 0) {
      this._announce('Queue Concluded', 'Queue more songs to keep the party going!');
      this.repeat = 0;
      this.current = null;

      if (this._client.voiceConnections.has(this._guildId)) {
        this._client.leaveVoiceChannel(this._client.voiceConnections.get(this._guildId).channelID);
      }

      return;
    }

    this.current = this.queue.shift();

    const voiceConnection = this._client.voiceConnections.get(this._guildId);
    //const playbackURL = await getFormats(this.current.id)

    //this.current.duration = await getDuration(this.current.id);

    //if (!playbackURL) {
    //  await this._announce('Track Unplayable', 'This track is not playable, skipping...');
    //  return this.play();
    //}

    //console.log(playbackURL);

    this._announce('Now Playing', this.current.title);

    voiceConnection.play(ytdl(this.current.id, { filter: 'audioonly' }));

    voiceConnection.once('end', () => {
      if (this.repeat === 2) {
        this.queue.push(this.current);
      } else if (this.repeat === 1) {
        this.queue.unshift(this.current);
      }

      this.skips.clear();
      this.play();
    });
  }

  stop() {
    const voiceConnection = this._client.voiceConnections.get(this._guildId);

    if (!voiceConnection) {
      return;
    }

    voiceConnection.stopPlaying();
  }

  destroy() {
    this.queue.clear();
    this.skips.clear();

    if (this._client.voiceConnections.has(this._guildId)) {
      this._client.voiceConnections.get(this._guildId).stopPlaying();
      this._client.leaveVoiceChannel(this._client.voiceConnections.get(this._guildId).channelID);
    }

    this._client.audioPlayers.delete(this._guildId);
  }

  isConnected() {
    return this._client.voiceConnections.has(this._guildId) && this._client.voiceConnections.get(this._guildId).channelID !== null
  }

  isPlaying() {
    return this.isConnected() && this.current !== null;
  }

  async _announce(title, description) {
    if (!this.msgChannel) {
      return;
    }

    const channel = this._client.getChannel(this.msgChannel);

    if (!channel) {
      return;
    }

    return channel.createMessage({
      embed: {
        title,
        description
      }
    });
  }
}

async function getFormats (id) {
  const info = await ytdl.getInfo(id).catch(() => null);

  if (!info || !info.formats) {
      return null;
  }

  const formats = info.formats.filter(fmt => ['251', '250', '249'].includes(fmt.itag)); // opus-only
  formats.sort((a, b) => b.itag - a.itag);

  return formats.length > 0 ? formats[0].url : null;
}

async function getDuration (id) {
  const info = await ytdl.getInfo(id);
  return info.length_seconds * 1000;
}

module.exports = AudioPlayer;
