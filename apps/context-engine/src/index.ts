// Entry point — used when running the engine standalone
// In production this runs inside the Electron main process instead
import { startEngine } from './engine';
import { closeDB } from '@contextcore/database';

console.log('[ContextCore] Context Engine starting...');
startEngine();

// Graceful shutdown on Ctrl+C
process.on('SIGINT', () => {
  console.log('\n[ContextCore] Shutting down...');
  closeDB();
  process.exit(0);
});