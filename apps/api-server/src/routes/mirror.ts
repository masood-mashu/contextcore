import { Router, Response } from 'express';
import { MirrorRepository, ContextStateRepository } from '@contextcore/database';
import type { AuthedRequest } from '../middleware/auth';

const router      = Router();
const mirrorRepo  = new MirrorRepository();
const contextRepo = new ContextStateRepository();

// GET /mirror
// Returns today's mirror, generating it if it doesn't exist yet
router.get('/', async (req: AuthedRequest, res: Response) => {
  try {
    const today  = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const cached = await mirrorRepo.getByDate(today);

    // Return cached version unless refresh is forced
    if (cached && !req.query.refresh) {
      res.json({ ok: true, cached: true, mirror: cached });
      return;
    }

    // Generate new mirror from today's context history
    const history = await contextRepo.getHistory(24);
    const summary = generateMirrorSummary(history);

    await mirrorRepo.upsert(today, summary, 'rule-based');
    const mirror = await mirrorRepo.getByDate(today);

    res.json({ ok: true, cached: false, mirror });

  } catch (err) {
    res.status(500).json({ error: 'Mirror generation failed' });
  }
});

// ─── Rule-based summary (no LLM needed for MVP) ───────────────────────────────
// Ollama integration comes in Session 7

function generateMirrorSummary(history: any[]): string {
  if (history.length === 0) {
    return "Not enough data yet — I'm still learning your patterns. Check back tomorrow!";
  }

  const avgFocus  = avg(history.map(s => s.focus_score));
  const avgEnergy = avg(history.map(s => s.energy_score));
  const avgStress = avg(history.map(s => s.stress_level));
  const deepWork  = Math.max(...history.map(s => s.deep_work_minutes_today));
  const meetings  = Math.max(...history.map(s => s.meetings_today));

  const parts: string[] = [];

  // Focus summary
  if (avgFocus >= 7) {
    parts.push(`Strong focus day — averaged ${avgFocus.toFixed(1)}/10 with ${deepWork} min of deep work.`);
  } else if (avgFocus >= 5) {
    parts.push(`Decent focus with ${deepWork} min of deep work, though attention varied.`);
  } else {
    parts.push(`Fragmented day — only ${deepWork} min of deep work. Focus score averaged ${avgFocus.toFixed(1)}/10.`);
  }

  // Meeting load
  if (meetings > 3) {
    parts.push(`${meetings} meetings likely drained your energy budget.`);
  }

  // Stress
  if (avgStress >= 6) {
    parts.push(`Stress was elevated. Try protecting your first hour tomorrow — no meetings, no Slack.`);
  } else {
    parts.push(`Stress stayed manageable today.`);
  }

  // Suggestion
  if (avgFocus < 5) {
    parts.push(`Tomorrow: block 9–11 AM for focused work before the day gets away from you.`);
  } else {
    parts.push(`Tomorrow: build on today's momentum.`);
  }

  return parts.join(' ');
}

function avg(nums: number[]): number {
  if (!nums.length) return 5;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

export default router;