import canvasSnapshot from './canvasSnapshot.js'; // eslint-disable-line import/extensions
import wait from './wait.js'; // eslint-disable-line import/extensions
import puppeteerHelper from './puppeteerHelper.js'; // eslint-disable-line import/extensions

const loadAnimation = async (renderSettings) => new Promise((resolve, reject) => {
  const elem = document.getElementById('lottie');
  const animData = {
    container: elem,
    renderer: renderSettings.renderer,
    loop: true,
    autoplay: true,
    rendererSettings: {
      progressiveLoad: false,
      preserveAspectRatio: 'xMidYMid meet',
      imagePreserveAspectRatio: 'xMidYMid meet',
      filterSize: {
        width: '500%',
        height: '500%',
        x: '-200%',
        y: '-200%',
      },
    },
    path: renderSettings.path,
  };
  const anim = lottie.loadAnimation(animData);
  anim.addEventListener('DOMLoaded', () => {
    resolve(anim);
    elem.style.width = `${anim.animationData.w}px`;
    elem.style.height = `${anim.animationData.h}px`;
  });
  anim.onError = (errorType) => {
    reject(errorType);
  };
});

const createSVGSnapshot = (element, container, elementSize) => {
  const innerContent = element.innerHTML;
  const iframeElement = document.createElement('iframe');
  container.appendChild(iframeElement);
  iframeElement.style.width = `${elementSize.width}px`;
  iframeElement.style.height = `${elementSize.height}px`;
  iframeElement.style.padding = `${elementSize.yPadding * 0.5}px ${elementSize.xPadding * 0.5}px`;
  iframeElement.style.border = 'none';
  iframeElement.style.lineHeight = '0';
  iframeElement.contentWindow.document.open();
  iframeElement.contentWindow.document.write(innerContent);
  iframeElement.contentWindow.document.close();
  return iframeElement;
};

const calculateFrameAdvance = (renderSettings, anim) => {
  const sampleRate = renderSettings.sampleRate > 0 ? renderSettings.sampleRate : 1;
  const traversedFrames = anim.totalFrames / sampleRate;
  let advance = 1 / sampleRate;
  if (renderSettings.frames && renderSettings.frames < traversedFrames) {
    advance = anim.totalFrames / renderSettings.frames;
  }
  return advance;
};

const calculateGridSize = (renderSettings) => {
  const grid = renderSettings.grid?.split('x');
  if (grid.length && grid.length === 2) {
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
      width: anim.animationData.w,
      height: anim.animationData.h,
    }
  } else {
    const totalFrames = anim.totalFrames / frameAdvance;
    const maxColumns = 30;

    const cellCandidate = {
      width: 0,
      height: 0,
    };
    const elementRatio = anim.animationData.w / anim.animationData.h;
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

const takeSnapshots = async (anim, renderSettings) => {
  const frameAdvance = calculateFrameAdvance(renderSettings, anim);
  const grid = calculateGridSize(renderSettings);
  const elementSize = calculateElementSize(frameAdvance, anim, grid);
  let currentFrame = 0;
  const container = document.getElementById('lottie');
  const snapshotsContainer = document.getElementById('snapshotsContainer');
  snapshotsContainer.style.lineHeight = 0;
  // const width = anim.animationData.w * renderSettings.resolution;
  // const height = anim.animationData.h * renderSettings.resolution;
  // TODO: use resolution
  const width = elementSize.width;
  const height = elementSize.height;
  container.style.width = `${width}px`;
  container.style.height = `${height}px`;

  // TODO: comment these lines
  if (grid) {
    snapshotsContainer.style.width = `${grid.width}px`;
    // snapshotsContainer.style.height = `${grid.height}px`;
  }

  while (currentFrame < anim.totalFrames) {
    // Disabling rule because execution can't be parallelized
    /* eslint-disable no-await-in-loop */
    anim.resize();
    anim.goToAndStop(currentFrame, true);
    let element;
    if (renderSettings.renderer === 'svg') {
      element = createSVGSnapshot(container, snapshotsContainer, elementSize);
    } else if (renderSettings.renderer === 'canvas') {
      const canvas = container.getElementsByTagName('canvas')[0];
      element = canvasSnapshot(canvas, snapshotsContainer, width, height);
    }
    currentFrame += frameAdvance;
    const isLastFrame = currentFrame + frameAdvance >= anim.totalFrames;
    if (Number(renderSettings.individualAssets) === 0) {
      await wait(1);
    } else {
      await puppeteerHelper.submitAndWaitForResponse(
        currentFrame,
        isLastFrame,
        width,
        height,
      );
      element.remove();
    }
    /* eslint-enable no-await-in-loop */
  }
};

const start = async (renderSettings) => {
  try {
    const anim = await loadAnimation(renderSettings);
    await takeSnapshots(anim, renderSettings);
    window._finished = true; // eslint-disable-line no-underscore-dangle
  } catch (err) {
    console.log('ERROR'); // eslint-disable-line no-console
    console.log(err.message); // eslint-disable-line no-console
  }
};

export default {
  start,
};
