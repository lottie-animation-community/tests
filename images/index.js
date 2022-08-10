/**
 * This traverses all json files located on the examples folder, then iterates
 * over each file and opens a puppeteer page to a screenshot of all frames
 * combined in a single page.
 */

const puppeteer = require('puppeteer');
const express = require('express');
const fs = require('fs');
const commandLineArgs = require('command-line-args');
const md5File = require('md5-file');
const { promises: { readFile } } = require('fs');
const googleCloudHelper = require('./js/googleCloud');
const goldHelper = require('./js/helpers/gold');

const examplesDirectory = '../examples/';
const destinationDirectory = './screenshots';
const md5Directory = './md5sum/lottie_web';

if (!fs.existsSync(destinationDirectory)) {
  fs.mkdirSync(destinationDirectory);
}

const getSettings = async () => {
  const opts = [
    {
      name: 'resolution',
      alias: 'f',
      type: (val) => {
        const value = Number(val);
        if (Number.isNaN(value) || value <= 0) {
          return 1;
        }
        return value;
      },
      description: 'The resolution factor by which to create each frame (defaults to 1)',
    },
    {
      name: 'sampleRate',
      alias: 's',
      type: (val) => {
        const value = Number(val);
        if (Number.isNaN(value) || value <= 0) {
          return 1;
        }
        return value;
      },
      description: 'The sampling rate (defaults to 1)',
    },
    {
      name: 'renderer',
      alias: 'r',
      type: (value) => (['svg', 'canvas', 'skottie'].includes(value) ? value : 'svg'),
      description: 'The renderer to use',
    },
    {
      name: 'individualAssets',
      alias: 'i',
      type: (value) => ([0, 1].includes(+value) ? +value : 0),
      description: 'export as individual assets',
    },
    {
      name: 'grid',
      alias: 'g',
      type: (value) => (value || ''),
      description: 'Grid size expressed in pixels (for example 1000x1000)',
    },
    {
      name: 'frames',
      alias: 'm',
      type: (val) => {
        const value = Number(val);
        if (Number.isNaN(value) || value <= 1) {
          return 0;
        }
        return value;
      },
      description: 'Number of frames to render',
    },
  ];

  const defaultSettings = {
    renderer: 'svg',
    resolution: 1,
    sampleRate: 1,
    individualAssets: 0,
  };

  const settings = {
    ...defaultSettings,
    ...commandLineArgs(opts),
  };
  return settings;
};

const wait = (time) => new Promise((resolve) => setTimeout(resolve, time));

const filesData = [
  {
    path: '/js/main.js',
    filePath: './js/main.js',
    type: 'js',

  },
  {
    path: '/js/screenshot.js',
    filePath: './js/screenshot.js',
    type: 'js',

  },
  {
    path: '/js/screenshot_skottie.js',
    filePath: './js/screenshot_skottie.js',
    type: 'js',

  },
  {
    path: '/js/canvasSnapshot.js',
    filePath: './js/canvasSnapshot.js',
    type: 'js',

  },
  {
    path: '/js/wait.js',
    filePath: './js/wait.js',
    type: 'js',

  },
  {
    path: '/js/puppeteerHelper.js',
    filePath: './js/puppeteerHelper.js',
    type: 'js',

  },
  {
    path: '/lottie.js',
    filePath: 'node_modules/lottie-web/build/player/lottie.min.js',
    type: 'js',

  },
  {
    path: '/canvaskit.js',
    filePath: 'node_modules/canvaskit-wasm/bin/full/canvaskit.js',
    type: 'js',

  },
  {
    path: '/lottie.json',
    filePath: '../examples/rectangle.json',
    type: 'json',
  },
  {
    path: '/screenshot.html',
    filePath: './screenshot.html',
    type: 'html',
  },
  {
    path: '/canvasKit.wasm',
    filePath: 'node_modules/canvaskit-wasm/bin/full/canvaskit.wasm',
    type: 'wasm',
  },
];

const getEncoding = (() => {
  const encodingMap = {
    js: 'utf8',
    json: 'utf8',
    html: 'utf8',
  };
  return (fileType) => encodingMap[fileType];
})();

const getContentTypeHeader = (() => {
  const contentTypeMap = {
    js: { 'Content-Type': 'application/javascript' },
    json: { 'Content-Type': 'application/json' },
    html: { 'Content-Type': 'text/html; charset=utf-8' },
    wasm: { 'Content-Type': 'application/wasm' },
  };
  return (fileType) => contentTypeMap[fileType];
})();

const startServer = async () => {
  const app = express();
  await Promise.all(filesData.map(async (file) => {
    const fileData = await readFile(file.filePath, getEncoding(file.type));
    app.get(file.path, async (req, res) => {
      res.writeHead(200, getContentTypeHeader(file.type));
      // TODO: comment line. Only for live updates.
      // const fileData = await readFile(file.filePath, getEncoding(file.type));
      res.end(fileData);
    });
    return file;
  }));

  app.get('/*', async (req, res) => {
    try {
      if (req.originalUrl.indexOf('.json') !== -1) {
        const file = await readFile(`..${req.originalUrl}`, 'utf8');
        res.send(file);
      } else {
        const data = await readFile(`..${req.originalUrl}`);
        res.writeHead(200, { 'Content-Type': 'image/jpeg' });
        res.end(data);
      }
    } catch (err) {
      res.send('');
    }
  });
  app.listen('8080');
};

const getBrowser = async () => puppeteer.launch({ defaultViewport: null });

const startPage = async (browser, settings, path) => {
  const targetURL = `http://localhost:8080/screenshot.html\
?renderer=${settings.renderer}\
&sampleRate=${settings.sampleRate}\
&resolution=${settings.resolution}\
&individualAssets=${settings.individualAssets}\
&grid=${settings.grid}\
&frames=${settings.frames}\
&path=${encodeURIComponent(path)}`;
  const page = await browser.newPage();
  page.on('console', (msg) => console.log('PAGE LOG:', msg.text())); // eslint-disable-line no-console
  await page.goto(targetURL);
  return page;
};

const getFileAsString = async (path) => {
  try {
    const fileBuffer = await readFile(path);
    return fileBuffer.toString();
  } catch (err) {
    return '';
  }
};

const checkMD5Sum = async (fileName, filePath) => {
  const md5FilePath = `${md5Directory}/${fileName}.md5`;
  const md5StoredValue = await getFileAsString(md5FilePath);
  if (!md5StoredValue) {
    // It's a new file.. Check how to commit the new value.
  } else {
    const md5Value = await md5File(filePath);
    if (md5Value !== md5StoredValue) {
      // The file has changed. Should not allow the commit.
    }
  }
};

const calculateGridSize = (gridParam) => {
  const grid = gridParam?.split('x');
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

const createFilmStrip = async (page, fileName, extension, grid) => {
  page.evaluate(() => {
    window.startProcess();
  });
  const localDestinationPath = `${destinationDirectory}/${fileName}${extension}`;
  if (grid) {
    console.log(grid)
    await page.setViewport({
      width: grid.width || 1000,
      height: grid.height || 1000,
    })
  }
  await page.waitForFunction('window._finished === true', {
    timeout: 20000,
  });
  await page.screenshot({
    path: localDestinationPath,
    fullPage: true,
  });
  await goldHelper.uploadImage(localDestinationPath, fileName);
  await checkMD5Sum(fileName, localDestinationPath);
};

const createBridgeHelper = async (page) => {
  let resolveScoped;
  let isProcessStarted = false;
  const messageHandler = (event) => {
    resolveScoped(event);
  };
  await page.exposeFunction('onMessageReceivedEvent', messageHandler);
  const startProcess = async () => {
    isProcessStarted = true;
    page.evaluate(() => {
      window.startProcess();
    });
  };
  const waitForMessage = () => new Promise((resolve) => {
    if (!isProcessStarted) {
      startProcess();
    }
    resolveScoped = resolve;
  });
  const continueExecution = async () => {
    page.evaluate(() => {
      window.continueExecution();
    });
  };
  return {
    waitForMessage,
    continueExecution,
  };
};

const createIndividualAssets = async (page, fileName, extension, renderer) => {
  const filePath = `${destinationDirectory}/${fileName}`;
  let isLastFrame = false;
  const bridgeHelper = await (createBridgeHelper(page));
  while (!isLastFrame) {
    // Disabling rule because execution can't be parallelized
    /* eslint-disable no-await-in-loop */
    const message = await bridgeHelper.waitForMessage();
    await page.setViewport({
      width: message.width,
      height: message.height,
    });
    const fileNumber = message.currentFrame.toString().padStart(5, '0');
    const localDestinationPath = `${filePath}_${fileNumber}${extension}`;
    await page.screenshot({
      path: localDestinationPath,
      fullPage: false,
    });
    const remoteDestinationPath = `${renderer}/${fileName}_${fileNumber}${extension}`;
    await googleCloudHelper.uploadAsset(localDestinationPath, remoteDestinationPath);
    await bridgeHelper.continueExecution();
    isLastFrame = message.isLast;
    /* eslint-enable no-await-in-loop */
  }
};

const getDirFiles = async (directory) => (
  new Promise((resolve, reject) => {
    fs.readdir(directory, (err, files) => {
      if (err) {
        reject(err);
      } else {
        resolve(files);
      }
    });
  })
);

async function processPage(browser, settings, directory, fileName) {
  const page = await startPage(browser, settings, directory + fileName);
  const fileNameWithoutExtension = fileName.replace(/\.[^/.]+$/, '');
  const extension = '.png';
  if (settings.individualAssets) {
    await createIndividualAssets(page, fileNameWithoutExtension, extension, settings.renderer);
  } else {
    const grid = calculateGridSize(settings.grid);
    await createFilmStrip(page, fileNameWithoutExtension, extension, settings.renderer, grid);
  }
}

const iteratePages = async (browser, settings) => {
  const files = await getDirFiles(examplesDirectory);
  const jsonFiles = files.filter((file) => file.indexOf('.json') !== -1);
  for (let i = 0; i < jsonFiles.length; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    await processPage(browser, settings, examplesDirectory, jsonFiles[i]);
  }
};

const buildGoldKeys = (settings) => ({
  renderer: settings.renderer,
  resolution: settings.resolution.toString(),
});

const takeImageStrip = async () => {
  try {
    await startServer();
    const settings = await getSettings();
    await goldHelper.initialize(buildGoldKeys(settings));
    await googleCloudHelper.initialize();
    await wait(500);
    const browser = await getBrowser();
    await iteratePages(browser, settings);
    await browser.close();
    // Delay for 5 minutes to make sure gold has enough time to poll the commit
    await wait(1000 * 60 * 5);
    await goldHelper.finalize();
    process.exit(0);
  } catch (error) {
    console.log(error); // eslint-disable-line no-console
    process.exit(0);
  }//
};

takeImageStrip();
