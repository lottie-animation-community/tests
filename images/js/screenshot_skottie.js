import canvasSnapshot from './canvasSnapshot.js'; // eslint-disable-line import/extensions
import wait from './wait.js'; // eslint-disable-line import/extensions
import puppeteerHelper from './puppeteerHelper.js'; // eslint-disable-line import/extensions

const loadSkottieModule = async () => {
  const canvasKit = await window.CanvasKitInit({
    locateFile: () => 'canvaskit.wasm',
  });
  return canvasKit;
};

const createCanvas = async (animationData) => {
  const canvas = document.createElement('canvas');
  canvas.width = animationData.w;
  canvas.height = animationData.h;
  canvas.setAttribute('id', 'skottie-canvas');
  const lottie = document.getElementById('lottie');
  lottie.appendChild(canvas);
  return canvas;
};

const getAnimationData = async (rendererSettings) => {
  const fetchResponse = await fetch(rendererSettings.path);
  const animData = await fetchResponse.json();
  return animData;
};

const createSkottiePlayer = async (canvasKit, animationData, canvas, assets) => {
  // const { devicePixelRatio } = window; // TODO: check if using the pixel ratio is preferred.
  const devicePixelRatio = 1;
  canvas.width = devicePixelRatio * animationData.w; // eslint-disable-line no-param-reassign
  canvas.height = devicePixelRatio * animationData.h; // eslint-disable-line no-param-reassign
  const surface = canvasKit.MakeCanvasSurface(canvas);
  const skcanvas = surface.getCanvas();
  const animation = canvasKit.MakeManagedAnimation(
    JSON.stringify(animationData), assets, '',
  );

  const goToAndStop = (pos) => {
    animation.seekFrame(pos);
    const bounds = canvasKit.LTRBRect(
      0,
      0,
      animationData.w * devicePixelRatio,
      animationData.h * devicePixelRatio,
    );
    animation.render(skcanvas, bounds);
    surface.flush();
  };
  return {
    goToAndStop,
  };
};

const iterateFrames = async (player, animationData, canvas, renderSettings) => {
  const snapshotsContainer = document.getElementById('snapshotsContainer');
  let currentFrame = 0;
  const sampleRate = renderSettings.sampleRate > 0 ? renderSettings.sampleRate : 1;
  const totalFrames = animationData.op - animationData.ip;
  const width = animationData.w * renderSettings.resolution;
  const height = animationData.h * renderSettings.resolution;
  while (currentFrame < totalFrames) {
    // Disabling rule because execution can't be parallelized
    /* eslint-disable no-await-in-loop */
    player.goToAndStop(currentFrame);
    const element = canvasSnapshot(
      canvas,
      snapshotsContainer,
      width,
      height,
    );
    if (Number(renderSettings.individualAssets) === 0) {
      await wait(1); // eslint-disable-line no-await-in-loop
    } else {
      await puppeteerHelper.submitAndWaitForResponse(
        currentFrame,
        currentFrame === totalFrames - 1,
        width,
        height,
      );
      element.remove();
    }
    currentFrame += 1 / sampleRate;
    /* eslint-enable no-await-in-loop */
  }
};

const getAssets = async (animationData, rendererSettings) => {
  const assets = {

  };
  await Promise.all(
    animationData.assets
      .filter((asset) => asset.p && asset.u)
      .map(async (asset) => {
        const assetPathParts = rendererSettings.path.split('/');
        assetPathParts.pop();
        const assetPath = `${assetPathParts.join('/')}/`;
        const assetData = await fetch(assetPath + asset.u + asset.p);
        assets[asset.p] = await assetData.arrayBuffer();
      }),
  );
  return assets;
};

const start = async (rendererSettings) => {
  try {
    const canvasKit = await loadSkottieModule();
    const animationData = await getAnimationData(rendererSettings);
    const canvas = await createCanvas(animationData);
    const assets = await getAssets(animationData, rendererSettings);
    const skottiePlayer = await createSkottiePlayer(canvasKit, animationData, canvas, assets);
    await iterateFrames(skottiePlayer, animationData, canvas, rendererSettings);
  } catch (error) {
    console.log('ERROR'); // eslint-disable-line no-console
    console.log(error.message); // eslint-disable-line no-console
  }
};

export default {
  start,
};
