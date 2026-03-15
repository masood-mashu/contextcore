import { getDB, saveDB } from '../db';
import type { Project } from '@contextcore/shared';

export class ProjectRepository {
  async getAll(): Promise<Project[]> {
    const db = await getDB();
    const result = db.exec(`SELECT * FROM projects WHERE is_active = 1`);
    if (!result.length) return [];
    const { columns, values } = result[0];
    return values.map((row: any[]) => this.rowToModel(columns, row));
  }

  async detectFromWindowTitle(windowTitle: string): Promise<Project | null> {
    const projects = await this.getAll();
    for (const project of projects) {
      const matched = project.keywords.some(k =>
        windowTitle.toLowerCase().includes(k.toLowerCase())
      );
      if (matched) return project;
    }
    return projects.find(p => p.name === 'General') ?? null;
  }

  async upsert(name: string, keywords: string[] = [], color: string = '#00f5c4'): Promise<void> {
    const db = await getDB();
    db.run(`
      INSERT INTO projects (name, keywords, color) VALUES (?,?,?)
      ON CONFLICT(name) DO UPDATE SET keywords=excluded.keywords, color=excluded.color
    `, [name, JSON.stringify(keywords), color]);
    saveDB();
  }

  private rowToModel(columns: string[], values: any[]): Project {
    const obj: any = {};
    columns.forEach((col, i) => obj[col] = values[i]);
    return {
      id:          obj.id,
      name:        obj.name,
      keywords:    JSON.parse(obj.keywords),
      color:       obj.color,
      is_active:   obj.is_active === 1,
      created_at:  obj.created_at,
      last_active: obj.last_active ?? undefined
    };
  }
}