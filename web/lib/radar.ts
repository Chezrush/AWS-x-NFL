export type Pos = "WR" | "TE" | "RB";

export type LeaderMeta = {
  plays: number; routes: number; mismatch_routes: number; mismatch_sep_gain: number;
  qb_ignores_optimal_pct: number; qb_ignores_random_baseline_pct: number; epa_when_optimal: number; epa_when_not_optimal: number; ots_mismatch_avg: number; ots_other_avg: number;
};
export type LeaderPlayer = {
  nflId: number; displayName: string; position: Pos; team: string; routes_run: number; avg_ots: number;
  optimal_target_rate: number; actual_target_rate: number; unexploited_rate: number;
  mismatch_win_rate: number; mismatch_routes: number;
};
export type Leaderboard = { meta: LeaderMeta; players: LeaderPlayer[] };

export type FPlayer = {
  nflId: number; name: string; pos: string; team: string; side: "offense" | "defense";
  jersey: number; lined_up: string; role: "receiver" | "coverage" | "other";
};
export type FReceiver = {
  nflId: number; ots: number; sep_now: number; sep_proj: number; is_mismatch: boolean; past_sticks: boolean;
  is_optimal_target: boolean; is_targeted: boolean; def_nflId: number; def_pos: string;
};
export type FeaturedPlay = {
  id: string; gameId: number; playId: number; week: number; offense: string; defense: string;
  quarter: number; down: number; yardsToGo: number; coverage: string; coverage_type: "man" | "zone" | "other";
  description: string; hz: number; pass_frame_index: number; snap_frame_index: number; end_frame_index: number;
  los_x: number; first_down_x: number; players: FPlayer[]; frames: number[][]; receivers: FReceiver[]; qb_gap: number;
};

export type DefGroup = "LB" | "CB" | "S" | "other";
export function defGroup(pos: string): DefGroup {
  if (/LB$/.test(pos) || pos === "LB") return "LB";
  if (pos === "CB") return "CB";
  if (["FS", "SS", "S", "DB"].includes(pos)) return "S";
  return "other";
}
