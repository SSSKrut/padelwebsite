import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trophy, Loader2 } from "lucide-react";
import { formatStandingPoints, formatStandingDiff } from "@/lib/standings";
import type { MatchTableResponse, CourtWinner } from "@/types/events";

export function CourtWinnersCard({
  matchTable,
  matchTableLoading,
  courtWinners,
}: {
  matchTable: MatchTableResponse | undefined;
  matchTableLoading: boolean;
  courtWinners: CourtWinner[];
}) {
  return (
    <Card className="shadow-lg border-0">
      <CardHeader>
        {matchTable?.mode === "MANUAL_ELO" ? (
          <>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Trophy className="w-5 h-5 text-primary" /> ELO Changes
            </CardTitle>
            <CardDescription>Rating changes for all participants.</CardDescription>
          </>
        ) : (
          <>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Trophy className="w-5 h-5 text-primary" /> Court Winners
            </CardTitle>
            <CardDescription>Top players per court based on points and difference.</CardDescription>
          </>
        )}
      </CardHeader>
      <CardContent>
        {matchTableLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading match results...
          </div>
        ) : (matchTable!.mode === "MANUAL_ELO" ? matchTable!.courts[0]?.players.length > 0 : courtWinners.length > 0) ? (
          <div className="overflow-x-auto">
            {matchTable!.mode === "MANUAL_ELO" ? (
              <Table className="w-full min-w-[600px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-1/4">Player</TableHead>
                    <TableHead className="text-right w-1/4">Previous ELO</TableHead>
                    <TableHead className="text-right w-1/4">New ELO</TableHead>
                    <TableHead className="text-right w-1/4">Difference</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {matchTable!.courts[0]?.players.map((p) => {
                    const prev = p.previousElo ?? p.elo;
                    const current = matchTable!.status === "CONFIRMED" ? (p.newElo ?? p.elo) : (p.manualElo ?? p.elo);
                    const diff = current - prev;
                    return (
                      <TableRow key={`elo-${p.id}`}>
                        <TableCell className="font-medium">
                          {p.name} {p.isWinner && <Trophy className="w-3 h-3 inline text-yellow-500" />}
                        </TableCell>
                        <TableCell className="text-right">{prev}</TableCell>
                        <TableCell className="text-right font-bold">{current}</TableCell>
                        <TableCell className={`text-right ${diff > 0 ? "text-emerald-600" : diff < 0 ? "text-rose-600" : "text-muted-foreground"}`}>
                          {diff > 0 ? `+${diff}` : diff}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <Table className="w-full min-w-[600px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Court</TableHead>
                    <TableHead>Winner</TableHead>
                    <TableHead className="text-right">Points</TableHead>
                    <TableHead className="text-right">Difference</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {courtWinners.map((court) => (
                    <TableRow key={`court-winner-${court.courtNumber}`}>
                      <TableCell className="font-medium">Court {court.courtNumber} {court.isManual && <span className="text-xs text-muted-foreground">(Manual)</span>}</TableCell>
                      <TableCell>{court.winners.map((winner) => winner.name).join(" / ")}</TableCell>
                      <TableCell className="text-right">
                        {court.isManual
                          ? court.manualElo?.length
                            ? court.manualElo
                                .map((entry) => `${entry.previousElo} → ${entry.newElo}`)
                                .join(" / ")
                            : "N/A"
                          : formatStandingPoints(court.points)}
                      </TableCell>
                      <TableCell
                        className={
                          court.isManual
                            ? "text-right"
                            : `text-right ${
                                court.diff > 0
                                  ? "text-emerald-600"
                                  : court.diff < 0
                                    ? "text-rose-600"
                                    : "text-muted-foreground"
                              }`
                        }
                      >
                        {court.isManual
                          ? court.manualElo?.length
                            ? court.manualElo
                                .map((entry) => (entry.diff > 0 ? `+${entry.diff}` : String(entry.diff)))
                                .join(" / ")
                            : "N/A"
                          : formatStandingDiff(court.diff)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Winners will appear once scores are entered.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
