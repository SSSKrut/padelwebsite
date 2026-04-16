export type DistributionMode = "ELO_BUCKET" | "RANDOM";
export type DistributionBalance = "straight" | "snake";
export type PairingStrategy = "KOTC_5P_CLASSIC" | "ROUND_ROBIN_4P" | "CUSTOM";

export interface MatchFormatDistribution {
  mode?: DistributionMode;
  courtSize?: number;
  balance?: DistributionBalance;
  allowBench?: boolean;
}

export interface MatchFormatConfig {
  playersPerCourt?: number;
  teamSize?: number;
  rounds?: number;
  pairingStrategy?: PairingStrategy;
  distribution?: MatchFormatDistribution;
  customMatches?: Array<{ round: number; pair1: [number, number]; pair2: [number, number] }>;
}

export interface ResolvedMatchFormatConfig {
  playersPerCourt: number;
  teamSize: number;
  rounds: number;
  pairingStrategy: PairingStrategy;
  distribution: Required<MatchFormatDistribution>;
  customMatches?: Array<{ round: number; pair1: [number, number]; pair2: [number, number] }>;
}

export const DEFAULT_MATCH_FORMAT_CONFIG: ResolvedMatchFormatConfig = {
  playersPerCourt: 5,
  teamSize: 2,
  rounds: 5,
  pairingStrategy: "KOTC_5P_CLASSIC",
  distribution: {
    mode: "ELO_BUCKET",
    courtSize: 5,
    balance: "straight",
    allowBench: true,
  },
  customMatches: undefined,
};

const asNumber = (value: unknown) => (typeof value === "number" && Number.isFinite(value) ? value : undefined);
const asBoolean = (value: unknown) => (typeof value === "boolean" ? value : undefined);

export const normalizeMatchFormatConfig = (raw?: unknown): ResolvedMatchFormatConfig => {
  const config = typeof raw === "object" && raw ? (raw as MatchFormatConfig) : {};
  const distribution = (config.distribution ?? {}) as MatchFormatDistribution;

  const playersPerCourt = asNumber(config.playersPerCourt) ?? DEFAULT_MATCH_FORMAT_CONFIG.playersPerCourt;
  const teamSize = asNumber(config.teamSize) ?? DEFAULT_MATCH_FORMAT_CONFIG.teamSize;
  const rounds = asNumber(config.rounds) ?? DEFAULT_MATCH_FORMAT_CONFIG.rounds;

  const pairingStrategy = config.pairingStrategy
    ?? (playersPerCourt === 4 ? "ROUND_ROBIN_4P" : DEFAULT_MATCH_FORMAT_CONFIG.pairingStrategy);

  const courtSize = asNumber(distribution.courtSize) ?? playersPerCourt;
  const mode = (distribution.mode ?? DEFAULT_MATCH_FORMAT_CONFIG.distribution.mode) as DistributionMode;
  const balance = (distribution.balance ?? DEFAULT_MATCH_FORMAT_CONFIG.distribution.balance) as DistributionBalance;
  const allowBench = asBoolean(distribution.allowBench) ?? DEFAULT_MATCH_FORMAT_CONFIG.distribution.allowBench;

  return {
    playersPerCourt,
    teamSize,
    rounds,
    pairingStrategy,
    distribution: {
      mode,
      courtSize,
      balance,
      allowBench,
    },
    customMatches: config.customMatches,
  };
};

export const validateMatchFormatConfig = (config: ResolvedMatchFormatConfig) => {
  if (config.teamSize !== 2) {
    return { ok: false as const, error: "Only teamSize=2 is supported by the current match table." };
  }

  if (config.pairingStrategy !== "CUSTOM" && ![4, 5].includes(config.playersPerCourt)) {
    return { ok: false as const, error: "Only 4 or 5 players per court are supported." };
  }

  if (config.pairingStrategy === "CUSTOM" && (!config.customMatches || config.customMatches.length === 0)) {
    return { ok: false as const, error: "customMatches is required when pairingStrategy is CUSTOM." };
  }

  return { ok: true as const };
};

export const ROUND_ROBIN_4P_PAIRINGS: Array<{ round: number; pair1: [number, number]; pair2: [number, number] }> = [
  { round: 1, pair1: [0, 1], pair2: [2, 3] },
  { round: 2, pair1: [0, 2], pair2: [1, 3] },
  { round: 3, pair1: [0, 3], pair2: [1, 2] },
];
