import canvasSnapshot from './canvasSnapshot.js'; // eslint-disable-line import/extensions
import wait from './wait.js'; // eslint-disable-line import/extensions
import puppeteerHelper from './puppeteerHelper.js'; // eslint-disable-line import/extensions



const calculateFrameAdvance = (renderSettings, anim) => {
  const totalFrames = anim.op - anim.ip;
  const sampleRate = renderSettings.sampleRate > 0 ? renderSettings.sampleRate : 1;
  const traversedFrames = totalFrames / sampleRate;
  let advance = 1 / sampleRate;
  if (renderSettings.frames && renderSettings.frames < traversedFrames) {
    advance = totalFrames / renderSettings.frames;
  }
  return advance;
};

const calculateGridSize = (renderSettings) => {
  const grid = renderSettings.grid?.split('x');
  if (grid && grid.length && grid.length === 2) {
    const width = parseInt(grid[0]);
    const height = parseInt(grid[1]);
    if (typeof width === 'number' && isFinite(width) && typeof height === 'number' && isFinite(height)) {
      return {
        width,
        height,
      }
    }
  }
  return null;
}

const calculateElementSize = (frameAdvance, anim, grid) => {
  
  if (!grid) {
    return {
      width: anim.w,
      height: anim.h,
    }
  } else {
    const totalFrames = (anim.op - anim.ip) / frameAdvance;
    const maxColumns = 30;

    const cellCandidate = {
      width: 0,
      height: 0,
    };
    const elementRatio = anim.w / anim.h;
    for (let i = 1; i <= maxColumns; i += 1) {
      const cellWidth = grid.width / i;
      const cellHeight = cellWidth / elementRatio;
      const totalRows = Math.ceil(totalFrames / i);
      if (totalRows * cellHeight < grid.height) {
        if (cellWidth * cellHeight > cellCandidate.width * cellCandidate.height) {
          cellCandidate.width = cellWidth;
          cellCandidate.height = cellHeight;
          cellCandidate.xPadding = (grid.width - cellWidth * i) / (i)
          cellCandidate.yPadding = (grid.height - cellHeight * totalRows) / (totalRows)
        }
      }
    }
    return cellCandidate;
  }
}

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
    skcanvas.clear(canvasKit.Color(0, 0, 0, 0.0));
    animation.render(skcanvas, bounds);
    surface.flush();
  };
  return {
    goToAndStop,
  };
};

const iterateFrames = async (player, animationData, canvas, renderSettings) => {
  const snapshotsContainer = document.getElementById('snapshotsContainer');
  const frameAdvance = calculateFrameAdvance(renderSettings, animationData);
  const grid = calculateGridSize(renderSettings);
  const elementSize = calculateElementSize(frameAdvance, animationData, grid);
  snapshotsContainer.style.lineHeight = 0;
  const width = elementSize.width;
  const height = elementSize.height;
  if (grid) {
    snapshotsContainer.style.width = `${grid.width}px`;
    // snapshotsContainer.style.height = `${grid.height}px`;
  }
  let currentFrame = 0;
  const totalFrames = animationData.op - animationData.ip;
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
    element.style.padding = `${elementSize.yPadding * 0.5}px ${elementSize.xPadding * 0.5}px`;
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
    currentFrame += frameAdvance;
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
    window._finished = true; // eslint-disable-line no-underscore-dangle
  } catch (error) {
    console.log('ERROR'); // eslint-disable-line no-console
    console.log(error.message); // eslint-disable-line no-console
  }
};

export default {
  start,
};
