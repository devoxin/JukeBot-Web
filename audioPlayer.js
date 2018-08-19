const ytdl = require('ytdl-core');


class AudioPlayer {
  constructor (client, guildId) {
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
  setRepeat (mode) {
    const val = Number(mode) || 0;
    this.repeat = Math.max(Math.min(val, 2), 0);;
  }

  getRepeatReadable () {
    if (2 === this.repeat) {
      return 'all';
    } else if (1 === this.repeat) {
      return 'single';
    } else if (0 === this.repeat) {
      return 'none';
    } else {
      return 'unknown';
    }
  }

  voteSkip (userId) {
    this.skips.add(userId);
    return this.skips.size;
  }

  setAnnounce (channelId) {
    this.msgChannel = channelId;
  }

  async add (track) {
    this.queue.push(track);

    if (1 === this.queue.length && !this.isPlaying()) {
      this.play();
    } else {
      this._client.ws.dispatchPayload(this._guildId, 'QUEUE_ADD', track);
    }
  }

  async play () {
    if (!this.isConnected()) {
      return;
    }

    if (0 === this.queue.length) {
      this.repeat = 0;
      this.current = null;
      return;
    }

    this.current = this.queue.shift();
    this._client.ws.dispatchPayload(this._guildId, 'QUEUE_REMOVE', null);

    const voiceConnection = this._client.voiceConnections.get(this._guildId);
    const playbackURL = await getFormats(this.current.id);

    if (!playbackURL) {
      await this._announce('Track Unplayable', `${this.current.title} is unplayable.`);
      return this.play();
    }

    //voiceConnection.play(ytdl(this.current.id, { filter: 'audioonly' }));
    await voiceConnection.play(playbackURL, { format: 'webm' });
    this._client.ws.dispatchPayload(this._guildId, 'TRACK_CHANGE', this.current);

    voiceConnection.once('end', () => {
      if (2 === this.repeat) {
        this.queue.push(this.current);
      } else if (1 === this.repeat) {
        this.queue.unshift(this.current);
      }

      this.skips.clear();
      this.play();
    });
  }

  stop () {
    const voiceConnection = this._client.voiceConnections.get(this._guildId);

    if (!voiceConnection) {
      return;
    }

    voiceConnection.stopPlaying();
  }

  destroy () {
    this.queue.clear();
    this.skips.clear();

    if (this._client.voiceConnections.has(this._guildId)) {
      this._client.voiceConnections.get(this._guildId).stopPlaying();
      this._client.leaveVoiceChannel(this._client.voiceConnections.get(this._guildId).channelID);
    }

    this._client.audioPlayers.delete(this._guildId);
  }

  isConnected () {
    return this._client.voiceConnections.has(this._guildId) && null !== this._client.voiceConnections.get(this._guildId).channelID;
  }

  isPlaying () {
    return this.isConnected() && null !== this.current;
  }

  async _announce (title, description) {
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

  return 0 < formats.length ? formats[0].url : null;
}

module.exports = AudioPlayer;
