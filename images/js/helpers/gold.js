const execToPromise = require('../utils/execToPromise');
const writeToPromise = require('../utils/writeToPromise');

// Takes the secret from the env variable and creates the secret.json file needed to auth users
const writeSecret = async () => {
  try {
    const googleEnvSecret = process.env.GOOGLE_CLOUD_STORAGE;
    const keyString = Buffer.from(googleEnvSecret, 'base64').toString('ascii');
    console.log('KEYSTRING ==> ', keyString);
    await writeToPromise('./secret.json', keyString);
    return true;
  } catch (err) {
    throw new Error('Could not write secret');
  }
};

// Creates the keys.json file with the metadata associated to the images
// TODO: decide what additional information would be good to include
const createKeysFile = async () => {
  const keys = {
    origin: 'github',
  };
  await writeToPromise('./keys.json', JSON.stringify(keys));
};

const initialize = async () => {
  await writeSecret();
  // authentication process
  await execToPromise('goldctl auth --work-dir ./tmp --service-account ./secret.json');
  await createKeysFile();
  const githubCommit = process.env.GITHUB_SHA;
  // initalizes the process
  await execToPromise(`goldctl imgtest init --work-dir ./tmp --commit ${githubCommit} --keys-file ./keys.json --instance lottie-animation-community --bucket lottie-animation-community-tests`);
};

const uploadImage = async (imagePath, testName) => {
  try {
    // Adds an image to the current imgtest process.
    // the --test-name argument should be different for each animation
    await execToPromise(`goldctl imgtest add --work-dir ./tmp --test-name "${testName}" --png-file "${imagePath}"`);
  } catch (error) {
    //
  }
};

const finalize = async () => {
  try {
    // finalizes the process
    await execToPromise('goldctl imgtest finalize --work-dir ./tmp');
  } catch (error) {
    //
  }
};

module.exports = {
  initialize,
  uploadImage,
  finalize,
};
