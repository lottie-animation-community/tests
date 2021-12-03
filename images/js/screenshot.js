import canvasSnapshot from './canvasSnapshot.js'; // eslint-disable-line import/extensions
import wait from './wait.js'; // eslint-disable-line import/extensions

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

const createSVGSnapshot = (element, container, width, height) => {
  const innerContent = element.innerHTML;
  const iframeElement = document.createElement('iframe');
  container.appendChild(iframeElement);
  iframeElement.style.width = `${width}px`;
  iframeElement.style.height = `${height}px`;
  iframeElement.style.border = 'none';
  iframeElement.contentWindow.document.open();
  iframeElement.contentWindow.document.write(innerContent);
  iframeElement.contentWindow.document.close();
};

const takeSnapshots = async (anim, renderSettings) => {
  let currentFrame = 0;
  const sampleRate = renderSettings.sampleRate > 0 ? renderSettings.sampleRate : 1;
  const elem = document.getElementById('lottie');
  const snapshotsContainer = document.getElementById('snapshotsContainer');
  const width = anim.animationData.w * renderSettings.resolution;
  const height = anim.animationData.h * renderSettings.resolution;

  while (currentFrame < anim.totalFrames) {
    anim.resize();
    anim.goToAndStop(currentFrame);
    if (renderSettings.renderer === 'svg') {
      createSVGSnapshot(elem, snapshotsContainer, width, height);
    } else if (renderSettings.renderer === 'canvas') {
      const canvas = elem.getElementsByTagName('canvas')[0];
      canvasSnapshot(canvas, snapshotsContainer, width, height);
    }
    currentFrame += 1 / sampleRate;
    await wait(1); // eslint-disable-line no-await-in-loop
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
