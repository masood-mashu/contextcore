import {
  DEEP_WORK_APPS,
  DISTRACTION_APPS,
  COMMUNICATION_APPS
} from '@contextcore/shared';

// Everything the scorer needs to know about recent activity
export interface ActivitySignals {
  appSessions: AppSessionSignal[];
  meetingsToday: number;
  nextMeetingTs: number | null;
  todayMood: number | null;   // 1-5 from mood checkin
  todayEnergy: number | null; // 1-5 from mood checkin
  currentApp: string | null;
  hourOfDay: number;
}

export interface AppSessionSignal {
  app_name: string;
  total_sec: number;
}

export interface Scores {
  focus:    number;  // 0-10
  energy:   number;  // 0-10
  stress:   number;  // 0-10
  momentum: number;  // 0-10
}

// ─── Focus Score ──────────────────────────────────────────────────────────────
// High focus = spending time in deep work apps, few app switches
// Low focus  = distraction apps, lots of switching

export function computeFocusScore(signals: ActivitySignals): number {
  let score = 5.0; // neutral baseline

  const { appSessions, currentApp } = signals;
  const totalSessions = appSessions.length;

  if (currentApp) {
    const appLower = currentApp.toLowerCase();
    const isDeepWork    = DEEP_WORK_APPS.some(a => appLower.includes(a));
    const isDistraction = DISTRACTION_APPS.some(a => appLower.includes(a));
    const isComms       = COMMUNICATION_APPS.some(a => appLower.includes(a));

    if (isDeepWork)    score += 3.0;
    if (isDistraction) score -= 3.0;
    if (isComms)       score -= 1.0;
  }

  // Too many app switches = scattered attention
  // Each app in appSessions = one switch
  if (totalSessions > 20) score -= 2.0;
  else if (totalSessions > 10) score -= 1.0;

  // Reward sustained deep work
  // If most of your time was in deep work apps, boost the score
  const deepSecs = appSessions
    .filter(s => DEEP_WORK_APPS.some(a => s.app_name.toLowerCase().includes(a)))
    .reduce((sum, s) => sum + s.total_sec, 0);

  const totalSecs = appSessions.reduce((sum, s) => sum + s.total_sec, 0);
  const deepRatio = totalSecs > 0 ? deepSecs / totalSecs : 0;
  score += deepRatio * 2.0;

  return clamp(score);
}

// ─── Energy Score ─────────────────────────────────────────────────────────────
// Strong signal: mood checkin energy rating
// Weak signals: time of day, meeting load

export function computeEnergyScore(signals: ActivitySignals): number {
  let score = 5.0;

  // Mood checkin is the strongest signal — user told us directly
  if (signals.todayEnergy !== null) {
    // Convert 1-5 scale to 2-10 scale
    score = signals.todayEnergy * 2;
  }

  // Meeting load drains energy
  if (signals.meetingsToday > 5)      score -= 2.5;
  else if (signals.meetingsToday > 3) score -= 1.5;
  else if (signals.meetingsToday > 1) score -= 0.5;

  // Natural energy curve through the day
  const h = signals.hourOfDay;
  if (h >= 9  && h <= 11) score += 0.5;  // morning peak
  if (h >= 14 && h <= 15) score -= 1.0;  // post-lunch dip
  if (h >= 20)             score -= 1.5;  // late evening fatigue

  return clamp(score);
}

// ─── Stress Score ─────────────────────────────────────────────────────────────
// Stress goes UP with: many meetings, imminent meetings, late-night work
// Stress goes DOWN with: long breaks, good mood

export function computeStressScore(signals: ActivitySignals): number {
  let score = 3.0; // baseline: low stress

  // Imminent meeting (within 30 min) = stress spike
  if (signals.nextMeetingTs) {
    const minsUntil = (signals.nextMeetingTs - Math.floor(Date.now() / 1000)) / 60;
    if (minsUntil > 0 && minsUntil < 30) score += 2.0;
  }

  // Heavy meeting day
  if (signals.meetingsToday > 5)      score += 2.0;
  else if (signals.meetingsToday > 3) score += 1.0;

  // Late-night work is a stress signal
  const h = signals.hourOfDay;
  if (h >= 21)      score += 1.5;
  else if (h >= 19) score += 0.5;

  // Good mood reduces perceived stress
  if (signals.todayMood !== null) {
    if (signals.todayMood >= 4) score -= 1.0;
    if (signals.todayMood <= 2) score += 1.5;
  }

  return clamp(score);
}

// ─── Momentum Score ───────────────────────────────────────────────────────────
// How much real work got done today?

export function computeMomentumScore(signals: ActivitySignals): number {
  const deepSecs = signals.appSessions
    .filter(s => DEEP_WORK_APPS.some(a => s.app_name.toLowerCase().includes(a)))
    .reduce((sum, s) => sum + s.total_sec, 0);

  const deepHours = deepSecs / 3600;

  if (deepHours >= 4)      return 9.0;
  else if (deepHours >= 2) return 7.0;
  else if (deepHours >= 1) return 5.5;
  else if (deepHours >= 0.5) return 4.0;
  return 2.5;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Clamp a score to the 0-10 range
function clamp(score: number): number {
  return Math.round(Math.max(0, Math.min(10, score)) * 10) / 10;
}