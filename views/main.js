let guildId;
let ws;
let interval;

function load (playing, currentMs, totalMs) {
  guildId = window.location.pathname.split('/')[2];

  if (playing) {
    handleProgressUpdate(currentMs, totalMs);
  }

  ws = new WebSocket(`ws://${location.host.split(':')[0]}:8080`);
  ws.onopen = () => {
    console.log('WS opened! Sending...');
    ws.send(`guild:${guildId}`);
  };
  ws.onmessage = processWsMessage;
}

function processWsMessage (msg) {
  console.log('Received WebSocket message', msg);
  const data = JSON.parse(msg.data);

  if ('TRACK_CHANGE' === data.event) {
    handleProgressUpdate(0, data.d.durationMs);

    document.querySelector('.current-track img').src = `https://i.ytimg.com/vi/${data.d.id}/default.jpg`;

    const title = document.querySelector('.current-track #title a');
    title.href = `https://youtube.com/watch?v=${data.d.id}`;
    title.innerText = data.d.title;

    document.querySelector('.current-track #duration').innerText = data.d.duration;
  } else if ('QUEUE_REMOVE' === data.event) {
    const tracks = document.querySelector('.track-list');
    if (tracks.children[1]) {
      tracks.children[1].remove();
    }

    tracks.firstElementChild.innerText = `Track List (${tracks.children.length - 1} tracks)`;
  } else if ('QUEUE_ADD' === data.event) {
    const tracks = document.querySelector('.track-list');
    const span = document.createElement('span');
    span.innerText = data.d.title;

    tracks.appendChild(span);
    tracks.firstElementChild.innerText = `Track List (${tracks.children.length - 1} tracks)`;
  }
}

function handleProgressUpdate (currentMs, totalMs) {
  const start = Date.now();
  clearInterval(interval);

  interval = setInterval(() => {
    const diff = Date.now() - start;
    const pc = (currentMs + diff) / totalMs * 100;

    document.querySelector('div.progress-bar').style.width = `${pc}%`;

    if (100 <= pc) {
      clearInterval(interval);
    }
  }, 100);
}

async function search () {
  const resultList = document.getElementById('results-list');

  while (resultList.firstChild) {
    resultList.removeChild(resultList.firstChild);
  }

  const query = document.getElementById('search-identifier').value;
  const results = await request('GET', `/search?identifier=${query}`);

  resultList.innerHTML = results;
}

function checkEnter (event) {
  if (13 === event.keyCode) {
    search();
  }
}

function addToQueue (track) {
  const resultList = document.getElementById('results-list');

  while (resultList.firstChild) {
    resultList.removeChild(resultList.firstChild);
  }

  request(
    'PUT',
    `${guildId}/queue`,
    {
      'Content-Type': 'application/json'
    },
    track
  );
}

function request (method, route, headers = {}, body) {
  return new Promise((resolve, reject) => {
    const req = new XMLHttpRequest();
    req.open(method, route, true);

    for (const key of Object.keys(headers)) {
      req.setRequestHeader(key, headers[key]);
    }

    req.onload = () => {
      if (req.readyState === XMLHttpRequest.DONE) {
        if (200 <= req.status && 400 > req.status) {
          if (/application\/json/.test(req.getResponseHeader('Content-Type'))) {
            resolve(JSON.parse(req.responseText));
          } else {
            resolve(req.responseText);
          }
        } else {
          reject(req.responseText);
        }
      }
    };

    req.onerror = reject;

    if ('object' === typeof body) {
      body = JSON.stringify(body);
    }

    req.send(body);
  });
}
