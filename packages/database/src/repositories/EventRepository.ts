import { getDB, saveDB } from '../db';
import type { CapturedEvent, EventType } from '@contextcore/shared';

export class EventRepository {
  async insert(type: EventType, source: string, payload: Record<string, unknown>): Promise<number> {
    const db = await getDB();
    db.run(
      `INSERT INTO events (type, source, payload) VALUES (?, ?, ?)`,
      [type, source, JSON.stringify(payload)]
    );
    saveDB();
    const result = db.exec(`SELECT last_insert_rowid() as id`);
    return result[0].values[0][0] as number;
  }

  async getPending(): Promise<CapturedEvent[]> {
    const db = await getDB();
    const result = db.exec(
      `SELECT * FROM events WHERE processed = 0 ORDER BY ts ASC LIMIT 100`
    );
    if (!result.length) return [];
    return this.rowsToModels(result[0]);
  }

  async markProcessed(ids: number[]): Promise<void> {
    const db = await getDB();
    ids.forEach(id => db.run(`UPDATE events SET processed = 1 WHERE id = ?`, [id]));
    saveDB();
  }

  private rowsToModels(result: any): CapturedEvent[] {
    const { columns, values } = result;
    return values.map((row: any[]) => {
      const obj: any = {};
      columns.forEach((col: string, i: number) => obj[col] = row[i]);
      return {
        id:        obj.id,
        type:      obj.type,
        source:    obj.source,
        payload:   JSON.parse(obj.payload),
        ts:        obj.ts,
        processed: obj.processed === 1
      } as CapturedEvent;
    });
  }
}