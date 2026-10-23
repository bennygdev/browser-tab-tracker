import { sendMessage } from '@/lib/messages';
import { createQueue } from '@/lib/queue';
import { MINUTE_MS } from '@/lib/time';

const DOWNLOAD_TIMEOUT_MS = 5 * MINUTE_MS;
const JSON_TYPE = 'application/json';

interface FileUrl {
  url: string;
  release: () => Promise<void>;
}

const saves = createQueue();

export function saveJsonFile(filename: string, json: string, { silent }: { silent: boolean }) {
  return saves(() => download(filename, json, silent));
}

// Runs on every start in case the worker was stopped while the download bubble was hidden.
export function restoreDownloadUi() {
  return setDownloadUi(true);
}

async function download(filename: string, json: string, silent: boolean) {
  const file = await createFileUrl(json);
  try {
    if (silent) await setDownloadUi(false);
    const id = await browser.downloads.download({
      url: file.url,
      filename,
      conflictAction: silent ? 'overwrite' : 'uniquify',
      ...(silent && { saveAs: false }),
    });
    const completed = await whenFinished(id);
    if (silent && completed) await browser.downloads.erase({ id });
    return completed;
  } finally {
    if (silent) await setDownloadUi(true);
    await file.release();
  }
}

async function createFileUrl(json: string): Promise<FileUrl> {
  if (import.meta.env.BROWSER === 'firefox') {
    const url = URL.createObjectURL(new Blob([json], { type: JSON_TYPE }));
    return { url, release: async () => URL.revokeObjectURL(url) };
  }

  // Chrome's service worker has no URL.createObjectURL, so the offscreen page makes the file URL.
  if (!(await browser.offscreen.hasDocument())) {
    await browser.offscreen.createDocument({
      url: browser.runtime.getURL('/offscreen.html'),
      reasons: ['BLOBS'],
      justification: 'Save the tab history backup as a file',
    });
  }
  const url = await sendMessage('createObjectUrl', { text: json, type: JSON_TYPE });
  return { url, release: () => browser.offscreen.closeDocument() };
}

async function setDownloadUi(enabled: boolean) {
  if (import.meta.env.BROWSER !== 'firefox') await browser.downloads.setUiOptions({ enabled });
}

function whenFinished(id: number) {
  return new Promise<boolean>((resolve) => {
    const finish = (state: string | undefined) => {
      if (state !== 'complete' && state !== 'interrupted') return;
      clearTimeout(timer);
      browser.downloads.onChanged.removeListener(onChanged);
      resolve(state === 'complete');
    };
    const onChanged = (delta: Browser.downloads.DownloadDelta) => {
      if (delta.id === id) finish(delta.state?.current);
    };
    const timer = setTimeout(() => {
      browser.downloads.onChanged.removeListener(onChanged);
      resolve(false);
    }, DOWNLOAD_TIMEOUT_MS);

    browser.downloads.onChanged.addListener(onChanged);
    browser.downloads.search({ id }).then(([item]) => finish(item?.state), () => undefined);
  });
}
