import { Router, Response } from 'express';
import { generateMirror } from '../services/MirrorService';
import type { AuthedRequest } from '../middleware/auth';

const router = Router();

// GET /mirror
router.get('/', async (req: AuthedRequest, res: Response) => {
  try {
    const forceRegenerate = req.query.refresh === 'true';
    const summary = await generateMirror(forceRegenerate);
    res.json({ ok: true, summary });
  } catch (err) {
    res.status(500).json({ error: 'Mirror generation failed', detail: String(err) });
  }
});

export default router;