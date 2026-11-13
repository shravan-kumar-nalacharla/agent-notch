let pdfjsLib;
window.studio.appearance().then(reply=>{if(reply.ok)window.NotchTheme.apply(document.body,reply.value);});
window.studio.onAppearance(appearance=>window.NotchTheme.apply(document.body,appearance));

const $ = id => document.getElementById(id);
const state = { files: [], active: null, mode: null };
const imageState = { crop: null, aspect: 0, rotate: 0, flip: false, natural: null };
const videoState = { duration: 0, start: 0, end: 0, tab: 'trim', crop: null, aspect: 0, natural: null };
const pdfState = { doc: null, pages: [], selected: 0, scale: 1.15, rendering: false };

const kindLabel = k => ({ image: 'IMAGE', video: 'VIDEO', audio: 'AUDIO', pdf: 'PDF', document: 'DOCUMENT', archive: 'ARCHIVE', subtitle: 'SUBTITLE', text: 'TEXT', unsupported: 'FILE' }[k] || 'FILE');
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const bytes = n => n >= 1048576 ? (n / 1048576).toFixed(1) + ' MB' : n >= 1024 ? (n / 1024).toFixed(0) + ' KB' : n + ' B';
let toastTimer;
function toast(message, error = false) { const el = $('toast'); el.textContent = message; el.classList.toggle('error', error); el.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => { el.hidden = true; }, 3800); }
function show(id) { for (const section of ['emptyState', 'fileOverview', 'imageEditor', 'videoEditor', 'pdfEditor']) $(section).hidden = section !== id; }
function activeFile() { return state.files.find(file => file.path === state.active); }

async function addFiles(paths) {
  const inspected = await window.studio.inspect(paths);
  if (!inspected.ok) return toast(inspected.error, true);
  for (const file of inspected.value) if (!state.files.some(x => x.path === file.path)) state.files.push(file);
  if (!state.active && state.files.length) state.active = state.files[0].path;
  renderQueue();
  if (state.files.length) selectFile(state.active || state.files[0].path);
  else show('emptyState');
}
function renderQueue() {
  $('queueCount').textContent = state.files.length + (state.files.length === 1 ? ' file' : ' files');
  $('fileList').innerHTML = state.files.map(file => {
    const thumb = file.kind === 'image' ? `<img src="${esc(file.url)}" alt="">` : file.kind === 'video' ? `<video src="${esc(file.url)}" muted></video>` : ({ pdf: '▤', document: '▧', archive: '▣', subtitle: '≡', text: '≡' }[file.kind] || '▧');
    return `<div class="file-item ${file.path === state.active ? 'active' : ''}" data-path="${esc(file.path)}"><div class="file-thumb">${thumb}</div><div class="file-copy"><b>${esc(file.name)}</b><small>${kindLabel(file.kind)} · ${bytes(file.size)}</small></div><button class="file-remove" data-remove="${esc(file.path)}" title="Remove from studio">×</button></div>`;
  }).join('');
}
function removeFile(path) {
  state.files = state.files.filter(file => file.path !== path);
  if (state.active === path) state.active = state.files[0]?.path || null;
  renderQueue();
  if (state.active) selectFile(state.active); else { state.mode = null; show('emptyState'); }
}
function selectFile(path) {
  state.active = path; state.mode = 'overview';
  const file = activeFile(); if (!file) return show('emptyState');
  $('headName').textContent = file.name;
  $('headMeta').textContent = `${kindLabel(file.kind)} · ${bytes(file.size)}`;
  show('fileOverview'); renderOverview(file); renderQueue();
}
function renderOverview(file) {
  $('overviewName').textContent = file.name;
  $('overviewMeta').textContent = [kindLabel(file.kind), bytes(file.size), file.width && `${file.width}×${file.height}`, file.duration && timeText(file.duration), file.pages && `${file.pages} pages`, file.entries !== undefined && `${file.entries} entries`].filter(Boolean).join(' · ');
  $('overviewIcon').innerHTML = file.kind === 'image' ? `<img src="${esc(file.url)}" alt="">` : ({ video: '▶', audio: '♫', pdf: '▤', document: '▧', archive: '▣', subtitle: '≡', text: '≡' }[file.kind] || '▧');
  const preview = $('overviewPreview');
  if (file.kind === 'image') preview.innerHTML = `<img src="${esc(file.url)}" alt="">`;
  else if (file.kind === 'video') preview.innerHTML = `<video src="${esc(file.url)}" controls></video>`;
  else if (file.kind === 'audio') preview.innerHTML = `<audio src="${esc(file.url)}" controls style="width:100%"></audio>`;
  else if (file.kind === 'text') preview.innerHTML = `<pre style="white-space:pre-wrap;max-height:260px;overflow:auto;width:100%;font-size:11px;margin:0">${esc(file.text || '')}</pre>`;
  else if (file.kind === 'pdf') preview.innerHTML = `<button class="primary" id="openPdfPreview">Open rendered PDF preview</button>`;
  else preview.innerHTML = `<p class="hint">${esc(file.message || 'Preview is not available for this format.')}</p>`;
  $('openPdfPreview')?.addEventListener('click', () => openEditor('pdf'));
  const ops = operationsFor(file);
  $('operationGrid').innerHTML = ops.map(op => `<button class="op-card" data-op="${op.id}"><b>${op.title}</b><small>${op.sub}</small></button>`).join('');
  $('operationGrid').querySelectorAll('[data-op]').forEach(button => button.onclick = () => openEditor(button.dataset.op));
}
function operationsFor(file) {
  const common = [];
  if (file.kind === 'image') return [{ id: 'crop', title: 'Crop image', sub: 'Drag a real crop region' }, { id: 'resize', title: 'Resize & convert', sub: 'PNG or JPEG output' }, { id: 'metadata', title: 'Remove metadata', sub: 'Clean copy' }, { id: 'toPdf', title: 'Create PDF', sub: 'From images' }];
  if (file.kind === 'video' || file.kind === 'audio') return [{ id: 'trim', title: 'Trim media', sub: 'Keep a time range' }, ...(file.kind === 'video' ? [{ id: 'crop', title: 'Crop video', sub: 'Keep a frame region' }] : []), { id: 'mute', title: 'Mute', sub: 'Remove audio' }, { id: 'speed', title: 'Change speed', sub: '0.25×–2×' }, ...(file.kind === 'video' ? [{ id: 'snapshot', title: 'Snapshot PNG', sub: 'Export a frame' }] : []), { id: 'metadata', title: 'Remove metadata', sub: 'Clean copy' }];
  if (file.kind === 'pdf') return [{ id: 'pdf', title: 'Open PDF workspace', sub: 'Render, reorder, rotate' }, { id: 'merge', title: 'Merge PDFs', sub: 'Choose documents' }, { id: 'metadata', title: 'Remove metadata', sub: 'Clean copy' }];
  if (file.kind === 'document') return [{ id: 'toPdf', title: 'Convert to PDF', sub: 'Local LibreOffice' }, { id: 'metadata', title: 'Remove metadata', sub: 'Clean copy' }];
  if (file.kind === 'archive') return [{ id: 'extract', title: 'Extract archive', sub: 'ZIP/TAR/GZ/TGZ' }];
  if (file.kind === 'subtitle') return [{ id: 'subtitle', title: 'Convert subtitles', sub: 'SRT ↔ VTT' }];
  return common;
}
function openEditor(op) {
  const file = activeFile(); if (!file) return;
  if (file.kind === 'image' && (op === 'crop' || op === 'resize')) { state.mode = 'image'; show('imageEditor'); setupImage(file, op === 'resize'); return; }
  if (file.kind === 'video' && ['trim', 'crop', 'mute', 'speed', 'snapshot'].includes(op)) { state.mode = 'video'; show('videoEditor'); setupVideo(file, op === 'snapshot' ? 'trim' : op); return; }
  if (op === 'pdf') { state.mode = 'pdf'; show('pdfEditor'); setupPdf(file); return; }
  if (op === 'metadata') return runStudio(() => window.studio.metadata({ path: file.path }), result => { if (result) toast('Saved ' + result.name); });
  if (op === 'merge') return mergePdfs();
  if (op === 'toPdf') return chooseImagesToPdf();
  if (op === 'extract') return toast('Archive extraction is available from the notch File Actions for now; studio extraction is next.');
  if (op === 'subtitle') return toast('Subtitle conversion is available from the notch File Actions.');
  if (file.kind === 'audio' && ['trim','mute','speed'].includes(op)) { state.mode = 'video'; show('videoEditor'); setupVideo(file, op); return; }
  toast('This tool is not wired yet.');
}
async function runStudio(fn, onDone) { try { const result = await fn(); if (result && result.ok === false) throw new Error(result.error); if (onDone) await onDone(result?.value); } catch (error) { toast(error.message, true); } }

/* ---------------- image ---------------- */
let imageDrag = null;
function setupImage(file, resizeMode) {
  $('imageTitle').textContent = resizeMode ? 'Resize Image' : 'Crop Image';
  $('imageFormat').textContent = file.ext.toUpperCase();
  $('imageFile').textContent = file.name; $('imageSize').textContent = bytes(file.size);
  $('imageDims').textContent = `${file.width} × ${file.height}`;
  const img = $('imagePreview'); img.src = file.url;
  imageState.natural = { width: file.width, height: file.height }; imageState.crop = { x: 0, y: 0, width: file.width, height: file.height }; imageState.aspect = 0; imageState.rotate = 0; imageState.flip = false;
  img.style.transform = ''; img.onload = () => { layoutImageCrop(); syncImageInputs(); };
  $('imageOutFormat').value = file.ext === 'jpg' || file.ext === 'jpeg' ? 'jpeg' : 'png';
  $('saveImage').textContent = resizeMode ? 'Save resized copy' : 'Save cropped copy';
  $('imageEditor').dataset.resize = resizeMode ? '1' : '';
  layoutImageCrop(); syncImageInputs();
}
function imageBox() {
  const img = $('imagePreview'), stage = $('imageStage'), ir = img.getBoundingClientRect(), sr = stage.getBoundingClientRect();
  return { left: ir.left - sr.left, top: ir.top - sr.top, width: ir.width, height: ir.height, scaleX: ir.width / (imageState.natural?.width || 1), scaleY: ir.height / (imageState.natural?.height || 1) };
}
function layoutImageCrop() {
  const box = imageBox(), crop = imageState.crop, el = $('imageCrop');
  if (!crop || !box.width) { el.hidden = true; return; }
  el.hidden = false; el.style.left = box.left + crop.x * box.scaleX + 'px'; el.style.top = box.top + crop.y * box.scaleY + 'px'; el.style.width = crop.width * box.scaleX + 'px'; el.style.height = crop.height * box.scaleY + 'px';
  el.querySelector('.crop-size').textContent = `${Math.round(crop.width)} × ${Math.round(crop.height)}`;
}
function clampImageCrop(crop) {
  const n = imageState.natural; crop.width = Math.max(1, Math.min(n.width, crop.width)); crop.height = Math.max(1, Math.min(n.height, crop.height)); crop.x = Math.max(0, Math.min(n.width - crop.width, crop.x)); crop.y = Math.max(0, Math.min(n.height - crop.height, crop.y)); return crop;
}
function syncImageInputs() {
  const crop = imageState.crop || { x: 0, y: 0, width: imageState.natural?.width || 0, height: imageState.natural?.height || 0 };
  $('cropW').value = Math.round(crop.width); $('cropH').value = Math.round(crop.height); $('cropX').value = Math.round(crop.x); $('cropY').value = Math.round(crop.y);
  layoutImageCrop();
}
function cropFromInputs() {
  const n = imageState.natural; imageState.crop = clampImageCrop({ x: +$('cropX').value || 0, y: +$('cropY').value || 0, width: +$('cropW').value || n.width, height: +$('cropH').value || n.height }); syncImageInputs();
}
['cropW', 'cropH', 'cropX', 'cropY'].forEach(id => $(id).addEventListener('change', cropFromInputs));
$('selectAll').onclick = () => { imageState.crop = { x: 0, y: 0, width: imageState.natural.width, height: imageState.natural.height }; syncImageInputs(); };
$('clearCrop').onclick = () => { imageState.crop = { x: 0, y: 0, width: 0, height: 0 }; syncImageInputs(); };
$('imageReset').onclick = () => { imageState.crop = { x: 0, y: 0, width: imageState.natural.width, height: imageState.natural.height }; imageState.rotate = 0; imageState.flip = false; $('imagePreview').style.transform = ''; syncImageInputs(); };
$('rotateImage').onclick = () => { imageState.rotate = (imageState.rotate + 90) % 360; applyImageTransform(); };
$('flipImage').onclick = () => { imageState.flip = !imageState.flip; applyImageTransform(); };
function applyImageTransform() { $('imagePreview').style.transform = `rotate(${imageState.rotate}deg) scaleX(${imageState.flip ? -1 : 1})`; }
$('imageAspects').addEventListener('click', event => { const b = event.target.closest('[data-aspect]'); if (!b) return; imageState.aspect = +b.dataset.aspect; [...$('imageAspects').children].forEach(x => x.classList.toggle('active', x === b)); if (imageState.aspect && imageState.crop) { imageState.crop.height = imageState.crop.width / imageState.aspect; clampImageCrop(imageState.crop); syncImageInputs(); } });
function imagePoint(event) { const b = imageBox(); return { x: (event.clientX - b.left) / b.scaleX, y: (event.clientY - b.top) / b.scaleY }; }
$('imageStage').addEventListener('pointerdown', event => {
  if (!imageState.natural) return; const p = imagePoint(event), crop = imageState.crop, handle = event.target.dataset.handle;
  let mode = 'move'; if (!crop || crop.width < 2) mode = 'new'; if (handle) mode = 'resize';
  imageDrag = { mode, handle, start: p, original: { ...crop } }; event.currentTarget.setPointerCapture(event.pointerId); event.preventDefault();
});
$('imageStage').addEventListener('pointermove', event => {
  if (!imageDrag) return; const p = imagePoint(event), start = imageDrag.start, original = imageDrag.original, n = imageState.natural;
  if (imageDrag.mode === 'new') { imageState.crop = { x: Math.min(start.x, p.x), y: Math.min(start.y, p.y), width: Math.abs(p.x - start.x), height: Math.abs(p.y - start.y) }; }
  else if (imageDrag.mode === 'move') { imageState.crop.x = original.x + (p.x - start.x); imageState.crop.y = original.y + (p.y - start.y); }
  else {
    const h = imageDrag.handle, c = { ...original };
    if (h.includes('e')) c.width = original.width + (p.x - start.x); if (h.includes('s')) c.height = original.height + (p.y - start.y);
    if (h.includes('w')) { c.width = original.width - (p.x - start.x); c.x = original.x + (p.x - start.x); } if (h.includes('n')) { c.height = original.height - (p.y - start.y); c.y = original.y + (p.y - start.y); }
    if (h === 'n' || h === 's') c.width = original.width; if (h === 'e' || h === 'w') c.height = original.height;
    if (event.shiftKey || imageState.aspect) { const ratio = event.shiftKey ? (original.width / original.height) : imageState.aspect; if (ratio) c.height = c.width / ratio; }
    imageState.crop = c;
  }
  clampImageCrop(imageState.crop); syncImageInputs();
});
$('imageStage').addEventListener('pointerup', () => { imageDrag = null; });
$('saveImage').onclick = () => runStudio(() => window.studio.image({ path: activeFile().path, crop: imageState.crop && imageState.crop.width > 1 && imageState.crop.height > 1 ? imageState.crop : null, rotate: imageState.rotate, flip: imageState.flip, format: $('imageOutFormat').value }), result => { if (result) { toast('Saved ' + result.name); addFiles([result.path]); } });
$('imageEditor').querySelector('[data-back]').onclick = () => selectFile(state.active);
window.addEventListener('resize', () => { if (state.mode === 'image') layoutImageCrop(); if (state.mode === 'video') layoutVideoCrop(); });

/* ---------------- unified video editor ---------------- */
let timelineDrag = null, videoCropDrag = null;
function timeText(seconds) { seconds = Math.max(0, Number(seconds) || 0); const h = Math.floor(seconds / 3600), m = Math.floor((seconds % 3600) / 60), s = seconds % 60; return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${s.toFixed(3).padStart(6, '0')}`; }
function parseTime(value) { const parts = String(value).trim().split(':').map(Number); if (parts.some(Number.isNaN)) return NaN; if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]; if (parts.length === 2) return parts[0] * 60 + parts[1]; return parts[0]; }
function setupVideo(file, mode) {
  $('videoTitle').textContent = mode === 'crop' ? 'Crop Video' : 'Video Editor';
  $('videoSubtitle').textContent = 'Trim, crop, speed and audio in one render.';
  $('videoFormat').textContent = file.ext.toUpperCase(); $('videoFile').textContent = file.name;
  const video = $('videoPreview'); video.src = file.url; video.loop = false; video.playbackRate = 1;
  videoState.duration = file.duration || 0; videoState.start = 0; videoState.end = file.duration || 0; videoState.tab = mode === 'crop' ? 'crop' : 'trim';
  videoState.trimEnabled = true; videoState.cropEnabled = mode === 'crop'; videoState.loop = false; videoState.focus = false; videoState.speed = 1; videoState.muted = false; videoState.volume = 100;
  videoState.crop = { x: 0, y: 0, width: file.width, height: file.height }; videoState.natural = { width: file.width, height: file.height }; videoState.aspect = 0; videoState.playingRange = false;
  $('videoDims').textContent = file.width ? `${file.width} × ${file.height}` : 'Audio'; $('videoTotal').textContent = timeText(videoState.duration);
  $('trimStart').value = timeText(0); $('trimEnd').value = timeText(videoState.duration); $('trimDuration').textContent = timeText(videoState.duration);
  $('trimEnabled').checked = true; $('cropEnabled').checked = videoState.cropEnabled; $('loopSelection').checked = false; $('focusSelection').checked = false; $('videoMuted').checked = false; $('videoVolume').value = 100; $('videoSpeed').value = '1';
  $('trimTab').classList.toggle('active', videoState.tab === 'trim'); $('cropTab').classList.toggle('active', videoState.tab === 'crop'); $('trimControls').hidden = videoState.tab !== 'trim'; $('cropControls').hidden = videoState.tab !== 'crop'; $('videoCrop').hidden = !videoState.cropEnabled;
  $('saveVideo').textContent = 'Render final video'; $('filmstrip').innerHTML = '';
  window.studio.frames(file.path).then(result => { if (result.ok) $('filmstrip').innerHTML = result.value.map(src => `<img src="${src}" alt="">`).join(''); }).catch(() => {});
  video.onloadedmetadata = () => { if (!videoState.duration) { videoState.duration = video.duration; videoState.end = video.duration; $('trimEnd').value = timeText(video.duration); $('videoTotal').textContent = timeText(video.duration); } timeline(); };
  video.ontimeupdate = () => { $('videoClock').textContent = timeText(video.currentTime); if (videoState.loop && videoState.trimEnabled && video.currentTime >= videoState.end - .03) { video.currentTime = videoState.start; if (video.paused) video.play(); } if (videoState.playingRange && !videoState.loop && video.currentTime >= videoState.end - .03) { video.pause(); videoState.playingRange = false; $('playPause').textContent = '▶'; } timeline(); };
  timeline(); layoutVideoCrop();
}
function viewRange() { const d = videoState.duration || 1; return videoState.focus && videoState.trimEnabled ? { start: videoState.start, end: videoState.end, duration: Math.max(.001, videoState.end - videoState.start) } : { start: 0, end: d, duration: d }; }
function timePct(time) { const view = viewRange(); return Math.max(0, Math.min(1, (time - view.start) / view.duration)); }
function timeline() {
  const d = videoState.duration || 1, view = viewRange(), start = Math.max(view.start, Math.min(view.end, videoState.start)), end = Math.max(start, Math.min(view.end, videoState.end));
  const startPct = (start - view.start) / view.duration, endPct = (end - view.start) / view.duration;
  $('inHandle').style.left = `calc(${startPct * 100}% - 9px)`; $('outHandle').style.left = `calc(${endPct * 100}% - 9px)`;
  $('timelineRange').style.left = `${startPct * 100}%`; $('timelineRange').style.width = `${Math.max(0, endPct - startPct) * 100}%`;
  const v = $('videoPreview'); $('playhead').style.left = `calc(${timePct(v?.currentTime || 0) * 100}% - 1px)`;
  $('trimDuration').textContent = timeText(Math.max(0, end - start));
  $('videoSummary').textContent = `${videoState.trimEnabled ? 'Trim ON' : 'Trim off'} · ${videoState.cropEnabled ? 'Crop ON' : 'Crop off'} · ${(+videoState.speed).toFixed(2)}× · ${videoState.muted ? 'Muted' : 'Audio'}`;
}
function setRange(start, end) { const d = videoState.duration || 0; videoState.start = Math.max(0, Math.min(d, Number(start) || 0)); videoState.end = Math.max(videoState.start + .001, Math.min(d, Number(end) || d)); $('trimStart').value = timeText(videoState.start); $('trimEnd').value = timeText(videoState.end); timeline(); }
function xToTime(clientX) { const rect = $('videoTimeline').getBoundingClientRect(), view = viewRange(), p = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)); return view.start + p * view.duration; }
function seek(time) { const v = $('videoPreview'); v.currentTime = Math.max(0, Math.min(videoState.duration, time)); $('videoClock').textContent = timeText(v.currentTime); timeline(); }
$('trimStart').addEventListener('change', () => { const value = parseTime($('trimStart').value); if (Number.isFinite(value)) setRange(value, videoState.end); });
$('trimEnd').addEventListener('change', () => { const value = parseTime($('trimEnd').value); if (Number.isFinite(value)) setRange(videoState.start, value); });
$('trimEnabled').addEventListener('change', () => { videoState.trimEnabled = $('trimEnabled').checked; timeline(); });
$('cropEnabled').addEventListener('change', () => { videoState.cropEnabled = $('cropEnabled').checked; $('videoCrop').hidden = !videoState.cropEnabled; layoutVideoCrop(); timeline(); });
$('loopSelection').addEventListener('change', () => { videoState.loop = $('loopSelection').checked; });
$('focusSelection').addEventListener('change', () => { videoState.focus = $('focusSelection').checked; timeline(); layoutVideoCrop(); });
$('videoMuted').addEventListener('change', () => { videoState.muted = $('videoMuted').checked; $('videoPreview').muted = videoState.muted; timeline(); });
$('videoVolume').addEventListener('input', () => { videoState.volume = +$('videoVolume').value; $('videoPreview').volume = Math.min(1, videoState.volume / 100); });
$('videoSpeed').addEventListener('change', () => { videoState.speed = +$('videoSpeed').value || 1; $('videoPreview').playbackRate = videoState.speed; timeline(); });
$('prevFrame').onclick = () => seek(($('videoPreview').currentTime || 0) - 1 / 30);
$('nextFrame').onclick = () => seek(($('videoPreview').currentTime || 0) + 1 / 30);
$('playPause').onclick = () => { const v = $('videoPreview'); if (v.paused) { if (videoState.trimEnabled && (v.currentTime < videoState.start || v.currentTime >= videoState.end)) v.currentTime = videoState.start; v.play(); $('playPause').textContent = '❚❚'; } else { v.pause(); $('playPause').textContent = '▶'; } };
$('playRange').onclick = () => { const v = $('videoPreview'); v.currentTime = videoState.start; videoState.playingRange = true; v.play(); $('playPause').textContent = '❚❚'; };
$('videoTimeline').addEventListener('pointerdown', event => {
  const handle = event.target.closest('#inHandle,#outHandle'); const mode = handle ? (handle.id === 'inHandle' ? 'in' : 'out') : 'playhead';
  timelineDrag = { mode, pointerId: event.pointerId }; event.currentTarget.setPointerCapture(event.pointerId); event.preventDefault();
  if (mode === 'playhead') seek(xToTime(event.clientX)); else if (mode === 'in') setRange(Math.min(xToTime(event.clientX), videoState.end - .001), videoState.end); else setRange(videoState.start, Math.max(xToTime(event.clientX), videoState.start + .001));
});
$('videoTimeline').addEventListener('pointermove', event => { if (!timelineDrag) return; const time = xToTime(event.clientX); if (timelineDrag.mode === 'playhead') seek(time); else if (timelineDrag.mode === 'in') setRange(Math.min(time, videoState.end - .001), videoState.end); else setRange(videoState.start, Math.max(time, videoState.start + .001)); });
$('videoTimeline').addEventListener('pointerup', () => { timelineDrag = null; }); $('videoTimeline').addEventListener('pointercancel', () => { timelineDrag = null; });
$('trimTab').onclick = () => { videoState.tab = 'trim'; $('trimTab').classList.add('active'); $('cropTab').classList.remove('active'); $('trimControls').hidden = false; $('cropControls').hidden = true; };
$('cropTab').onclick = () => { videoState.tab = 'crop'; $('cropTab').classList.add('active'); $('trimTab').classList.remove('active'); $('trimControls').hidden = true; $('cropControls').hidden = false; layoutVideoCrop(); };
function videoBox() { const v = $('videoPreview'), stage = $('videoStage'), vr = v.getBoundingClientRect(), sr = stage.getBoundingClientRect(); return { left: vr.left - sr.left, top: vr.top - sr.top, width: vr.width, height: vr.height, scaleX: vr.width / (videoState.natural?.width || 1), scaleY: vr.height / (videoState.natural?.height || 1) }; }
function layoutVideoCrop() { const box = videoBox(), crop = videoState.crop, el = $('videoCrop'); if (!crop || !box.width || !videoState.cropEnabled) { el.hidden = true; return; } el.hidden = false; el.style.left = box.left + crop.x * box.scaleX + 'px'; el.style.top = box.top + crop.y * box.scaleY + 'px'; el.style.width = crop.width * box.scaleX + 'px'; el.style.height = crop.height * box.scaleY + 'px'; el.querySelector('.crop-size').textContent = `${Math.round(crop.width)} × ${Math.round(crop.height)}`; }
function clampVideoCrop(c) { const n = videoState.natural; c.width = Math.max(2, Math.min(n.width, c.width)); c.height = Math.max(2, Math.min(n.height, c.height)); c.x = Math.max(0, Math.min(n.width - c.width, c.x)); c.y = Math.max(0, Math.min(n.height - c.height, c.y)); return c; }
function syncVideoCrop() { $('videoCropW').value = Math.round(videoState.crop.width); $('videoCropH').value = Math.round(videoState.crop.height); $('videoCropX').value = Math.round(videoState.crop.x); $('videoCropY').value = Math.round(videoState.crop.y); layoutVideoCrop(); }
['videoCropW','videoCropH','videoCropX','videoCropY'].forEach(id => $(id).addEventListener('change', () => { videoState.crop = clampVideoCrop({ x: +$('videoCropX').value, y: +$('videoCropY').value, width: +$('videoCropW').value, height: +$('videoCropH').value }); syncVideoCrop(); }));
$('videoSelectAll').onclick = () => { videoState.crop = { x: 0, y: 0, width: videoState.natural.width, height: videoState.natural.height }; syncVideoCrop(); };
$('videoClearCrop').onclick = () => { videoState.crop = { x: 0, y: 0, width: videoState.natural.width, height: videoState.natural.height }; syncVideoCrop(); };
$('videoAspects').addEventListener('click', e => { const b = e.target.closest('[data-aspect]'); if (!b) return; videoState.aspect = +b.dataset.aspect; [...$('videoAspects').children].forEach(x => x.classList.toggle('active', x === b)); if (videoState.aspect) { videoState.crop.height = videoState.crop.width / videoState.aspect; clampVideoCrop(videoState.crop); syncVideoCrop(); } });
function videoPoint(e) { const b = videoBox(); return { x: (e.clientX - b.left) / b.scaleX, y: (e.clientY - b.top) / b.scaleY }; }
$('videoStage').addEventListener('pointerdown', e => { if (!videoState.cropEnabled || !e.target.closest('#videoCrop')) return; const p = videoPoint(e), c = videoState.crop, handle = e.target.dataset.handle; videoCropDrag = { mode: handle ? 'resize' : 'move', handle, start: p, original: { ...c } }; e.currentTarget.setPointerCapture(e.pointerId); });
$('videoStage').addEventListener('pointermove', e => { if (!videoCropDrag) return; const p = videoPoint(e), s = videoCropDrag.start, o = videoCropDrag.original, c = { ...o }; if (videoCropDrag.mode === 'move') { c.x = o.x + p.x - s.x; c.y = o.y + p.y - s.y; } else { const h = videoCropDrag.handle; if (h.includes('e')) c.width = o.width + p.x - s.x; if (h.includes('s')) c.height = o.height + p.y - s.y; if (h.includes('w')) { c.width = o.width - (p.x - s.x); c.x = o.x + p.x - s.x; } if (h.includes('n')) { c.height = o.height - (p.y - s.y); c.y = o.y + p.y - s.y; } if (videoState.aspect || e.shiftKey) c.height = c.width / (videoState.aspect || o.width / o.height); } videoState.crop = clampVideoCrop(c); syncVideoCrop(); });
$('videoStage').addEventListener('pointerup', () => { videoCropDrag = null; });
$('videoSnapshot').onclick = () => runStudio(() => window.studio.media({ path: activeFile().path, action: 'snapshot', time: $('videoPreview').currentTime }), result => { if (result) toast('Saved ' + result.name); });
$('videoReset').onclick = () => setupVideo(activeFile(), videoState.tab); $('videoEditor').querySelector('[data-back]').onclick = () => selectFile(state.active);
$('saveVideo').onclick = () => { const file = activeFile(); const start = videoState.trimEnabled ? videoState.start : 0, end = videoState.trimEnabled ? videoState.end : videoState.duration; return runStudio(() => window.studio.media({ path: file.path, action: 'render', start, end, crop: videoState.cropEnabled ? videoState.crop : null, speed: videoState.speed, mute: videoState.muted, volume: videoState.volume }), result => { if (result) { toast('Rendered ' + result.name); addFiles([result.path]); } }); };
document.addEventListener('keydown', event => {
  if (state.mode !== 'video' || /INPUT|SELECT|TEXTAREA/.test(document.activeElement?.tagName || '')) return; const v = $('videoPreview');
  if (event.code === 'Space' && event.shiftKey) { event.preventDefault(); v.currentTime = videoState.start; videoState.playingRange = true; v.play(); }
  else if (event.code === 'Space') { event.preventDefault(); if (v.paused) v.play(); else v.pause(); }
  else if (event.code === 'ArrowLeft') { event.preventDefault(); seek(v.currentTime - (event.shiftKey ? 1 / 30 : 1)); }
  else if (event.code === 'ArrowRight') { event.preventDefault(); seek(v.currentTime + (event.shiftKey ? 1 / 30 : 1)); }
  else if (event.code === 'Home') seek(0); else if (event.code === 'End') seek(videoState.duration);
  else if (event.code === 'KeyI') setRange(v.currentTime, videoState.end); else if (event.code === 'KeyO') setRange(videoState.start, v.currentTime);
});

/* ---------------- PDF ---------------- */
async function setupPdf(file) {
  $('pdfFormat').textContent = 'PDF'; $('pdfStatus').textContent = 'Loading document…'; $('pdfThumbs').innerHTML = ''; $('pdfCanvas').width = 0;
  const read = await window.studio.pdfRead(file.path); if (!read.ok) { $('pdfStatus').textContent = read.error; return toast(read.error, true); }
  const data = Uint8Array.from(atob(read.value.data), c => c.charCodeAt(0));
  try { if(!pdfjsLib){pdfjsLib=await import('./vendor/pdf.min.mjs');pdfjsLib.GlobalWorkerOptions.workerSrc='./vendor/pdf.worker.min.mjs';}await pdfState.doc?.destroy();pdfState.doc = await pdfjsLib.getDocument({ data }).promise; pdfState.pages = Array.from({ length: pdfState.doc.numPages }, (_, index) => ({ index, rotate: 0 })); pdfState.selected = 0; $('pdfStatus').textContent = `${pdfState.doc.numPages} pages`; await renderPdfThumbs(); await renderPdfPage(); }
  catch (error) { $('pdfStatus').textContent = /password/i.test(error.message) ? 'This PDF is password-protected. Open it in a PDF app to unlock it first.' : 'This PDF could not be rendered: ' + error.message; toast($('pdfStatus').textContent, true); }
}
async function renderPdfPage() {
  if (!pdfState.doc || pdfState.rendering) return; pdfState.rendering = true; const page = pdfState.pages[pdfState.selected]; if (!page) { pdfState.rendering = false; return; }
  try { const pdfPage = await pdfState.doc.getPage(page.index + 1); const viewport = pdfPage.getViewport({ scale: pdfState.scale, rotation: page.rotate }); const canvas = $('pdfCanvas'), ctx = canvas.getContext('2d'); canvas.width = viewport.width; canvas.height = viewport.height; canvas.style.width = Math.min(viewport.width, 900) + 'px'; await pdfPage.render({ canvasContext: ctx, viewport }).promise; $('pdfPageLabel').textContent = `${pdfState.selected + 1} / ${pdfState.pages.length}`; $('pdfZoomLabel').textContent = Math.round(pdfState.scale * 100) + '%'; }
  catch (error) { toast('Could not render this page: ' + error.message, true); } finally { pdfState.rendering = false; }
}
async function renderPdfThumbs() {
  const host = $('pdfThumbs'); host.innerHTML = '';
  for (let index = 0; index < pdfState.pages.length; index++) {
    const item = document.createElement('button'); item.className = 'pdf-thumb' + (index === pdfState.selected ? ' active' : ''); item.dataset.index = index; item.innerHTML = `<canvas></canvas><span>${index + 1}</span>`; host.append(item); item.onclick = () => { pdfState.selected = index; renderPdfPage(); [...host.children].forEach((x, i) => x.classList.toggle('active', i === index)); };
    try { const page = await pdfState.doc.getPage(pdfState.pages[index].index + 1), viewport = page.getViewport({ scale: .18, rotation: pdfState.pages[index].rotate }), canvas = item.querySelector('canvas'), ctx = canvas.getContext('2d'); canvas.width = viewport.width; canvas.height = viewport.height; await page.render({ canvasContext: ctx, viewport }).promise; } catch { item.querySelector('canvas').remove(); }
    if (index % 4 === 0) await new Promise(requestAnimationFrame);
  }
}
$('pdfPrev').onclick = () => { pdfState.selected = Math.max(0, pdfState.selected - 1); renderPdfPage(); renderPdfThumbs(); };
$('pdfNext').onclick = () => { pdfState.selected = Math.min(pdfState.pages.length - 1, pdfState.selected + 1); renderPdfPage(); renderPdfThumbs(); };
$('pdfZoomIn').onclick = () => { pdfState.scale = Math.min(3, pdfState.scale + .15); renderPdfPage(); };
$('pdfZoomOut').onclick = () => { pdfState.scale = Math.max(.3, pdfState.scale - .15); renderPdfPage(); };
$('pdfFit').onclick = () => { pdfState.scale = 1; renderPdfPage(); };
$('pdfRotate').onclick = () => { pdfState.pages[pdfState.selected].rotate = (pdfState.pages[pdfState.selected].rotate + 90) % 360; renderPdfPage(); renderPdfThumbs(); };
$('pdfDelete').onclick = () => { if (pdfState.pages.length <= 1) return toast('Keep at least one page.', true); pdfState.pages.splice(pdfState.selected, 1); pdfState.selected = Math.min(pdfState.selected, pdfState.pages.length - 1); renderPdfPage(); renderPdfThumbs(); };
$('pdfDuplicate').onclick = () => { pdfState.pages.splice(pdfState.selected + 1, 0, { ...pdfState.pages[pdfState.selected] }); renderPdfPage(); renderPdfThumbs(); };
$('pdfUp').onclick = () => { if (!pdfState.selected) return; [pdfState.pages[pdfState.selected - 1], pdfState.pages[pdfState.selected]] = [pdfState.pages[pdfState.selected], pdfState.pages[pdfState.selected - 1]]; pdfState.selected--; renderPdfPage(); renderPdfThumbs(); };
$('pdfDown').onclick = () => { if (pdfState.selected >= pdfState.pages.length - 1) return; [pdfState.pages[pdfState.selected + 1], pdfState.pages[pdfState.selected]] = [pdfState.pages[pdfState.selected], pdfState.pages[pdfState.selected + 1]]; pdfState.selected++; renderPdfPage(); renderPdfThumbs(); };
$('pdfReset').onclick = () => setupPdf(activeFile());
$('pdfEditor').querySelector('[data-back]').onclick = () => selectFile(state.active);
$('pdfMerge').onclick = () => mergePdfs();
$('savePdf').onclick = () => runStudio(() => window.studio.pdfSave({ path: activeFile().path, pages: pdfState.pages }), result => { if (result) toast('Saved ' + result.name); });
$('pdfSplit').onclick = () => runStudio(() => window.studio.pdfSave({ path: activeFile().path, pages: [pdfState.pages[pdfState.selected]] }), result => { if (result) toast('Saved ' + result.name); });
$('pdfImages').onclick = async () => { const images = []; for (let index = 0; index < pdfState.pages.length; index++) { const page = await pdfState.doc.getPage(pdfState.pages[index].index + 1), viewport = page.getViewport({ scale: 1.4, rotation: pdfState.pages[index].rotate }), canvas = document.createElement('canvas'), ctx = canvas.getContext('2d'); canvas.width = viewport.width; canvas.height = viewport.height; await page.render({ canvasContext: ctx, viewport }).promise; images.push({ name: `${activeFile().name.replace(/\.pdf$/i, '')}-page-${index + 1}`, data: canvas.toDataURL('image/png') }); } return runStudio(() => window.studio.writeImages({ images }), result => { if (result) toast('Saved ' + result.outputs.length + ' page images'); }); };
async function mergePdfs() { return runStudio(() => window.studio.pdfMerge({}), result => { if (result) { toast('Merged PDF saved: ' + result.name); addFiles([result.path]); } }); }

/* ---------------- global ---------------- */
$('addFiles').onclick = async () => { const result = await window.studio.choose(); if (result.ok) addFilesFromInspect(result.value); };
$('emptyChoose').onclick = () => $('addFiles').click();
$('closeStudio').onclick = () => window.close();
document.querySelectorAll('[data-back]').forEach(button => button.onclick = () => selectFile(state.active));
$('fileList').onclick = event => { const remove = event.target.closest('[data-remove]'); if (remove) { event.stopPropagation(); removeFile(remove.dataset.remove); return; } const item = event.target.closest('[data-path]'); if (item) selectFile(item.dataset.path); };
document.addEventListener('keydown', event => {if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='o'){event.preventDefault();$('addFiles').click();}});
document.addEventListener('dragover', event => event.preventDefault());
document.addEventListener('drop', event => { event.preventDefault(); const paths = [...event.dataTransfer.files].map(file => window.studio.filePath(file)).filter(Boolean); if (paths.length) addFiles(paths); });
window.studio.onAdd(paths => addFiles(paths));
function addFilesFromInspect(files) { for (const file of files) if (!state.files.some(x => x.path === file.path)) state.files.push(file); state.active = files[0]?.path || state.active; renderQueue(); if (state.active) selectFile(state.active); }
