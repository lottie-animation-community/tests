const { exec } = require('child_process');

const promiseExec = (command) => (
  new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }
      if (stdout) {
        resolve(stdout);
        return;
      }
      reject(stderr);
    });
  })
);

module.exports = promiseExec;
