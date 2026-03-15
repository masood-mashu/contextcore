import { Router, Response } from 'express';
import { MoodRepository, EventRepository } from '@contextcore/database';
import type { AuthedRequest } from '../middleware/auth';

const router   = Router();
const moodRepo = new MoodRepository();
const eventRepo = new EventRepository();

// POST /mood
// Log a mood check-in — called by the Electron dashboard
router.post('/', async (req: AuthedRequest, res: Response) => {
  const { mood, energy, note, tags } = req.body;

  // Validate input
  if (!mood || mood < 1 || mood > 5) {
    res.status(400).json({ error: 'mood must be 1-5' });
    return;
  }
  if (!energy || energy < 1 || energy > 5) {
    res.status(400).json({ error: 'energy must be 1-5' });
    return;
  }

  try {
    const id = await moodRepo.insert(
      mood,
      energy,
      note,
      Array.isArray(tags) ? tags : []
    );

    // Also log as a raw event so the engine picks it up
    await eventRepo.insert('mood', 'manual', { mood, energy, note });

    res.status(201).json({ ok: true, id, message: 'Mood logged' });

  } catch (err) {
    res.status(500).json({ error: 'Failed to save mood' });
  }
});

// GET /mood/today
// Returns today's mood check-in if it exists
router.get('/today', async (req: AuthedRequest, res: Response) => {
  try {
    const checkin = await moodRepo.getToday();
    res.json({ ok: true, checkin: checkin ?? null });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch mood' });
  }
});

export default router;