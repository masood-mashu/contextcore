import { 
  ContextStateRepository,
  EventRepository,
  MoodRepository,
  ProjectRepository
} from '@contextcore/database';
import type { ContextStateInsert } from '@contextcore/database';
import { ENGINE_INTERVAL_MS, DEEP_WORK_APPS } from '@contextcore/shared';
import {
  computeFocusScore,
  computeEnergyScore,
  computeStressScore,
  computeMomentumScore,
  type ActivitySignals,
  type AppSessionSignal
} from './scorer';
import { classifyState } from './classifier';

const contextRepo = new ContextStateRepository();
const eventRepo   = new EventRepository();
const moodRepo    = new MoodRepository();
const projectRepo = new ProjectRepository();

let engineTimer: NodeJS.Timeout | null = null;

// ─── Public API ───────────────────────────────────────────────────────────────

export function startEngine(): void {
  console.log('[Engine] Starting — will compute context every 15 minutes');

  // Run immediately on start, then on interval
  computeAndSave();
  engineTimer = setInterval(computeAndSave, ENGINE_INTERVAL_MS);
}

export function stopEngine(): void {
  if (engineTimer) {
    clearInterval(engineTimer);
    engineTimer = null;
    console.log('[Engine] Stopped');
  }
}

// Exposed for manual triggering (e.g. from API endpoint or tests)
export async function computeAndSave(): Promise<void> {
  try {
    console.log('[Engine] Computing context state...');

    const signals  = await gatherSignals();
    const scores   = {
      focus:    computeFocusScore(signals),
      energy:   computeEnergyScore(signals),
      stress:   computeStressScore(signals),
      momentum: computeMomentumScore(signals)
    };
    const classified = classifyState(scores);

    // Detect active project from current app window
    const activeProject = signals.currentApp
      ? await projectRepo.detectFromWindowTitle(signals.currentApp)
      : null;

    const stateInsert: ContextStateInsert = {
      focus_state:             classified.focus_state,
      energy_level:            classified.energy_level,
      stress_level:            classified.stress_level,
      focus_score:             scores.focus,
      energy_score:            scores.energy,
      stress_score:            scores.stress,
      momentum_score:          scores.momentum,
      active_project_id:       activeProject?.id ?? null,
      active_app:              signals.currentApp,
      deep_work_minutes_today: computeDeepWorkMinutes(signals.appSessions),
      meetings_today:          signals.meetingsToday,
      next_meeting_ts:         signals.nextMeetingTs,
      inference_reason:        classified.inference_reason,
      confidence:              classified.confidence
    };

    await contextRepo.insert(stateInsert);

    console.log(
      `[Engine] State saved — focus: ${classified.focus_state} ` +
      `(${scores.focus}) | energy: ${classified.energy_level} ` +
      `(${scores.energy}) | stress: ${classified.stress_level} (${scores.stress})`
    );

  } catch (err) {
    console.error('[Engine] Error computing state:', err);
  }
}

// ─── Signal gathering ─────────────────────────────────────────────────────────
// Pulls together all the data the scorer needs

async function gatherSignals(): Promise<ActivitySignals> {
  const now         = Math.floor(Date.now() / 1000);
  const todayStart  = Math.floor(new Date().setHours(0,0,0,0) / 1000);

  // Get today's mood checkin if it exists
  const mood = await moodRepo.getToday();

  // Get pending events (app focus events recorded since last run)
  const pendingEvents = await eventRepo.getPending();

  // Aggregate app sessions from events
  const appSessionMap = new Map<string, number>();
  let currentApp: string | null = null;

  for (const event of pendingEvents) {
    if (event.type === 'app_focus') {
      const appName = (event.payload.app as string) || 'Unknown';
      const duration = (event.payload.duration_sec as number) || 0;
      appSessionMap.set(appName, (appSessionMap.get(appName) ?? 0) + duration);
      currentApp = appName; // last recorded app = current app
    }
  }

  const appSessions: AppSessionSignal[] = Array.from(appSessionMap.entries())
    .map(([app_name, total_sec]) => ({ app_name, total_sec }))
    .sort((a, b) => b.total_sec - a.total_sec);

  // Mark events as processed so they're not counted again next run
  const processedIds = pendingEvents.map(e => e.id!).filter(Boolean);
  if (processedIds.length > 0) {
    await eventRepo.markProcessed(processedIds);
  }

  return {
    appSessions,
    meetingsToday:  0,        // will be populated when calendar sync is added
    nextMeetingTs:  null,     // will be populated when calendar sync is added
    todayMood:      mood?.mood   ?? null,
    todayEnergy:    mood?.energy ?? null,
    currentApp,
    hourOfDay:      new Date().getHours()
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function computeDeepWorkMinutes(appSessions: AppSessionSignal[]): number {
  const deepSecs = appSessions
    .filter(s => DEEP_WORK_APPS.some(a => s.app_name.toLowerCase().includes(a)))
    .reduce((sum, s) => sum + s.total_sec, 0);
  return Math.round(deepSecs / 60);
}