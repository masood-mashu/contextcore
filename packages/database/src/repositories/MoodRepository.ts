import { getDB, saveDB } from '../db';
import type { MoodCheckin } from '@contextcore/shared';

export class MoodRepository {
  async insert(mood: number, energy: number, note?: string, tags: string[] = []): Promise<number> {
    const db = await getDB();
    db.run(
      `INSERT INTO mood_checkins (mood, energy, note, tags) VALUES (?,?,?,?)`,
      [mood, energy, note ?? null, JSON.stringify(tags)]
    );
    saveDB();
    const result = db.exec(`SELECT last_insert_rowid() as id`);
    return result[0].values[0][0] as number;
  }

  async getToday(): Promise<MoodCheckin | null> {
    const db = await getDB();
    const todayStart = Math.floor(new Date().setHours(0,0,0,0) / 1000);
    const result = db.exec(
      `SELECT * FROM mood_checkins WHERE ts >= ${todayStart} ORDER BY ts DESC LIMIT 1`
    );
    if (!result.length || !result[0].values.length) return null;
    return this.rowToModel(result[0].columns, result[0].values[0]);
  }

  private rowToModel(columns: string[], values: any[]): MoodCheckin {
    const obj: any = {};
    columns.forEach((col, i) => obj[col] = values[i]);
    return {
      id:     obj.id,
      mood:   obj.mood,
      energy: obj.energy,
      note:   obj.note ?? undefined,
      tags:   JSON.parse(obj.tags),
      ts:     obj.ts
    };
  }
}