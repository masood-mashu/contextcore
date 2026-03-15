import { Router, Response } from 'express';
import { ContextStateRepository } from '@contextcore/database';
import { computeAndSave } from '@contextcore/context-engine';
import type { AuthedRequest } from '../middleware/auth';

const router = Router();
const contextRepo = new ContextStateRepository();

// GET /context
// The main endpoint — returns the most recent context snapshot
router.get('/', async (req: AuthedRequest, res: Response) => {
  try {
    const state = await contextRepo.getLatest();

    if (!state) {
      res.status(404).json({
        error: 'No context computed yet',
        hint: 'POST /context/refresh to trigger the engine now'
      });
      return;
    }

    const ageSeconds = Math.floor(Date.now() / 1000) - state.inferred_at;
    const isStale    = ageSeconds > 1800; // stale after 30 min

    res.json({
      ok:      true,
      stale:   isStale,
      age_sec: ageSeconds,
      context: state
    });

  } catch (err) {
    console.error('[API] GET /context error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /context/focus
// Lightweight endpoint — just the focus state
// This is what the VS Code extension polls every 2 minutes
router.get('/focus', async (req: AuthedRequest, res: Response) => {
  try {
    const state = await contextRepo.getLatest();
    if (!state) {
      res.status(404).json({ error: 'No context yet' });
      return;
    }

    res.json({
      focus_state: state.focus_state,
      focus_score: state.focus_score,
      suggestion:  getSuggestion(state.focus_state)
    });

  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /context/history?hours=24
// Returns all context snapshots for the last N hours
// Used by the timeline chart in the Electron dashboard
router.get('/history', async (req: AuthedRequest, res: Response) => {
  try {
    const hours   = Math.min(parseInt(req.query.hours as string) || 24, 168);
    const history = await contextRepo.getHistory(hours);

    res.json({
      ok:     true,
      hours,
      count:  history.length,
      states: history
    });

  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /context/refresh
// Forces the engine to recompute now instead of waiting for the 15-min interval
// Useful for testing or when user just logged a mood
router.post('/refresh', async (req: AuthedRequest, res: Response) => {
  try {
    await computeAndSave();
    const state = await contextRepo.getLatest();
    res.json({ ok: true, message: 'Context recomputed', context: state });
  } catch (err) {
    res.status(500).json({ error: 'Refresh failed', detail: String(err) });
  }
});

// ─── Helper ───────────────────────────────────────────────────────────────────

function getSuggestion(focusState: string): string {
  const suggestions: Record<string, string> = {
    deep_work:  "You're in the zone. Protect this time.",
    scattered:  "Feeling scattered. Try a 25-min Pomodoro to reset.",
    in_meeting: "In a meeting. Be present.",
    break:      "Taking a break. Rest is productive too.",
    unknown:    "Not enough data yet. Keep working!"
  };
  return suggestions[focusState] ?? "Keep going!";
}

export default router;