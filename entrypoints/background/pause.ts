import { showRecordingState } from './indicator';
import { hideUnrecordedTabs, isPaused, savePaused } from './recording';
import { report } from './report';
import { snapshotNow } from './tracker';

export async function setRecordingPaused(paused: boolean) {
  if ((await isPaused()) === paused) return;

  if (paused) await snapshotNow();
  else await hideUnrecordedTabs();
  await savePaused(paused);
  await showRecordingState(paused).catch(report);
  if (!paused) await snapshotNow();
}
