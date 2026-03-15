// The possible states ContextCore can infer you're in
export type FocusState = 
  | 'deep_work'    // 2+ hours focused on one thing
  | 'scattered'    // switching apps frequently
  | 'in_meeting'   // calendar event active
  | 'break'        // no activity detected
  | 'unknown';     // not enough data yet

export type EnergyLevel = 'high' | 'medium' | 'low' | 'unknown';

export type StressLevel = 'low' | 'moderate' | 'high' | 'critical';

// A snapshot of your state at a point in time
export interface ContextState {
  id?: number;
  focus_state: FocusState;
  energy_level: EnergyLevel;
  stress_level: number;        // 0-10 scale
  stress_category: StressLevel;
  active_project?: string;
  active_app?: string;
  deep_work_minutes_today: number;
  meetings_today: number;
  next_meeting_ts?: number;    // unix timestamp
  focus_score: number;         // 0-10
  energy_score: number;        // 0-10
  momentum_score: number;      // 0-10
  inferred_at: number;         // unix timestamp
  inference_reason: string;
  confidence: number;          // 0-1
}

// A raw event captured from the OS or user
export type EventType = 'app_focus' | 'calendar' | 'mood' | 'idle';

export interface CapturedEvent {
  id?: number;
  type: EventType;
  source: string;
  payload: Record<string, unknown>;
  ts: number;  // unix timestamp
  processed: boolean;
}

// A mood check-in from the user
export interface MoodCheckin {
  id?: number;
  mood: number;      // 1-5
  energy: number;    // 1-5
  note?: string;
  tags: string[];
  ts: number;
}

// A project ContextCore has detected or the user created
export interface Project {
  id?: number;
  name: string;
  keywords: string[];
  color: string;
  is_active: boolean;
  created_at: number;
  last_active?: number;
}

// The daily AI-generated debrief
export interface Mirror {
  id?: number;
  date: string;           // YYYY-MM-DD
  summary: string;
  generated_at: number;
  model_used: string;     // which LLM generated this
}