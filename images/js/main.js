import lottieScreenshot from './screenshot.js'; // eslint-disable-line import/extensions
import skottieScreenshot from './screenshot_skottie.js'; // eslint-disable-line import/extensions

const buildRenderSettings = async (searchParams) => {
  const defaultValues = {
    renderer: 'svg',
    sampleRate: 1,
    resolution: 1,
    individualAssets: 0,
    // path: 'lottie.json',
    path: '../examples/image.json',
  };
  searchParams.forEach((value, key) => {
    defaultValues[key] = value;
  });

  return defaultValues;
};

const start = async () => {
  const url = new URL(window.location);
  const renderSettings = await buildRenderSettings(url.searchParams);
  if (renderSettings.renderer === 'canvas' || renderSettings.renderer === 'svg') {
    await lottieScreenshot.start(renderSettings);
  } else if (renderSettings.renderer === 'skottie') {
    await skottieScreenshot.start(renderSettings);
  }
  window._finished = true; // eslint-disable-line no-underscore-dangle
};

window.startProcess = async () => {
  try {
    await start();
  } catch (err) {
    console.log('ERROR', err.message); // eslint-disable-line no-console
  }
};
