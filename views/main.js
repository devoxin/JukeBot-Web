function request(method, route, headers = {}, body) {
  return new Promise((resolve, reject) => {
    const req = new XMLHttpRequest();
    req.open(method, route, true);

    for (const key of Object.keys(headers)) {
      req.setRequestHeader(key, headers[key]);
    }

    req.onload = () => {
      if (req.readyState === XMLHttpRequest.DONE) {
        if (req.status >= 200 && req.status < 400) {
          if (/application\/json/.test(req.getResponseHeader('Content-Type'))) {
            resolve(JSON.parse(req.responseText));
          } else {
            resolve(req.responseText);
          }
        } else {
          reject(req.responseText);
        }
      }
    }

    req.onerror = reject;

    if (typeof body === 'object') {
      body = JSON.stringify(body);
    }

    req.send(body);
  });
}

async function search() {
  const resultList = document.getElementById('results-list');

  while (resultList.firstChild) {
    resultList.removeChild(resultList.firstChild);
  }

  const query = document.getElementById('search-identifier').value;
  const results = await request('GET', `/search?identifier=${query}`);

  resultList.innerHTML = results;
}

function checkEnter(event) {
  if (event.keyCode === 13) {
    search();
  }
}

function addToQueue(track) {
  const guildId = window.location.pathname.split('/')[2];

  request(
    'PUT',
    `${guildId}/queue`,
    {
      'Content-Type': 'application/json'
    },
    track
  );
}
