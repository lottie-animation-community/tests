const fs = require('fs');

const writeToPromise = (file, content) => (
  new Promise((resolve, reject) => {
    fs.writeFile(file, content, (err, success) => {
      if (err) {
        reject(err);
      } else {
        resolve(success);
      }
    });
  })
);

module.exports = writeToPromise;
