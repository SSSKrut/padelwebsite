import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2 } from "lucide-react";
import type { MatchTableCourt, MatchTableStatus } from "@/types/events";

export function ManualEloTable({
  court,
  status,
  isAdmin,
  manualEloDrafts,
  manualWinnerDrafts,
  onManualEloChange,
  onManualWinnerChange,
  onSave,
  isSaving,
}: {
  court: MatchTableCourt;
  status: MatchTableStatus;
  isAdmin: boolean;
  manualEloDrafts: Record<string, string>;
  manualWinnerDrafts: Record<string, boolean>;
  onManualEloChange: (playerId: string, value: string) => void;
  onManualWinnerChange: (playerId: string, checked: boolean) => void;
  onSave: () => void;
  isSaving: boolean;
}) {
  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <Table className="w-full min-w-[600px]">
          <TableHeader>
            <TableRow>
              <TableHead>Player</TableHead>
              <TableHead className="text-center">Winner</TableHead>
              <TableHead className="text-right">Current ELO</TableHead>
              <TableHead className="text-right">Manual ELO</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {court.players.map((player) => (
              <TableRow key={player.id}>
                <TableCell className="font-medium">{player.name}</TableCell>
                <TableCell className="text-center">
                  {isAdmin && status !== "CONFIRMED" ? (
                    <input
                      type="checkbox"
                      className="w-4 h-4 cursor-pointer"
                      checked={manualWinnerDrafts[player.id] ?? false}
                      onChange={(e) => onManualWinnerChange(player.id, e.target.checked)}
                    />
                  ) : (
                    player.isWinner ? <span className="text-primary font-bold">✓</span> : <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell className="text-right text-muted-foreground">{player.previousElo ?? player.elo}</TableCell>
                <TableCell className="text-right">
                  {isAdmin && status !== "CONFIRMED" ? (
                    <Input
                      type="number"
                      min={0}
                      className="w-24 ml-auto text-right"
                      value={manualEloDrafts[player.id] ?? ""}
                      onChange={(e) => onManualEloChange(player.id, e.target.value)}
                    />
                  ) : (
                    <span className="text-sm">
                      {player.newElo ?? player.manualElo ?? (player.previousElo ?? player.elo)}
                    </span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {status === "CONFIRMED" && (
        <div className="mt-4 p-4 rounded-lg bg-primary/10 border border-primary/20 text-center">
          {(() => {
            const winners = court.players.filter((p) => p.isWinner);
            if (winners.length === 0) {
              return <p className="text-sm font-semibold text-muted-foreground">No winners selected</p>;
            }

            return (
              <p className="text-sm font-semibold text-primary">
                {winners.length > 1 ? "Winners" : "Winner"}: {winners.map(w => w.name).join(" / ")}
              </p>
            );
          })()}
        </div>
      )}
      {isAdmin && status !== "CONFIRMED" && (
        <div className="flex justify-end">
          <Button
            variant="outline"
            onClick={onSave}
            disabled={isSaving}
          >
            {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Save Manual ELO
          </Button>
        </div>
      )}
    </div>
  );
}
