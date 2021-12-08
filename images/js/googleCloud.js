const { Storage } = require('@google-cloud/storage');

const bucketName = 'gs://lottie-animation-community-tests';
let storage;

const initialize = async () => {
  try {
    const key = process.env.GOOGLE_CLOUD_STORAGE;
    const keyString = Buffer.from(key, 'base64').toString('ascii');
    const storageKey = JSON.parse(keyString);
    storage = new Storage({
      credentials: storageKey,
      projectId: storageKey.project_id,
    });
  } catch (error) {
    console.log('Could not initialize Google Cloud', error); // eslint-disable-line no-console
  }
};

const uploadAsset = async (filePath, destination) => {
  try {
    await storage.bucket(bucketName).upload(filePath, {
      destination,
    });
  } catch (error) {
    console.log('Could not upload asset to Google Cloud', error); // eslint-disable-line no-console
  }
};

const googleCloudHelper = {
  initialize,
  uploadAsset,
};

module.exports = googleCloudHelper;
