const fs = require('fs');
const validate = require('./index.js');

const examplesDirectory = '../examples/'

fs.readdir(examplesDirectory, (err, files) => {
  files.forEach(file => {
      fs.readFile(examplesDirectory + file,  "utf8",  function (error, data) {
        try {
          const schemaValidation = validate(JSON.parse(data));
          if (schemaValidation?.errors.length) {
            console.log('HAS ERRORS')
          } else {
            console.log('NO ERRORS')
          }
        } catch (error) {
          console.log('ERROR WHILE VALIDATING')
        }
      });
  });
});