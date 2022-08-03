const execToPromise = require('../utils/execToPromise');
const writeToPromise = require('../utils/writeToPromise');

// Takes the secret from the env variable and creates the secret.json file needed to auth users
const writeSecret = async () => {
  try {
    const googleEnvSecret = process.env.GOOGLE_CLOUD_STORAGE;
    const keyString = Buffer.from(googleEnvSecret, 'base64').toString('ascii');
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
  console.log('IMAGE INITIALIZE');
  console.log(`goldctl imgtest init --work-dir ./tmp --commit ${githubCommit} --keys-file ./keys.json --instance lottie-animation-community --bucket lottie-animation-community-tests`);
};

const uploadImage = async (imagePath, testName) => {
  try {
    // Adds an image to the current imgtest process.
    // the --test-name argument should be different for each animation
    const response = await execToPromise(`goldctl imgtest add --work-dir ./tmp --test-name "${testName}" --png-file "${imagePath}"`);
    console.log('IMAGE UPLOAD SUCCESS');
    console.log(response);
    console.log(`goldctl imgtest add --work-dir ./tmp --test-name "${testName}" --png-file "${imagePath}"`);
  } catch (error) {
    console.log('IMAGE UPLOAD ERROR', error);
    //
  }
};

const finalize = async () => {
  try {
    // finalizes the process
    const response = await execToPromise('goldctl imgtest finalize --work-dir ./tmp');
    console.log('IMAGE FINALIZE');
    console.log(response);
  } catch (error) {
    //
    console.log('FINALIZE ERROR');
    console.log(error);
  }
};

module.exports = {
  initialize,
  uploadImage,
  finalize,
};
