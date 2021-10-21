/**
 * This retrieves all files located on the examples folder, then iterates
 * over each file and validates it conforms to the json schema defined on
 * the index.js file.
 * If one or more of the files is not well formed, it calls the failed
 * method, listing all files that didn't pass the validation and
 * their errors.
 */

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
  files.forEach(fileName => {
      if (fileName.indexOf('.json') !== -1) {
        totalFiles += 1;
        fs.readFile(examplesDirectory + fileName,  'utf8',  (error, data) => validateFile(error, data, fileName));
      }
  });
});