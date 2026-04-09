import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatStandingPoints, formatStandingDiff } from "@/lib/standings";
import type { StandingEntry } from "@/lib/standings";

export function CourtStandingsTable({
  courtNumber,
  standings,
}: {
  courtNumber: number;
  standings: StandingEntry[];
}) {
  return (
    <div className="overflow-x-auto">
      <Table className="w-full min-w-[600px]">
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead className="text-right">Points</TableHead>
            <TableHead className="text-right">Difference</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {standings.map((entry) => (
            <TableRow key={`${courtNumber}-${entry.id}`}>
              <TableCell className="font-medium">{entry.name}</TableCell>
              <TableCell className="text-right">
                {formatStandingPoints(entry.points)}
              </TableCell>
              <TableCell
                className={`text-right ${
                  entry.diff > 0
                    ? "text-emerald-600"
                    : entry.diff < 0
                      ? "text-rose-600"
                      : "text-muted-foreground"
                }`}
              >
                {formatStandingDiff(entry.diff)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
