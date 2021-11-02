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
      type: (value) => (['svg', 'canvas'].includes(value) ? value : 'svg'),
      description: 'The renderer to use',
    },
  ];

  const defaultSettings = {
    renderer: 'svg',
    resolution: 1,
    sampleRate: 1,
  };

  const settings = {
    ...defaultSettings,
    ...commandLineArgs(opts),
  };
  return settings;
};

const wait = (time) => new Promise((resolve) => setTimeout(resolve, time));

const startServer = async () => {
  const lottieJS = await readFile('node_modules/lottie-web/build/player/lottie.min.js', 'utf8');
  const screenshotJS = await readFile('screenshot.js', 'utf8');
  const driverHTML = await readFile('screenshot.html', 'utf8');
  const lottieJSON = await readFile('../examples/rectangle.json', 'utf8');
  const app = express();
  app.get('/screenshot.html', (req, res) => res.send(driverHTML));
  app.get('/screenshot_live.html', async (req, res) => {
    const file = await readFile('screenshot.html', 'utf8');
    res.send(file);
  });
  app.get('/lottie.js', (req, res) => res.send(lottieJS));
  app.get('/screenshot.js', (req, res) => res.send(screenshotJS));
  app.get('/lottie.json', (req, res) => res.send(lottieJSON));
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
  const filePath = `${destinationDirectory}/${file}.png`;
  await createFilmStrip(page, filePath);
  await checkMD5Sum(file, filePath);
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
