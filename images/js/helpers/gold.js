const execToPromise = require('../utils/execToPromise');
const writeToPromise = require('../utils/writeToPromise');

const goldPath = '${GOPATH}/bin/goldctl';

const writeSecret = async () => {
  try {
    const googleEnvSecret = process.env.GOOGLE_SECRET || 'eyJ0eXBlIjoic2VydmljZV9hY2NvdW50IiwicHJvamVjdF9pZCI6InNraWEtcHVibGljIiwicHJpdmF0ZV9rZXlfaWQiOiI5OWQxZDY2OWMyNzUwYWUyZDdkMmQyMGRlMzQ0YWFkN2EwY2NmYzBkIiwicHJpdmF0ZV9rZXkiOiItLS0tLUJFR0lOIFBSSVZBVEUgS0VZLS0tLS1cbk1JSUV1d0lCQURBTkJna3Foa2lHOXcwQkFRRUZBQVNDQktVd2dnU2hBZ0VBQW9JQkFRQ0xRVW8xbEY1d2o4QmRcbnRjU2NFeFNLaFJ6UTliSzlPQ2E5eDFGdTNwV3N6Tmg5aDZHUEZDY2ZVVlZCWk13UGt2aU00aWUvbGphTERjNVNcbkJQYlp2MC9wdmRoZHQwVEx2QUlHd2pVVUtLYjlsYkNOZzVBRkhmbmZvQXVlUVN1T09TVHRXQXJ0K0tEeWNpZ29cbjNrTFg2dHY1VUo0bFVGYVJ4Kzd0eEgyL2w0Szc5ZW5ZOVQ0bUZlRlMxaEtmRStLN3VQR3l0amU5QnJ5YVAxWExcbnk5QmFZTjUyVW0zV0RQVGplMS82aXBRMHZ4dDlGV2ZkUk5uaDJwZXhMWkgvdjJ1UEJ6TmRGU0J5K2xVTWRnMnZcblQvdHNETDFYbUlGOTFiVHMwUDk4V01yNUtXeVRtNlp2YlJocWpTRFBzTTh0WjU0TDNNUTNIdjhMZEJmalV2UjZcbmE0ZHd5QjdkQWdNQkFBRUNnZjkwY0pBb1hDV2piYmJncEwraW12eGpnZkpuN204NC8zeTYxa3hvR3MzRzVqeXJcbmRIL0I3WFVXcTBpZWpHUlREaFdBN21PekJjaWxSd1VQZ0l1RGx4OTVMSnFJakF0bkNrb3JYSlhlc2ZEUklYRE5cbklkQmlkdnZPYmlRRENVVUZLejlJeWhlZlVUNkkvM2NneEtrUVhuaUpnOWZRTk5Ga21IUHE5K1h2MGpVQ3RxZTNcbkdoQ2pmZWNPckltNmxoWURTWmY1N2E0Nnl4Z1MvVldoTjZHWnE4T3k5eThDdk5zRWxvL1V6djBoWFVnNGd1SmdcbkNGQ2I5VnJZaXB3QksxaVgvYzNSdllyclNSdm15eWg4R3NDVlIxUWhRR3FPOVJQTk1YeXZ3UWFXREtBakcrdG1cbjdHelVMRkpLaTh4cWI1b0JRSTYwVzMwRG1vVkRsS3BrZkhMbDQ2RUNnWUVBdnVEUGdPOEM5MTZJT3pRMkcrVDlcbkl1NUd1N3RZQlFQWmdPSXZVaXJQUWoyWmo2elRvZG0zTDMycUNEL3Q4YXNVQ09MMC9TM0xJbDE0eTVoVmpSZm1cbndSMUV4SFgrSGdtYjIvdFFtY3RpNXBBVTRIWlliVmp6R2Fzd01BeHZuZWhGUkdBMkhQUUlzOFoxbnVUUGsraXRcbk1COStDdXROdFErZi9rNnJsbHJlN2tNQ2dZRUF1c08rdDdva0JqZVoyWXVEMVRLOFJ6MTRGY1B4US9WMjJNK0NcbnhzYUNmeStEamM4VWhQcTBHQkZZUHRhSWFFbDdlN1VEQVZYeHRqL2w2bTBLcm95bC9JemwyZ296YVVVU0hSeXJcbnlDbDRGQUgyekpsOUlxVzhVZ2RXMUVqZCtiZUtwVnl6MnRwbmdnSGpUczZlaXNVWnExWjJVbkwrV29xWEpCVTFcblM3S1NQRjhDZ1lFQXNWNndFNnlHQWgzYTA4RUJvc3dYbWJUM0Q0M1lEZGowN1RuQkpVWllqOEkwQnZsZk14L2ZcbmhJYnVVSG92Zm9rdHRkQklQVmVuVWtpdmJla2hYbG5lZUliZEZ2NVo0OG1rQmplelB5WnF3YnNUV3owOWtHYStcbmg1UzIwMzlLM040d040aDc0RTI0SkczL2NHWklxYlhsOFRqaVkvMGhtV1ZxaytMQXVaZTVYb2NDZ1lBdEdtYXRcbmtodHZFUEJydENDelZSeFpEQVE3SldYWHBxajc5U2s4L2VXMzkyNkt5YTdINm8raG5GYTJYakwxRklIb3Z5OHBcbm5HclNPNTQzdmZ1dGFiUVFTS3FkdklicjdrMVFrSUwveE53RjRPK01PNmtYdS9TOXpwM3VpR1pyRHlOQmlpQzVcblFyTnFsekFnOFE4aXJqVGp4dTZ1UEswbWluK3pyQmVCMzI4bmV3S0JnSCtHSDRKLzMvdW5aOFpRdWJpd0owZExcbjQreEpJK0hwbU12cXJ5NzVvQmxuY0s2SzJiOVRrTEI3b0szMDUxNkpKSkxnZWJLVXBselZ6WHhYaS9UV2RBYVlcbnFQWXRFRzlGdGlybkhlWXFCcjQ2empETi9WWitaeFVRMmFLUWRydE9BL1RsNERKdEJEbFdNMW9adlo5MWRETUFcbkJQOUtJQXBBV0YrS3JoNW1zU1BMXG4tLS0tLUVORCBQUklWQVRFIEtFWS0tLS0tXG4iLCJjbGllbnRfZW1haWwiOiJsb3R0aWUtYW5pbWF0aW9uLWNvbW11bml0eS10ZXNAc2tpYS1wdWJsaWMuaWFtLmdzZXJ2aWNlYWNjb3VudC5jb20iLCJjbGllbnRfaWQiOiIxMTc1NTE1Njk0MDU3OTkwNjUwNzkiLCJhdXRoX3VyaSI6Imh0dHBzOi8vYWNjb3VudHMuZ29vZ2xlLmNvbS9vL29hdXRoMi9hdXRoIiwidG9rZW5fdXJpIjoiaHR0cHM6Ly9vYXV0aDIuZ29vZ2xlYXBpcy5jb20vdG9rZW4iLCJhdXRoX3Byb3ZpZGVyX3g1MDlfY2VydF91cmwiOiJodHRwczovL3d3dy5nb29nbGVhcGlzLmNvbS9vYXV0aDIvdjEvY2VydHMiLCJjbGllbnRfeDUwOV9jZXJ0X3VybCI6Imh0dHBzOi8vd3d3Lmdvb2dsZWFwaXMuY29tL3JvYm90L3YxL21ldGFkYXRhL3g1MDkvbG90dGllLWFuaW1hdGlvbi1jb21tdW5pdHktdGVzJTQwc2tpYS1wdWJsaWMuaWFtLmdzZXJ2aWNlYWNjb3VudC5jb20ifQ==';
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
  await execToPromise(`${goldPath} auth --work-dir ./tmp --service-account ./secret.json`);
  const githubCommit = 'c31c67181b079b0f596dcc13d82c269096a19194' || process.env.GITHUB_SHA;
  await createKeysFile();
  await execToPromise(`${goldPath} imgtest init --work-dir ./tmp --commit ${githubCommit} --keys-file ./keys.json --instance lottie-animation-community --bucket lottie-animation-community-tests`);
};

const uploadImage = async (imagePath, testName) => {
  try {
    await execToPromise(`${goldPath} imgtest add --work-dir ./tmp --test-name "${testName}" --png-file "${imagePath}"`);
  } catch (error) {
    //
  }
};

const finalize = async () => {
  try {
    await execToPromise('goldctl imgtest finalize --work-dir ./tmp');
  } catch (error) {
    console.error('FINALIZE ERROR');
    console.error(error);
  }
};

module.exports = {
  initialize,
  uploadImage,
  finalize,
};
