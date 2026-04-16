import { UserRole } from "@/context/AuthContext";

export interface EventParticipant {
  id: string;
  user: {
    id: string;
    name: string;
    elo: number;
  };
}

export interface EventWaitlistEntry {
  id: string;
  user: {
    id: string;
    name: string;
    elo: number;
  };
}

export interface EventDetailsResponse {
  id: string;
  title: string;
  description: string;
  date: string;
  endDate: string | null;
  location: string;
  status: string;
  maxParticipants: number;
  price: string | null;
  disclaimer: string | null;
  formatId?: string | null;
  formatConfig?: any;
  matchTableMode?: "AUTO_COURTS" | "MANUAL_ELO";
  participants: EventParticipant[];
  waitlist: EventWaitlistEntry[];
  waitlistCount: number;
  currentUserWaitlistPosition: number | null;
  currentUserWaitlistAhead: number | null;
}

export interface EventFormat {
  id: string;
  name: string;
  description?: string | null;
  strategyKey: string;
  config?: any;
  createdAt: string;
  updatedAt: string;
}

export type MatchTableStatus = "DRAFT" | "OPEN" | "CONFIRMED";

export interface MatchTablePlayer {
  id: string;
  name: string;
  elo: number;
  manualElo?: number;
  previousElo?: number;
  newElo?: number;
  isWinner?: boolean;
}

export interface MatchTableCourt {
  courtNumber: number;
  players: MatchTablePlayer[];
  isManual: boolean;
  manualOverride?: boolean;
}

export interface MatchTableMatch {
  id: string;
  courtNumber: number;
  round: number;
  pair1: [MatchTablePlayer, MatchTablePlayer];
  pair2: [MatchTablePlayer, MatchTablePlayer];
  score1: number | null;
  score2: number | null;
  status?: "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "ABANDONED" | "WALKOVER" | "NO_CONTEST";
  updatedAt?: string | null;
  updatedBy?: MatchTablePlayer | null;
}

export interface MatchTableResponse {
  mode: "AUTO_COURTS" | "MANUAL_ELO";
  eventId: string;
  status: MatchTableStatus;
  generatedAt: string | null;
  confirmedAt: string | null;
  courts: MatchTableCourt[];
  matches: MatchTableMatch[];
}

export interface CourtWinner {
  courtNumber: number;
  winners: Array<{ id: string; name: string }>;
  points: number;
  diff: number;
  isManual?: boolean;
  manualElo?: Array<{ id: string; name: string; previousElo: number; newElo: number; diff: number }>;
}

export interface EventScoreEntry {
  userId: string;
  previousElo: number;
  newElo: number;
  createdAt: string;
  updatedAt: string;
}

export interface EventScoresResponse {
  eventId: string;
  scores: EventScoreEntry[];
}

export interface AdminUser {
  id: string;
  firstName: string;
  lastName: string;
  elo: number;
  role: UserRole;
}
