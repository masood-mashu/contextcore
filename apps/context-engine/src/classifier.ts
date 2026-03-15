import type {
  FocusState,
  EnergyLevel,
  StressLevel
} from '@contextcore/shared';
import type { Scores } from './scorer';

export interface ClassifiedState {
  focus_state:    FocusState;
  energy_level:   EnergyLevel;
  stress_level:   StressLevel;
  inference_reason: string;
  confidence:     number;
}

export function classifyState(scores: Scores): ClassifiedState {
  const focus_state   = classifyFocus(scores.focus);
  const energy_level  = classifyEnergy(scores.energy);
  const stress_level  = classifyStress(scores.stress);
  const inference_reason = buildReason(focus_state, energy_level, stress_level, scores);
  const confidence    = computeConfidence(scores);

  return {
    focus_state,
    energy_level,
    stress_level,
    inference_reason,
    confidence
  };
}

// ─── Classifiers ──────────────────────────────────────────────────────────────

function classifyFocus(score: number): FocusState {
  if (score >= 8.0) return 'deep_work';
  if (score >= 6.0) return 'unknown';    // lightly focused — not deep yet
  if (score >= 4.0) return 'unknown';    // neutral
  if (score >= 2.0) return 'scattered';
  return 'break';
}

function classifyEnergy(score: number): EnergyLevel {
  if (score >= 7.5) return 'high';
  if (score >= 5.0) return 'medium';
  if (score >= 2.5) return 'low';
  return 'unknown';
}

function classifyStress(score: number): StressLevel {
  if (score >= 8.0) return 'critical';
  if (score >= 6.0) return 'high';
  if (score >= 4.0) return 'moderate';
  return 'low';
}

// ─── Reason builder ───────────────────────────────────────────────────────────
// Produces a human-readable explanation of WHY the engine inferred this state.
// This shows up in the dashboard and VS Code extension.

function buildReason(
  focus: FocusState,
  energy: EnergyLevel,
  stress: StressLevel,
  scores: Scores
): string {
  const parts: string[] = [];

  if (focus === 'deep_work') {
    parts.push(`Focus score ${scores.focus}/10 — sustained deep work detected`);
  } else if (focus === 'scattered') {
    parts.push(`Focus score ${scores.focus}/10 — high app-switching detected`);
  } else if (focus === 'break') {
    parts.push(`No significant activity in the last 15 minutes`);
  }

  if (energy === 'high') {
    parts.push(`energy is high`);
  } else if (energy === 'low') {
    parts.push(`energy is running low`);
  }

  if (stress === 'high' || stress === 'critical') {
    parts.push(`stress is elevated (${scores.stress}/10)`);
  }

  return parts.length > 0
    ? parts.join(', ')
    : `Neutral state — not enough signals yet (scores: F${scores.focus} E${scores.energy} S${scores.stress})`;
}

// ─── Confidence ───────────────────────────────────────────────────────────────
// How confident are we in this inference?
// More signals = higher confidence

function computeConfidence(scores: Scores): number {
  // If all scores are near the neutral baseline (5.0),
  // we don't have strong signals — low confidence
  const deviation =
    Math.abs(scores.focus - 5)  +
    Math.abs(scores.energy - 5) +
    Math.abs(scores.stress - 5);

  // Max possible deviation = 15 (all scores at extremes)
  // Normalize to 0.3 - 0.95 range
  const confidence = 0.3 + (deviation / 15) * 0.65;
  return Math.round(Math.min(0.95, confidence) * 100) / 100;
}