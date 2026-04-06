import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { UserRole } from "@/context/AuthContext";
import { Hero } from "@/components/Hero";
import padelHero from "@/assets/padel-hero.png";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { formatEventDate } from "@/lib/utils";

interface EventParticipant {
  id: string;
  user: {
    id: string;
    name: string;
    elo: number;
  };
}

interface EventDetailsResponse {
  id: string;
  title: string;
  date: string;
  endDate: string | null;
  location: string | null;
  status: string;
  participants: EventParticipant[];
}

interface EventScoreEntry {
  userId: string;
  previousElo: number;
  newElo: number;
  createdAt: string;
  updatedAt: string;
}

interface EventScoresResponse {
  eventId: string;
  scores: EventScoreEntry[];
}

interface AdminUser {
  id: string;
  firstName: string;
  lastName: string;
  elo: number;
  role: UserRole;
}

const EventScore = () => {
  const { id } = useParams<{ id: string }>();
  const { user, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  const isAdmin = user?.role === UserRole.ADMIN || user?.role === UserRole.SUPER_ADMIN;

  const { data: players, isLoading: playersLoading } = useQuery<AdminUser[]>({
    queryKey: ["admin_users"],
    queryFn: () => apiFetch("/.netlify/functions/admin-users"),
    enabled: isAdmin,
  });

  const { data: event, isLoading: eventLoading, error: eventError } = useQuery<EventDetailsResponse>({
    queryKey: ["event", id],
    queryFn: () => apiFetch(`/.netlify/functions/event-details?id=${id}`),
    enabled: !!id && isAdmin,
  });

  const {
    data: scoresData,
    isLoading: scoresLoading,
    error: scoresError,
  } = useQuery<EventScoresResponse>({
    queryKey: ["eventScores", id],
    queryFn: () => apiFetch(`/.netlify/functions/admin-event-scores?eventId=${id}`),
    enabled: !!id && isAdmin,
  });

  const [scoreDrafts, setScoreDrafts] = useState<Record<string, string>>({});
  const [manualParticipants, setManualParticipants] = useState<EventParticipant[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);

  const tableParticipants = useMemo(
    () => [...(event?.participants ?? []), ...manualParticipants],
    [event?.participants, manualParticipants],
  );

  const tableUserIds = useMemo(
    () => new Set(tableParticipants.map((participant) => participant.user.id)),
    [tableParticipants],
  );

  const searchablePlayers = useMemo(() => {
    if (!players) return [];
    return players.filter((player) =>
      [UserRole.USER, UserRole.ADMIN, UserRole.SUPER_ADMIN].includes(player.role),
    );
  }, [players]);

  const normalizedSearch = searchTerm.trim().toLowerCase();

  const filteredPlayers = useMemo(() => {
    if (!normalizedSearch) return [];

    return searchablePlayers
      .filter((player) => {
        const fullName = `${player.firstName} ${player.lastName}`.toLowerCase();
        const reverseName = `${player.lastName} ${player.firstName}`.toLowerCase();
        return fullName.includes(normalizedSearch) || reverseName.includes(normalizedSearch);
      })
      .filter((player) => !tableUserIds.has(player.id))
      .slice(0, 8);
  }, [normalizedSearch, searchablePlayers, tableUserIds]);

  useEffect(() => {
    if (!event || scoresLoading) return;

    const existingScores = new Map(
      scoresData?.scores?.map((entry) => [entry.userId, entry.newElo]) ?? [],
    );

    setScoreDrafts((prev) => {
      const nextDrafts = { ...prev };
      let changed = false;

      tableParticipants.forEach((participant) => {
        if (nextDrafts[participant.user.id] === undefined) {
          const storedScore = existingScores.get(participant.user.id);
          nextDrafts[participant.user.id] = String(storedScore ?? participant.user.elo);
          changed = true;
        }
      });

      return changed ? nextDrafts : prev;
    });
  }, [event, scoresData, scoresLoading, tableParticipants]);

  const saveScores = useMutation({
    mutationFn: (payload: { eventId: string; scores: { userId: string; newElo: number }[] }) =>
      apiFetch("/.netlify/functions/admin-event-scores", "POST", payload),
    onSuccess: (data: { message?: string }) => {
      toast.success(data?.message ?? "Scores saved");
      queryClient.invalidateQueries({ queryKey: ["eventScores", id] });
      queryClient.invalidateQueries({ queryKey: ["event", id] });
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Failed to save scores.");
    },
  });

  const handleToggleAdd = () => {
    setIsAddOpen((prev) => {
      const next = !prev;
      if (!next) {
        setSearchTerm("");
      }
      return next;
    });
  };

  const handleAddPlayer = (player: AdminUser) => {
    if (tableUserIds.has(player.id)) {
      toast.error("Player is already listed in this table.");
      return;
    }

    const addedParticipant: EventParticipant = {
      id: `manual-${player.id}`,
      user: {
        id: player.id,
        name: `${player.firstName} ${player.lastName}`,
        elo: player.elo,
      },
    };

    setManualParticipants((prev) => [...prev, addedParticipant]);
    setScoreDrafts((prev) => ({
      ...prev,
      [player.id]: String(player.elo),
    }));
    setSearchTerm("");
    setIsAddOpen(false);
  };

  const handleSave = () => {
    if (!event || !id) return;

    if (tableParticipants.length === 0) {
      toast.error("Add at least one participant before saving scores.");
      return;
    }

    const entries = tableParticipants.map((participant) => {
      const rawValue = scoreDrafts[participant.user.id];
      const parsedValue = Number.parseInt(rawValue, 10);
      return {
        userId: participant.user.id,
        newElo: parsedValue,
      };
    });

    const invalidEntry = entries.find((entry) => Number.isNaN(entry.newElo) || entry.newElo < 0);

    if (invalidEntry) {
      toast.error("Please enter a valid ELO value for every participant.");
      return;
    }

    saveScores.mutate({ eventId: id, scores: entries });
  };

  if (authLoading) {
    return <Hero title="Loading..." compact />;
  }

  if (!user || !isAdmin) {
    return (
      <Hero
        title="Unauthorized"
        subtitle="You do not have permission to view."
        compact
      />
    );
  }

  if (eventLoading || scoresLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (eventError || scoresError || !event) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <h2 className="text-2xl font-bold mb-4">Event not found</h2>
        <Button asChild>
          <Link to="/events">Back to Events</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/20 pb-16">
      <Hero
        title={event.title}
        subtitle="Set participant scores"
        backgroundImage={padelHero}
        compact
      />

      <div className="container max-w-5xl mx-auto px-4 -mt-10 relative z-10">
        <Button variant="outline" className="mb-6 bg-background shadow-sm" asChild>
          <Link to={`/events/${event.id}`} className="flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" /> Back to Event
          </Link>
        </Button>

        <Card className="shadow-lg border-0">
          <CardHeader>
            <CardTitle className="text-2xl">Scores for {event.title}</CardTitle>
            <CardDescription>
              {formatEventDate(event.date, false, event.endDate)} · {event.location ?? "Location TBD"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {tableParticipants.length === 0 ? (
              <div className="text-center py-10 bg-muted/30 rounded-xl">
                <p className="text-muted-foreground">No participants yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Player</TableHead>
                      <TableHead className="text-right">Current ELO</TableHead>
                      <TableHead className="text-right">New ELO</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tableParticipants.map((participant) => (
                      <TableRow key={participant.id}>
                        <TableCell className="font-medium">{participant.user.name}</TableCell>
                        <TableCell className="text-right text-muted-foreground">{participant.user.elo}</TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            min={0}
                            className="w-28 ml-auto text-right"
                            value={scoreDrafts[participant.user.id] ?? ""}
                            onChange={(e) =>
                              setScoreDrafts((prev) => ({
                                ...prev,
                                [participant.user.id]: e.target.value,
                              }))
                            }
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            <div className="rounded-xl border bg-muted/20 p-4 space-y-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium text-sm">Add missing participant</p>
                  <p className="text-xs text-muted-foreground">
                    Search by first/last name and add them to this score table.
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={handleToggleAdd}>
                  <Plus className="w-4 h-4 mr-2" />
                  {isAddOpen ? "Hide Search" : "Add Player"}
                </Button>
              </div>

              {isAddOpen && (
                <div className="space-y-3">
                  <Input
                    placeholder="Start typing a name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  {playersLoading ? (
                    <div className="text-sm text-muted-foreground">Loading players...</div>
                  ) : normalizedSearch ? (
                    <div className="rounded-lg border bg-background max-h-56 overflow-y-auto">
                      {filteredPlayers.length > 0 ? (
                        <ul className="divide-y divide-border">
                          {filteredPlayers.map((player) => (
                            <li key={player.id} className="flex items-center justify-between px-3 py-2">
                              <div>
                                <p className="text-sm font-medium">{player.firstName} {player.lastName}</p>
                                <p className="text-xs text-muted-foreground">ELO {player.elo}</p>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleAddPlayer(player)}
                              >
                                Add
                              </Button>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div className="text-sm text-muted-foreground px-3 py-3">No matches found.</div>
                      )}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">Type a name to search players.</div>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" asChild>
                <Link to={`/events/${event.id}`}>Cancel</Link>
              </Button>
              <Button onClick={handleSave} disabled={saveScores.isPending || tableParticipants.length === 0}>
                {saveScores.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Save Scores
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EventScore;
