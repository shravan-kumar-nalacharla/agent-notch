'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const source = path.join(root, 'tools', 'klyro-runtime');
const target = path.join(root, 'build', 'klyro-runtime');
const buildRoot = path.join(root, 'build');

if (!source.startsWith(root + path.sep) || !target.startsWith(buildRoot + path.sep)) {
  throw new Error('Screen runtime paths escaped the workspace.');
}
if (!fs.existsSync(path.join(source, 'python.exe'))) {
  throw new Error('Portable Python is missing from tools/klyro-runtime.');
}

fs.rmSync(target, { recursive: true, force: true });
fs.mkdirSync(path.join(target, 'Lib', 'site-packages'), { recursive: true });
for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
  if (entry.name === 'Lib' || ['include', 'libs', 'Scripts', 'tcl'].includes(entry.name)) continue;
  const from = path.join(source, entry.name);
  const to = path.join(target, entry.name);
  if (entry.isDirectory()) fs.cpSync(from, to, { recursive: true });
  else fs.copyFileSync(from, to);
}

fs.cpSync(path.join(source, 'Lib'), path.join(target, 'Lib'), {
  recursive: true,
  filter(from) {
    const relative = path.relative(path.join(source, 'Lib'), from);
    if (relative === 'site-packages' || relative.startsWith('site-packages' + path.sep)) return false;
    if (relative.split(path.sep).includes('__pycache__')) return false;
    return true;
  }
});

const packages = [
  'PIL',
  'pillow-13.0.0.dist-info',
  'psutil',
  'psutil-7.2.2.dist-info',
  'pywinauto',
  'pywinauto-0.6.9.dist-info',
  'comtypes',
  'comtypes-1.4.17.dist-info',
  'win32',
  'win32com',
  'win32comext',
  'pythonwin',
  'pywin32_system32',
  'pywin32.pth',
  'pywin32.version.txt',
  'pythoncom.py',
  'winrt',
  'winrt_runtime-4.1.0.dist-info',
  'winrt_windows_foundation-4!10.0.28000.2957.dist-info',
  'winrt_windows_foundation_collections-4!10.0.28000.2957.dist-info',
  'winrt_windows_graphics_imaging-4!10.0.28000.2957.dist-info',
  'winrt_windows_media_ocr-4!10.0.28000.2957.dist-info',
  'winrt_windows_storage-4!10.0.28000.2957.dist-info',
  'winrt_windows_storage_streams-4!10.0.28000.2957.dist-info',
  'dxcam',
  'dxcam-0.3.0.dist-info',
  'numpy',
  'numpy.libs',
  'numpy-2.5.4.dist-info',
  'packaging',
  'packaging-26.3.dist-info',
  'typing_extensions.py',
  'typing_extensions-4.16.0.dist-info',
  'six.py',
  'six-1.17.0.dist-info',
  'pywin32-312.dist-info'
];

for (const name of packages) {
  const from = path.join(source, 'Lib', 'site-packages', name);
  if (!fs.existsSync(from)) throw new Error(`Required screen-runtime package is missing: ${name}`);
  fs.cpSync(from, path.join(target, 'Lib', 'site-packages', name), { recursive: true });
}

const size = directory => {
  let total = 0;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    total += entry.isDirectory() ? size(absolute) : fs.statSync(absolute).size;
  }
  return total;
};

console.log(`SCREEN RUNTIME READY: ${(size(target) / 1024 / 1024).toFixed(1)} MB`);
