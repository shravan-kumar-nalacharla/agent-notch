'use strict';

const CATALOG = [
  {
    id: 'github-stars', name: 'GitHub Stars', icon: 'star', category: 'Developer', version: '1.0.0', author: 'gegas', featured: true,
    description: 'Totals stars across owned GitHub repositories and pulses when a repository gains stars.',
    repository: 'https://github.com/Geguchh024/github-stars', commit: '6216711b9d6e9ebfee42a03e91331456e3748546',
    license: 'No license file found', licenseStatus: 'blocked',
    permissions: ['network:api.github.com', 'open:https', 'storage:plugin-data'],
    endpoints: ['https://api.github.com/users/<user>/repos'], dependencies: ['Python 3.8+'],
    architecture: ['main.py polls the GitHub REST API every ten minutes', 'nook.py implements the JSON-lines host protocol', 'Local plugin data stores the configured user and previous star counts'],
    sourceTree: ['plugin.toml', 'main.py', 'nook.py']
  },
  {
    id: 'game-library', name: 'Game Library', icon: 'gamepad-2', category: 'Media', version: '1.2.0', author: 'Viggoo5555', featured: true,
    description: 'Discovers Steam and Epic titles, adds local games, shows artwork and launches selected games.',
    repository: 'https://github.com/Viggoo5555/Fenn-Game-Library-Plugin', subdirectory: 'game-library', commit: '9a5189e5552a592efbf765a2ad3a087ffc4db503',
    license: 'No license file found', licenseStatus: 'blocked',
    permissions: ['files:game-libraries', 'files:read', 'process:launch', 'process:terminate', 'network:steam'],
    endpoints: ['https://store.steampowered.com', 'https://cdn.cloudflare.steamstatic.com', 'https://shared.fastly.steamstatic.com'], dependencies: ['Python 3.8+', 'PowerShell file picker'],
    architecture: ['main.py scans Steam, Epic and user-selected paths', 'Steam endpoints supply missing metadata and artwork', 'Games launch through explicit paths or registered launcher URIs'],
    sourceTree: ['game-library/plugin.toml', 'game-library/main.py', 'game-library/fenn.py', 'game-library/pick_file.ps1']
  },
  {
    id: 'drop-to-convert', name: 'Drop to Convert', icon: 'repeat-2', category: 'Productivity', version: '2.2.0', author: 'nightt-ctrl', featured: true,
    description: 'Converts images, documents, PDFs, media and archives from files dropped on the notch.',
    repository: 'https://github.com/nightt-ctrl/fenn-drop-to-convert', commit: 'f8bfde924bda2f6b33ffdb7c590b6bb38072321f',
    license: 'MIT', licenseStatus: 'verified',
    permissions: ['files:dropped', 'files:write-beside-source', 'process:conversion-tools', 'network:setup'],
    endpoints: ['https://pypi.org', 'https://files.pythonhosted.org', 'winget community source', 'LibreOffice download mirrors'], dependencies: ['Python 3.11+', 'Pillow 13.0.0', 'imageio-ffmpeg 0.8.1', 'pypdfium2 5.15.0', 'LibreOffice for Office formats'],
    architecture: ['main.py owns the queue and declarative views', 'conversion.py maps input types to safe argument arrays', 'A private Python environment holds pinned conversion packages'],
    sourceTree: ['plugin.toml', 'main.py', 'conversion.py', 'bootstrap.js', 'bootstrap-tools.cmd', 'launch.cmd', 'requirements.txt', 'fenn.py', 'LICENSE', 'THIRD-PARTY-NOTICES.txt']
  },
  {
    id: 'weather', name: 'Weather', icon: 'cloud-sun', category: 'System', version: '1.1.0', author: 'Lujlap', featured: true,
    description: 'Forecasts, air quality, sun and moon data with compact and expanded visual modes.',
    repository: 'https://github.com/lucaslapos8-cloud/fenn-weather', commit: '4f78bb60a64e6e19140d43fddb2a6fe8edf7e186',
    license: 'MIT; Open-Meteo data CC BY 4.0; astro adaptation BSD-2-Clause', licenseStatus: 'verified',
    permissions: ['network:weather', 'storage:plugin-data'],
    endpoints: ['https://api.open-meteo.com', 'https://air-quality-api.open-meteo.com', 'https://geocoding-api.open-meteo.com', 'https://archive-api.open-meteo.com', 'https://get.geojs.io'], dependencies: ['Python 3.8+'],
    architecture: ['wx.py performs bounded HTTPS requests', 'data.py normalizes forecasts', 'Six renderer modules emit declarative views and canvas shapes'],
    sourceTree: ['plugin.toml', 'main.py', 'wx.py', 'data.py', 'units.py', 'astro.py', 'ambient.py', 'glossy.py', 'sky.py', 'panorama.py', 'simple.py', 'mono.py', 'brief.py', 'ui.py', 'symbols.py', 'icons/', 'fenn.py', 'LICENSE']
  },
  {
    id: 'grab', name: 'Grab', icon: 'download', category: 'Media', version: '1.1.0', author: 'Lujlap', featured: false,
    description: 'Queues video and audio downloads through yt-dlp with progress, playlists and history.',
    repository: 'https://github.com/lucaslapos8-cloud/fenn-grab', commit: '6af720a31b50dc5504e94699e97dbe3972126a53',
    license: 'MIT; downloaded yt-dlp/FFmpeg/Deno retain their own licenses', licenseStatus: 'verified',
    permissions: ['network:user-provided-urls', 'network:tool-downloads', 'files:downloads', 'clipboard:read-on-click', 'process:yt-dlp', 'browser:cookies-optional'],
    endpoints: ['User-provided media sites', 'https://github.com/yt-dlp', 'https://github.com/denoland', 'SponsorBlock when selected'], dependencies: ['Python 3.8+', 'yt-dlp', 'FFmpeg', 'Deno for current YouTube extraction'],
    architecture: ['main.py manages queue and views', 'ytdlp.py builds shell-free argument arrays and parses progress', 'installer.py downloads pinned tools and verifies published SHA-256 checksums'],
    sourceTree: ['plugin.toml', 'main.py', 'ytdlp.py', 'draw.py', 'winutil.py', 'installer.py', 'pick_folder.ps1', 'fenn.py', 'LICENSE']
  },
  {
    id: 'nook-soundboard', name: 'Ambient Soundboard', icon: 'headphones', category: 'Fun', version: '1.2.0', author: 'Shubhajeet', featured: false,
    description: 'Mixes bundled ambient loops, custom tracks and sleep timers for focus or relaxation.',
    repository: 'https://github.com/shubhajeet6677/nook-Soundboard', commit: 'efdf31f3fd5012a0eac126875178bdaee878227a',
    license: 'No license file found', licenseStatus: 'blocked',
    permissions: ['audio:playback', 'files:audio-read', 'storage:plugin-data'], endpoints: [], dependencies: ['Python 3.8+', 'Windows WaveOut', 'pygame-ce 2.5+ for compressed custom tracks'],
    architecture: ['main.py owns presets, timers and views', 'audio.py mixes WaveOut PCM with an optional pygame backend', 'Bundled WAV files provide eight ambient layers'],
    sourceTree: ['plugin.toml', 'main.py', 'audio.py', 'nook.py', 'requirements.txt', 'sounds/*.wav']
  }
];

function catalog(){return CATALOG.map(entry=>({...entry,permissions:[...entry.permissions],endpoints:[...entry.endpoints],dependencies:[...entry.dependencies],architecture:[...entry.architecture],sourceTree:[...entry.sourceTree]}));}
function findCatalog(id){return catalog().find(entry=>entry.id===id);}

module.exports={catalog,findCatalog};
