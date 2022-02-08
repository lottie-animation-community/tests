const execToPromise = require('../utils/execToPromise');
const writeToPromise = require('../utils/writeToPromise');

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

const createKeysFile = async () => {
  const keys = {
    origin: 'github',
  };
  await writeToPromise('./keys.json', JSON.stringify(keys));
};

const initialize = async () => {
  await writeSecret();
  await execToPromise('goldctl auth --work-dir ./tmp --service-account ./secret.json');
  const githubCommit = process.env.GITHUB_SHA;
  await createKeysFile();
  await execToPromise(`goldctl imgtest init --work-dir ./tmp --commit ${githubCommit} --keys-file ./keys.json --instance lottie-animation-community --bucket lottie-animation-community-tests`);
};

const uploadImage = async (imagePath, testName) => {
  try {
    await execToPromise(`goldctl imgtest add --work-dir ./tmp --test-name "${testName}" --png-file "${imagePath}"`);
  } catch (error) {
    //
  }
};

const finalize = async () => {
  try {
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
