import { Hero } from "@/components/Hero";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import playersDataRaw from "../../data/players.json";
import padelHero from "@/assets/padel-hero.png";

type Player = {
  rank: number;
  name: string;
  achievements: string[];
  ratingPoints: number;
  ratingDelta: number;
};

const playersData = playersDataRaw as Player[];

const ratingDeltaStyles = (delta: number) => {
  if (delta > 0) return "text-emerald-600";
  if (delta < 0) return "text-red-500";
  return "text-muted-foreground";
};

const formatDelta = (delta: number) => (delta > 0 ? `+${delta}` : `${delta}`);

const Players = () => {
  return (
    <div className="min-h-screen">
      <Hero
        title="Player Rating Board"
        subtitle="A weekly spotlight on rankings, achievements, and our rising stars."
        backgroundImage={padelHero}
        compact
      />

      <section className="mx-auto w-full max-w-6xl px-4 py-10">
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
                <TableRow key={`${player.rank}-${player.name}`}>
                  <TableCell className="font-semibold text-primary">
                    #{player.rank}
                  </TableCell>

                  <TableCell className="font-medium">{player.name}</TableCell>

                  <TableCell>
                    <div className="flex flex-wrap gap-2">
                      {(player.achievements ?? []).map((achievement) => (
                        <Badge key={`${player.name}-${achievement}`} variant="secondary">
                          {achievement}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>

                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <span className="text-lg font-semibold">
                        {player.ratingPoints}
                      </span>
                      <span
                        className={`text-xs font-semibold ${ratingDeltaStyles(
                          player.ratingDelta
                        )}`}
                      >
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
