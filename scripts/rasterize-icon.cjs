'use strict';

const { app, BrowserWindow } = require('electron');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const source = path.join(root, 'src', 'assets', 'island-icon.svg');
const output = path.join(root, 'src', 'assets');

app.disableHardwareAcceleration();
app.whenReady().then(async () => {
  const svg = fs.readFileSync(source);
  const window = new BrowserWindow({
    width: 512,
    height: 512,
    show: false,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    webPreferences: { sandbox: true }
  });
  await window.loadURL(`data:image/svg+xml;base64,${svg.toString('base64')}`);
  await new Promise(resolve => setTimeout(resolve, 250));
  const image = await window.webContents.capturePage();
  fs.writeFileSync(path.join(output, 'icon.png'), image.toPNG());
  fs.writeFileSync(path.join(output, 'icon-256.png'), image.resize({ width: 256, height: 256, quality: 'best' }).toPNG());
  fs.writeFileSync(path.join(output, 'icon-64.png'), image.resize({ width: 64, height: 64, quality: 'best' }).toPNG());
  fs.writeFileSync(path.join(output, 'icon-32.png'), image.resize({ width: 32, height: 32, quality: 'best' }).toPNG());
  window.destroy();
  app.quit();
}).catch(error => {
  console.error(error);
  app.exit(1);
});
