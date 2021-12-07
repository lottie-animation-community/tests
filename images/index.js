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
      type: (value) => ([0, 1].includes(Number(value)) ? Number(value) : 1),
      description: 'export as individual assets',
    },
  ];

  const defaultSettings = {
    renderer: 'svg',
    resolution: 1,
    sampleRate: 1,
    individualAssets: 1,
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
&path=${encodeURIComponent(path)}`;
  const page = await browser.newPage();
  page.on('console', (msg) => console.log('PAGE LOG:', msg.text())); // eslint-disable-line no-console
  await page.goto(targetURL);
  return page;
};

const createFilmStrip = async (page, path) => {
  await page.waitForFunction('window._finished === true', {
    timeout: 20000,
  });
  await page.screenshot({
    path,
    fullPage: true,
  });
};

const createBridgeHelper = async (page) => {
  let resolveScoped;
  const messageHandler = (event) => {
    resolveScoped(event);
  };
  await page.exposeFunction('onMessageReceivedEvent', messageHandler);
  const waitForMessage = () => new Promise((resolve) => {
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

const createIndividualAssets = async (page, path, extension) => {
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
    await page.screenshot({
      path: `${path}_${fileNumber}${extension}`,
      fullPage: false,
    });
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

async function processPage(browser, settings, directory, file) {
  const page = await startPage(browser, settings, directory + file);
  const filePath = `${destinationDirectory}/${file}`;
  const extension = '.png';
  if (settings.individualAssets) {
    await createIndividualAssets(page, filePath, extension);
  } else {
    await createFilmStrip(page, filePath + extension);
    await checkMD5Sum(file, filePath + extension);
    await googleCloudHelper.uploadAsset(filePath + extension, file + extension);
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

const takeImageStrip = async () => {
  try {
    await startServer();
    await googleCloudHelper.initialize();
    await wait(500);
    const settings = await getSettings();
    const browser = await getBrowser();
    await iteratePages(browser, settings);
    await browser.close();
    process.exit(0);
  } catch (error) {
    console.log(error); // eslint-disable-line no-console
  }//
};

takeImageStrip();
