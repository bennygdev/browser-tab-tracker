import { isPaused } from './recording';
import { report } from './report';

const MENU_ID = 'pause-recording';
const TITLE = 'Tab Tracker';
const ICONS = { 16: '/icons/16.png', 32: '/icons/32.png' } as const;

let grayIcons: Promise<Record<string, ImageData>> | undefined;

export function startIndicator(onToggle: (paused: boolean) => Promise<void>) {
  browser.contextMenus.onClicked.addListener((info) => {
    if (info.menuItemId === MENU_ID) onToggle(info.checked === true).catch(report);
  });
  showInitialState().catch(report);
}

export async function showRecordingState(paused: boolean) {
  await browser.action.setTitle({ title: paused ? `${TITLE} (recording paused)` : TITLE });
  await browser.action.setIcon(paused ? { imageData: await grayIconSet() } : { path: ICONS });
  await browser.contextMenus.update(MENU_ID, { checked: paused });
}

async function showInitialState() {
  const paused = await isPaused();
  await browser.contextMenus.removeAll();
  browser.contextMenus.create({
    id: MENU_ID,
    type: 'checkbox',
    title: 'Pause recording',
    contexts: ['action'],
    checked: paused,
  });
  await showRecordingState(paused);
}

function grayIconSet() {
  grayIcons ??= Promise.all(
    Object.entries(ICONS).map(async ([size, path]) => [size, await grayIcon(Number(size), path)] as const),
  ).then(Object.fromEntries);
  return grayIcons;
}

async function grayIcon(size: number, path: (typeof ICONS)[keyof typeof ICONS]) {
  const response = await fetch(browser.runtime.getURL(path));
  const bitmap = await createImageBitmap(await response.blob());
  const context = new OffscreenCanvas(size, size).getContext('2d');
  if (!context) throw new Error('Canvas is not available');

  context.drawImage(bitmap, 0, 0, size, size);
  const image = context.getImageData(0, 0, size, size);
  for (let i = 0; i < image.data.length; i += 4) {
    const [red = 0, green = 0, blue = 0] = image.data.subarray(i, i + 3);
    image.data.fill(red * 0.299 + green * 0.587 + blue * 0.114, i, i + 3);
  }
  return image;
}
