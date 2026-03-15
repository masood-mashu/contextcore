// Single entry point — everything imported from '@contextcore/database'
// goes through here. Other packages never import internal files directly.
export { getDB, closeDB } from './db';
export { EventRepository } from './repositories/EventRepository';
export { ContextStateRepository } from './repositories/ContextStateRepository';
export { MoodRepository } from './repositories/MoodRepository';
export { ProjectRepository } from './repositories/ProjectRepository';
export { MirrorRepository } from './repositories/MirrorRepository';
export type { ContextStateInsert } from './repositories/ContextStateRepository';