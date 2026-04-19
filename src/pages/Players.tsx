import { useQuery } from "@tanstack/react-query";
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
import padelHero from "@/assets/padel-hero.png";
import { Loader2 } from "lucide-react";

type Player = {
  rank: number;
  rankDelta: number;
  name: string;
  achievements: string[];
  ratingPoints: number;
  ratingDelta: number;
  role: import("../context/AuthContext").UserRole;
};

const fetchPlayers = async (): Promise<Player[]> => {
  const response = await fetch("/api/players", { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Failed to fetch players");
  }
  return response.json();
};

const ratingDeltaStyles = (delta: number) => {
  if (delta > 0) return "text-emerald-600";
  if (delta < 0) return "text-red-500";
  return "text-muted-foreground";
};

const formatDelta = (delta: number) => (delta > 0 ? `+${delta}` : `${delta}`);

const Players = () => {
  const { data: playersData = [], isLoading, isError } = useQuery({
    queryKey: ["players"],
    queryFn: fetchPlayers,
  });

  return (
    <div className="min-h-screen">
      <Hero
        title="Player Rating Board"
        subtitle="A weekly spotlight on rankings, achievements, and our rising stars."
        backgroundImage={padelHero}
        compact
      />

      <section className="mx-auto w-full max-w-6xl px-4 py-10">
        <div className="rounded-2xl border bg-background/80 shadow-sm overflow-hidden min-h-[300px] relative">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}
          
          {isError && (
            <div className="p-8 text-center text-red-500 font-medium">
              Failed to load player data. Please try again later.
            </div>
          )}

          {!isLoading && !isError && playersData.length === 0 && (
            <div className="p-8 text-center text-muted-foreground">
              No players found in the system yet.
            </div>
          )}

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
                    <div className="flex items-center gap-2">
                      <span>#{player.rank}</span>
                      <span
                        className={`text-xs font-semibold ${ratingDeltaStyles(
                          player.rankDelta
                        )}`}
                      >
                        {formatDelta(player.rankDelta)}
                      </span>
                    </div>
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
                        {player.role === "UNVERIFIED_USER" ? (
                          <span className="flex items-center gap-1">
                            {player.ratingPoints}
                            <span className="text-muted-foreground text-sm" title="Unverified user">
                              (?)
                            </span>
                          </span>
                        ) : (
                          player.ratingPoints
                        )}
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
