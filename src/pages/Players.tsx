import { Hero } from "@/components/Hero";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import playersData from "../../data/players.json";
import padelHero from "@/assets/padel-hero.png";

const ratingDeltaStyles = (delta: number) => {
  if (delta > 0) {
    return "text-emerald-600";
  }
  if (delta < 0) {
    return "text-red-500";
  }
  return "text-muted-foreground";
};

const formatDelta = (delta: number) => {
  if (delta > 0) {
    return `+${delta}`;
  }
  return `${delta}`;
};

const Players = () => {
  return (
    <div className="min-h-screen">
      <Hero
        title="Player Celebration Board"
        subtitle="A weekly spotlight on rankings, achievements, and rising stars."
        backgroundImage={padelHero}
        compact
      />

      <section className="container mx-auto px-4 py-12 space-y-8">
        <Card className="border-primary/20 bg-muted/30">
          <CardContent className="py-6 flex flex-col gap-2">
            <p className="text-lg font-semibold">Weekly update tip</p>
            <p className="text-sm text-muted-foreground">
              Edit <span className="font-medium text-foreground">data/players.json</span> to
              update ranks, achievements, and rating changes without touching the layout.
            </p>
            <p className="text-xs text-muted-foreground">
              Tip: export your Excel sheet to CSV and convert it with{" "}
              <span className="font-medium text-foreground">scripts/players_from_csv.py</span>.
              Extra columns (ID, ELO, weekly dates) are ignored.
            </p>
            <p className="text-xs text-muted-foreground">
              Add manual achievements in{" "}
              <span className="font-medium text-foreground">
                data/players_achievements.json
              </span>
              .
            </p>
          </CardContent>
        </Card>

        <div className="rounded-2xl border bg-background/80 shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[90px]">Rank</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Achievements</TableHead>
                <TableHead className="text-right">Rating</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {playersData.map((player) => (
                <TableRow key={player.rank}>
                  <TableCell className="font-semibold text-primary">
                    #{player.rank}
                  </TableCell>
                  <TableCell className="font-medium">{player.name}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-2">
                      {player.achievements.map((achievement) => (
                        <Badge key={achievement} variant="secondary">
                          {achievement}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <span className="text-lg font-semibold">{player.ratingPoints}</span>
                      <span className={`text-xs font-semibold ${ratingDeltaStyles(player.ratingDelta)}`}>
                        {formatDelta(player.ratingDelta)}
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  );
};

export default Players;
