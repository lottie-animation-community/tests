const fs = require('fs');
const core = require('@actions/core');
const github = require('@actions/github');
const validate = require('./index.js');

const examplesDirectory = '../examples/'
let totalFiles = 0;
let failedFiles = [];

function validateFile(error, data, fileName) {
  try {
    if (error) {
      throw error;
    } else {
      const schemaValidation = validate(JSON.parse(data));
      if (schemaValidation?.errors.length) {
        failedFiles.push({
          fileName,
          error: schemaValidation.errors,
        })
      } else {
      }
    }
  } catch (error) {
    failedFiles.push({
      fileName,
      error,
    })
  }
  fileProcessed()
}

function fileProcessed() {
  totalFiles -= 1;
  if (totalFiles === 0) {
    if (failedFiles.length) {
      core.setFailed(failedFiles);
    } else {
      console.log('NO ERRORS');
    }
  }
}

fs.readdir(examplesDirectory, (err, files) => {
  totalFiles = files.length;
  files.forEach(fileName => {
      fs.readFile(examplesDirectory + fileName,  'utf8',  (error, data) => validateFile(error, data, fileName));
  });
});