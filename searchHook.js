const { workerData, parentPort } = require('worker_threads');
const search = require('tubesearch');

search(workerData, 5)
  .catch((err) => {
    parentPort.postMessage(err.message);
  })
  .then((results) => {
    parentPort.postMessage(results);
  });
