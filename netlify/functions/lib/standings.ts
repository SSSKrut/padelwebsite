import type { MatchTablePlayer, MatchTableMatch } from "./matchTable";

export interface StandingEntry {
  id: string;
  name: string;
  points: number;
  diff: number;
}

export function calculateCourtStandings(
  players: MatchTablePlayer[],
  matches: MatchTableMatch[],
): StandingEntry[] {
  const entries = new Map<string, StandingEntry>();
  players.forEach((player) => {
    entries.set(player.id, { id: player.id, name: player.name, points: 0, diff: 0 });
  });

  matches.forEach((match) => {
    if (match.score1 === null || match.score2 === null) return;
    const score1 = match.score1;
    const score2 = match.score2;
    const pair1Points = score1 === score2 ? 0.5 : score1 > score2 ? 1 : 0;
    const pair2Points = score1 === score2 ? 0.5 : score1 > score2 ? 0 : 1;
    const diff1 = score1 - score2;
    const diff2 = score2 - score1;

    match.pair1.forEach((player) => {
      const entry = entries.get(player.id);
      if (!entry) return;
      entry.points += pair1Points;
      entry.diff += diff1;
    });

    match.pair2.forEach((player) => {
      const entry = entries.get(player.id);
      if (!entry) return;
      entry.points += pair2Points;
      entry.diff += diff2;
    });
  });

  return Array.from(entries.values()).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.diff !== a.diff) return b.diff - a.diff;
    return a.name.localeCompare(b.name);
  });
}
