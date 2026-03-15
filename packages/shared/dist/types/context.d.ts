export type FocusState = 'deep_work' | 'scattered' | 'in_meeting' | 'break' | 'unknown';
export type EnergyLevel = 'high' | 'medium' | 'low' | 'unknown';
export type StressLevel = 'low' | 'moderate' | 'high' | 'critical';
export interface ContextState {
    id?: number;
    focus_state: FocusState;
    energy_level: EnergyLevel;
    stress_level: number;
    stress_category: StressLevel;
    active_project?: string;
    active_app?: string;
    deep_work_minutes_today: number;
    meetings_today: number;
    next_meeting_ts?: number;
    focus_score: number;
    energy_score: number;
    momentum_score: number;
    inferred_at: number;
    inference_reason: string;
    confidence: number;
}
export type EventType = 'app_focus' | 'calendar' | 'mood' | 'idle';
export interface CapturedEvent {
    id?: number;
    type: EventType;
    source: string;
    payload: Record<string, unknown>;
    ts: number;
    processed: boolean;
}
export interface MoodCheckin {
    id?: number;
    mood: number;
    energy: number;
    note?: string;
    tags: string[];
    ts: number;
}
export interface Project {
    id?: number;
    name: string;
    keywords: string[];
    color: string;
    is_active: boolean;
    created_at: number;
    last_active?: number;
}
export interface Mirror {
    id?: number;
    date: string;
    summary: string;
    generated_at: number;
    model_used: string;
}
//# sourceMappingURL=context.d.ts.map