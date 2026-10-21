import fs from "node:fs/promises";
import path from "node:path";

export type Pos = "WR" | "TE" | "RB";
export type Tier = "elite" | "good" | "avg" | "low" | "insufficient";
export type CovType = "man" | "zone";

export type PlayersMeta = {
  version: number; season: number; week_from: number; week_to: number;
  n_plays: number; n_routes: number; n_players: number; shrinkage_k: number; min_routes: number;
  tier_cutoffs: { elite: number; good: number; avg: number };
};
export type Player = {
  nflId: number; name: string; position: Pos; team: string; routes: number;
  n_man: number; soe_man: number | null; sep_man_raw: number | null;
  n_zone: number; soe_zone: number | null; sep_zone_raw: number | null;
  n_all: number; soe_all: number | null; tier: Tier;
};
export type PlayersSoe = { meta: PlayersMeta; players: Player[] };

export type SituationTendency = { n: number; pct_man: number; top_coverage: string; n_top: number };
export type TeamTendency = {
  n: number; pct_man: number; pct_zone: number; pct_other: number; top_coverage: string; n_top: number;
  situations: Record<string, SituationTendency>;
};
export type DefenseTendencies = { LEAGUE: TeamTendency; teams: Record<string, TeamTendency> };

export type Receiver = { nflId: number; name: string; position: Pos; soe: number; n: number; low_n: boolean };
export type Dominant = { type: CovType; pct_man: number; n: number; basis: "situation" | "team" | string };
export type GamePlan = {
  top_receivers: Record<string, { man: Receiver[]; zone: Receiver[] }>;
  dominant: Record<string, Record<string, Dominant>>;
};

export type ReplayPlayer = {
  nflId: number; name: string; pos: string; team: string; side: "offense" | "defense";
  role: "offense" | "defense" | "target" | "closest_defender"; jersey: number; lined_up: string;
};
export type Replay = {
  gameId: number; playId: number; week: number; offense: string; defense: string;
  quarter: number; down: number; yardsToGo: number; coverage: string; coverage_type: CovType;
  target: { nflId: number; name: string; pos: string };
  sep: number; expected_sep: number; soe: number; epa: number; playDescription: string;
  los_x: number; first_down_x: number; pass_frame_index: number; hz: number;
  players: ReplayPlayer[]; frames: number[][];
};

export type Tercile = { n: number; completion: number; mean: number };
export type Terciles = { low: Tercile; mid: Tercile; high: Tercile };
export type EpaTercile = Tercile & { epa: number; success: number; cpoe: number };
export type EpaTerciles = { low: EpaTercile; mid: EpaTercile; high: EpaTercile };
export type Validation = {
  n_targeted_routes: number; completion_overall: number;
  soe_terciles: Terciles; sep_terciles: Terciles; by_coverage: Record<CovType, Terciles>;
  epa_terciles: EpaTerciles; epa_by_coverage: Record<CovType, EpaTerciles>;
};

export type OverlookedPlayer = {
  nflId: number; name: string; position: Pos; team: string; routes: number; targets: number;
  target_rate: number; expected_targets: number; toe: number; soe_all: number; n: number;
};
export type Overlooked = {
  meta: {
    min_routes: number; n_players: number; n_overlooked: number;
    validation: { epa_overlooked_vs_rest: { rest: { n: number; epa_per_target: number }; overlooked: { n: number; epa_per_target: number } } };
  };
  top_overlooked: OverlookedPlayer[]; // top_overused volontairement non expose
};

export type Pct = number | null;
export type PlayerProfile = {
  id: number; name: string; position: Pos; team: string; teams?: string[]; jersey?: number | null;
  height_in?: number | null; weight?: number | null; age?: number | null; college?: string | null;
  routes: number; targets: number; receptions: number; rec_yards: number; tds: number;
  catch_rate: Pct; target_rate: Pct; air_yards_avg: Pct; yac_avg: Pct; epa_per_target: Pct; success_rate: Pct; cpoe_avg: Pct;
  soe_all: Pct; soe_man: Pct; soe_zone: Pct; n_man: number; n_zone: number; sep_raw_man?: Pct; sep_raw_zone?: Pct;
  tier: Tier; expected_targets?: Pct; toe?: Pct;
  pct_soe_all?: Pct; pct_soe_man?: Pct; pct_soe_zone?: Pct; pct_target_rate?: Pct; pct_epa?: Pct;
  rank_soe_all?: number | null; n_rank?: number | null;
  by_alignment?: { align: string; routes: number; soe: Pct; targets: number }[];
  by_coverage?: { coverage: string; type: string; routes: number; soe: Pct; targets: number; epa_per_target: Pct }[];
  by_week?: { week: number; routes: number; soe: Pct; targets: number }[];
  best_plays?: {
    gameId: number; playId: number; week: number; opponent: string; down: number; yards_to_go: number;
    coverage: string; sep: number; soe: number; epa: Pct; result?: string; description: string; replay_index: number | null;
  }[];
  low_n?: boolean;
};
export type PlayerProfiles = { meta: { n_players: number; min_routes: number; low_n_below: number }; players: PlayerProfile[] };

export type TeamDefense = {
  pass_plays_faced: number; pct_man: number; pct_zone: number; pct_other: number;
  soe_allowed: Pct; soe_allowed_man: Pct; soe_allowed_zone: Pct; epa_allowed_per_pass: Pct;
  sep_allowed_man: Pct; sep_allowed_zone: Pct;
  coverage_mix: { coverage: string; pct: number; n: number }[];
  by_formation: { formation: string; n: number; pct_man: number }[];
  vulnerable_positions: Partial<Record<Pos, number>>;
  by_down_distance: Record<string, SituationTendency>;
  worst_matchups: { nflId: number; name: string; team: string; soe: number; routes: number }[];
  rank_soe_allowed?: number | null;
};
export type TeamOffense = {
  routes: number; soe_generated: Pct; epa_per_pass: Pct; pass_plays: number; pct_shotgun: number;
  top3_receivers: { nflId: number; name: string; soe_all: number }[];
};
export type TeamsData = {
  meta: { n_teams: number; n_plays: number; min_routes_matchup: number };
  teams: Record<string, { offense: TeamOffense; defense: TeamDefense }>;
  league: TeamDefense;
};

export type AllData = {
  players: PlayersSoe; tendencies: DefenseTendencies; gamePlan: GamePlan;
  replays: Replay[]; validation: Validation; overlooked: Overlooked;
};

async function read<T>(name: string): Promise<T> {
  const raw = await fs.readFile(path.join(/*turbopackIgnore: true*/ process.cwd(), "data", `${name}.json`), "utf8");
  return JSON.parse(raw) as T;
}

/** Charge les 5 JSON pre-calcules (cote serveur uniquement). */
async function readOptional<T>(name: string): Promise<T | null> {
  try { return await read<T>(name); } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw e;
  }
}
export const loadProfiles = () => readOptional<PlayerProfiles>("player_profiles");
export const loadTeams = () => readOptional<TeamsData>("teams");

export async function loadAll(): Promise<AllData> {
  const [players, tendencies, gamePlan, replays, validation, overlookedRaw] = await Promise.all([
    read<PlayersSoe>("players_soe"),
    read<DefenseTendencies>("defense_tendencies"),
    read<GamePlan>("game_plan"),
    read<Replay[]>("replays"),
    read<Validation>("validation"),
    read<Overlooked & { top_overused?: unknown }>("overlooked"),
  ]);
  const { top_overlooked, meta } = overlookedRaw;
  return { players, tendencies, gamePlan, replays, validation, overlooked: { meta, top_overlooked } };
}
