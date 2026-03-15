import { getDB, saveDB } from '../db';
import type { ContextState } from '@contextcore/shared';

export interface ContextStateInsert {
  focus_state: string;
  energy_level: string;
  stress_level: string;
  focus_score: number;
  energy_score: number;
  stress_score: number;
  momentum_score: number;
  active_project_id: number | null;
  active_app: string | null;
  deep_work_minutes_today: number;
  meetings_today: number;
  next_meeting_ts: number | null;
  inference_reason: string;
  confidence: number;
}

export class ContextStateRepository {
  async insert(state: ContextStateInsert): Promise<number> {
    const db = await getDB();
    db.run(`
      INSERT INTO context_states (
        focus_state, energy_level, stress_level,
        focus_score, energy_score, stress_score, momentum_score,
        active_project_id, active_app,
        deep_work_minutes_today, meetings_today, next_meeting_ts,
        inference_reason, confidence
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `, [
      state.focus_state, state.energy_level, state.stress_level,
      state.focus_score, state.energy_score, state.stress_score, state.momentum_score,
      state.active_project_id, state.active_app,
      state.deep_work_minutes_today, state.meetings_today, state.next_meeting_ts,
      state.inference_reason, state.confidence
    ]);
    saveDB();
    const result = db.exec(`SELECT last_insert_rowid() as id`);
    return result[0].values[0][0] as number;
  }

  async getLatest(): Promise<ContextState | null> {
    const db = await getDB();
    const result = db.exec(`
      SELECT cs.*, p.name as project_name, p.color as project_color
      FROM context_states cs
      LEFT JOIN projects p ON cs.active_project_id = p.id
      ORDER BY cs.ts DESC LIMIT 1
    `);
    if (!result.length || !result[0].values.length) return null;
    return this.rowToModel(result[0].columns, result[0].values[0]);
  }

  async getHistory(hours: number = 24): Promise<ContextState[]> {
    const db = await getDB();
    const since = Math.floor(Date.now() / 1000) - hours * 3600;
    const result = db.exec(`
      SELECT cs.*, p.name as project_name
      FROM context_states cs
      LEFT JOIN projects p ON cs.active_project_id = p.id
      WHERE cs.ts >= ${since}
      ORDER BY cs.ts ASC
    `);
    if (!result.length) return [];
    const { columns, values } = result[0];
    return values.map((row: any[]) => this.rowToModel(columns, row));
  }

  private rowToModel(columns: string[], values: any[]): ContextState {
    const obj: any = {};
    columns.forEach((col, i) => obj[col] = values[i]);
    return {
      id:                      obj.id,
      focus_state:             obj.focus_state,
      energy_level:            obj.energy_level,
      stress_level:            obj.stress_score,
      stress_category:         obj.stress_level,
      focus_score:             obj.focus_score,
      energy_score:            obj.energy_score,
      momentum_score:          obj.momentum_score,
      active_project:          obj.project_name ?? undefined,
      active_app:              obj.active_app ?? undefined,
      deep_work_minutes_today: obj.deep_work_minutes_today,
      meetings_today:          obj.meetings_today,
      next_meeting_ts:         obj.next_meeting_ts ?? undefined,
      inferred_at:             obj.ts,
      inference_reason:        obj.inference_reason,
      confidence:              obj.confidence
    };
  }
}