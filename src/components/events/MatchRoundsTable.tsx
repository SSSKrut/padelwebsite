import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2 } from "lucide-react";
import type { MatchTableMatch } from "@/types/events";

export function MatchRoundsTable({
  matches,
  canEditScores,
  scoreDrafts,
  statusDrafts,
  onScoreChange,
  onStatusChange,
  onSaveMatch,
  isUpdatePending,
  savingMatchId,
  statusOptions: statusOptionsProp,
}: {
  matches: MatchTableMatch[];
  canEditScores: boolean;
  scoreDrafts: Record<string, { score1: string; score2: string }>;
  statusDrafts: Record<
    string,
    "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "ABANDONED" | "WALKOVER" | "NO_CONTEST"
  >;
  onScoreChange: (matchId: string, field: "score1" | "score2", value: string) => void;
  onStatusChange: (
    matchId: string,
    status: "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "ABANDONED" | "WALKOVER" | "NO_CONTEST",
  ) => void;
  onSaveMatch: (match: MatchTableMatch) => void;
  isUpdatePending: boolean;
  savingMatchId: string | null;
  statusOptions?: Array<
    "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "ABANDONED" | "WALKOVER" | "NO_CONTEST"
  >;
}) {
  const statusOptions = statusOptionsProp ?? [
    "SCHEDULED",
    "IN_PROGRESS",
    "COMPLETED",
    "ABANDONED",
    "WALKOVER",
    "NO_CONTEST",
  ] as const;

  return (
    <div className="grid gap-4 lg:grid-cols-1">
      <div className="overflow-x-auto">
        <Table className="w-full min-w-[600px]">
          <TableHeader>
            <TableRow>
              <TableHead>Round</TableHead>
              <TableHead>Pair 1</TableHead>
              <TableHead>Pair 2</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Score</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {matches.map((match) => {
              const status = match.status ?? "SCHEDULED";
              const lockedStatuses = ["ABANDONED", "WALKOVER", "NO_CONTEST"];
              const isLocked = lockedStatuses.includes(status);
              return (
                <TableRow key={match.id}>
                <TableCell className="font-medium">{match.round}</TableCell>
                <TableCell>
                  {match.pair1.map((player) => player.name).join(" / ")}
                </TableCell>
                <TableCell>
                  {match.pair2.map((player) => player.name).join(" / ")}
                </TableCell>
                <TableCell>
                  <Select
                    value={statusDrafts[match.id] ?? status}
                    onValueChange={(value) =>
                      onStatusChange(match.id, value as (typeof statusOptions)[number])
                    }
                    disabled={!canEditScores}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Input
                      type="number"
                      min={0}
                      className="w-16 text-right"
                      disabled={!canEditScores || isLocked}
                      value={scoreDrafts[match.id]?.score1 ?? ""}
                      onChange={(e) => onScoreChange(match.id, "score1", e.target.value)}
                    />
                    <span className="text-muted-foreground">:</span>
                    <Input
                      type="number"
                      min={0}
                      className="w-16 text-right"
                      disabled={!canEditScores || isLocked}
                      value={scoreDrafts[match.id]?.score2 ?? ""}
                      onChange={(e) => onScoreChange(match.id, "score2", e.target.value)}
                    />
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!canEditScores || isUpdatePending || isLocked}
                    onClick={() => onSaveMatch(match)}
                  >
                    {isUpdatePending && savingMatchId === match.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      "Save"
                    )}
                  </Button>
                </TableCell>
              </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
