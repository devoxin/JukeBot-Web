class Storage extends Map {
  constructor () {
    super();
  }

  getOrCreate (key, action) {
    if (!this.has(key)) {
      this.set(key, action(key));
    }

    return this.get(key);
  }
}

module.exports = Storage;
