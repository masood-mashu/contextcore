import { getDB, saveDB } from '../db';
import type { Mirror } from '@contextcore/shared';

export class MirrorRepository {
  async upsert(date: string, summary: string, modelUsed: string = 'rule-based'): Promise<void> {
    const db = await getDB();
    db.run(`
      INSERT INTO mirrors (date, summary, model_used) VALUES (?,?,?)
      ON CONFLICT(date) DO UPDATE SET
        summary=excluded.summary,
        generated_at=strftime('%s','now'),
        model_used=excluded.model_used
    `, [date, summary, modelUsed]);
    saveDB();
  }

  async getLatest(): Promise<Mirror | null> {
    const db = await getDB();
    const result = db.exec(`SELECT * FROM mirrors ORDER BY date DESC LIMIT 1`);
    if (!result.length || !result[0].values.length) return null;
    return this.rowToModel(result[0].columns, result[0].values[0]);
  }

  async getByDate(date: string): Promise<Mirror | null> {
    const db = await getDB();
    const result = db.exec(
      `SELECT * FROM mirrors WHERE date = ? LIMIT 1`,
      [date]
    );
    if (!result.length || !result[0].values.length) return null;
    return this.rowToModel(result[0].columns, result[0].values[0]);
  }

  private rowToModel(columns: string[], values: any[]): Mirror {
    const obj: any = {};
    columns.forEach((col, i) => obj[col] = values[i]);
    return {
      id:           obj.id,
      date:         obj.date,
      summary:      obj.summary,
      generated_at: obj.generated_at,
      model_used:   obj.model_used
    };
  }
}