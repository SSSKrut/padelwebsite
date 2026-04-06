import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Hero } from "@/components/Hero";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { draggable, dropTargetForElements, monitorForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { combine } from "@atlaskit/pragmatic-drag-and-drop/combine";
import { useAuth } from "@/hooks/useAuth";
import { UserRole } from "@/context/AuthContext";
import { apiFetch } from "@/lib/api";
import padelHero from "@/assets/padel-hero.png";
import { ArrowLeft, Loader2, RefreshCw, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { formatEventDate } from "@/lib/utils";
import { useConfirm } from "@/hooks/useConfirm";

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

type MatchTableStatus = "DRAFT" | "OPEN" | "CONFIRMED";

interface MatchTablePlayer {
  id: string;
  name: string;
  elo: number;
  manualElo?: number;
}

interface MatchTableCourt {
  courtNumber: number;
  players: MatchTablePlayer[];
  isManual: boolean;
}

interface MatchTableMatch {
  id: string;
  courtNumber: number;
  round: number;
  pair1: [MatchTablePlayer, MatchTablePlayer];
  pair2: [MatchTablePlayer, MatchTablePlayer];
  score1: number | null;
  score2: number | null;
  updatedAt: string | null;
  updatedBy?: MatchTablePlayer | null;
}

interface MatchTableResponse {
  eventId: string;
  status: MatchTableStatus;
  generatedAt: string | null;
  confirmedAt: string | null;
  courts: MatchTableCourt[];
  matches: MatchTableMatch[];
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const EventMatches = () => {
  const { id } = useParams<{ id: string }>();
  const { user, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const { confirmAction, ConfirmDialogComponent } = useConfirm();

  const isAdmin = user?.role === UserRole.ADMIN || user?.role === UserRole.SUPER_ADMIN;

  const { data: event, isLoading: eventLoading, error: eventError } = useQuery<EventDetailsResponse>({
    queryKey: ["event", id],
    queryFn: () => apiFetch(`/.netlify/functions/event-details?id=${id}`),
    enabled: !!id,
  });

  const isParticipant = !!user && !!event?.participants.some((p) => p.user.id === user.id);
  const canAccess = !!user && (isAdmin || isParticipant);

  const {
    data: matchTable,
    isLoading: matchLoading,
    error: matchError,
  } = useQuery<MatchTableResponse>({
    queryKey: ["matchTable", id],
    queryFn: () => apiFetch(`/.netlify/functions/event-match-table?eventId=${id}`),
    enabled: !!id && canAccess,
  });

  const [scoreDrafts, setScoreDrafts] = useState<Record<string, { score1: string; score2: string }>>({});
  const [assignmentDrafts, setAssignmentDrafts] = useState<Record<string, number>>({});
  const [manualEloDrafts, setManualEloDrafts] = useState<Record<string, string>>({});
  const [savingMatchId, setSavingMatchId] = useState<string | null>(null);

  const matchesByCourt = useMemo(() => {
    if (!matchTable?.matches) return new Map<number, MatchTableMatch[]>();
    const map = new Map<number, MatchTableMatch[]>();
    matchTable.matches.forEach((match) => {
      const list = map.get(match.courtNumber) ?? [];
      list.push(match);
      map.set(match.courtNumber, list);
    });
    return map;
  }, [matchTable?.matches]);

  const participantCount = event?.participants.length ?? 0;
  const courtCount = Math.max(1, Math.ceil(participantCount / 5));

  const assignmentCourts = useMemo(() => {
    if (!event) return [] as Array<{ courtNumber: number; players: EventParticipant[] }>;
    const map = new Map<number, EventParticipant[]>();
    for (let i = 1; i <= courtCount; i += 1) {
      map.set(i, []);
    }
    event.participants.forEach((participant) => {
      const courtNumber = assignmentDrafts[participant.user.id] ?? 1;
      const list = map.get(courtNumber) ?? [];
      list.push(participant);
      map.set(courtNumber, list);
    });
    return Array.from(map.entries()).map(([courtNumber, players]) => ({
      courtNumber,
      players: players.sort((a, b) => b.user.elo - a.user.elo),
    }));
  }, [event, assignmentDrafts, courtCount]);

  useEffect(() => {
    if (!isAdmin) return;

    return monitorForElements({
      canMonitor: ({ source }) => source.data.type === "court-player",
      onDrop: ({ source, location }) => {
        const target = location.current.dropTargets[0];
        if (!target) return;

        const sourceUserId = source.data.userId;
        const targetCourtNumber = target.data.courtNumber;

        if (typeof sourceUserId !== "string" || !UUID_REGEX.test(sourceUserId)) return;
        if (typeof targetCourtNumber !== "number") return;

        setAssignmentDrafts((prev) => ({
          ...prev,
          [sourceUserId]: targetCourtNumber,
        }));
      },
    });
  }, [isAdmin]);

  useEffect(() => {
    if (!matchTable) return;
    const nextDrafts: Record<string, { score1: string; score2: string }> = {};
    matchTable.matches.forEach((match) => {
      nextDrafts[match.id] = {
        score1: match.score1 !== null ? String(match.score1) : "",
        score2: match.score2 !== null ? String(match.score2) : "",
      };
    });
    setScoreDrafts(nextDrafts);
  }, [matchTable]);

  useEffect(() => {
    if (!matchTable) return;
    const nextManual: Record<string, string> = {};
    matchTable.courts
      .filter((court) => court.isManual)
      .forEach((court) => {
        court.players.forEach((player) => {
          const fallback = player.manualElo ?? player.elo;
          nextManual[player.id] = String(fallback);
        });
      });
    setManualEloDrafts(nextManual);
  }, [matchTable]);

  useEffect(() => {
    if (!event) return;

    if (matchTable?.courts?.length) {
      const nextAssignments: Record<string, number> = {};
      matchTable.courts.forEach((court) => {
        court.players.forEach((player) => {
          nextAssignments[player.id] = court.courtNumber;
        });
      });
      setAssignmentDrafts(nextAssignments);
      return;
    }

    const sorted = [...event.participants].sort((a, b) => b.user.elo - a.user.elo);
    const nextAssignments: Record<string, number> = {};
    sorted.forEach((participant, index) => {
      nextAssignments[participant.user.id] = Math.floor(index / 5) + 1;
    });
    setAssignmentDrafts(nextAssignments);
  }, [event, matchTable?.courts]);

  const updateMatch = useMutation({
    mutationFn: (payload: { eventId: string; matchId: string; score1: number; score2: number }) =>
      apiFetch("/.netlify/functions/event-match-table", "PATCH", payload),
    onMutate: (payload) => {
      setSavingMatchId(payload.matchId);
    },
    onSuccess: () => {
      toast.success("Score updated");
      queryClient.invalidateQueries({ queryKey: ["matchTable", id] });
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Failed to update score");
    },
    onSettled: () => {
      setSavingMatchId(null);
    },
  });

  const generateTable = useMutation({
    mutationFn: (payload: { eventId: string }) =>
      apiFetch("/.netlify/functions/admin-event-match-table", "POST", payload),
    onSuccess: () => {
      toast.success("Match table generated");
      queryClient.invalidateQueries({ queryKey: ["matchTable", id] });
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Failed to generate table");
    },
  });

  const updateAssignments = useMutation({
    mutationFn: (payload: { eventId: string; assignments: { userId: string; courtNumber: number }[] }) =>
      apiFetch("/.netlify/functions/admin-event-match-table", "PATCH", payload),
    onSuccess: () => {
      toast.success("Court assignments updated");
      queryClient.invalidateQueries({ queryKey: ["matchTable", id] });
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Failed to update courts");
    },
  });

  const saveManualElo = useMutation({
    mutationFn: (payload: { eventId: string; entries: { userId: string; newElo: number }[] }) =>
      apiFetch("/.netlify/functions/admin-event-manual-elo", "POST", payload),
    onSuccess: () => {
      toast.success("Manual ELO saved");
      queryClient.invalidateQueries({ queryKey: ["matchTable", id] });
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Failed to save manual ELO");
    },
  });

  const confirmTable = useMutation({
    mutationFn: (payload: { eventId: string }) =>
      apiFetch("/.netlify/functions/admin-event-match-table", "PUT", payload),
    onSuccess: () => {
      toast.success("Match table confirmed and ELO updated");
      queryClient.invalidateQueries({ queryKey: ["matchTable", id] });
      queryClient.invalidateQueries({ queryKey: ["event", id] });
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Failed to confirm table");
    },
  });

  const handleSaveMatch = (match: MatchTableMatch) => {
    if (!id) return;
    const draft = scoreDrafts[match.id];
    const score1 = Number.parseInt(draft?.score1 ?? "", 10);
    const score2 = Number.parseInt(draft?.score2 ?? "", 10);

    if (Number.isNaN(score1) || Number.isNaN(score2)) {
      toast.error("Enter valid numeric scores for both teams.");
      return;
    }

    updateMatch.mutate({ eventId: id, matchId: match.id, score1, score2 });
  };

  const handleSaveManualElo = () => {
    if (!id || !matchTable) return;
    const manualPlayers = matchTable.courts
      .filter((court) => court.isManual)
      .flatMap((court) => court.players);

    if (!manualPlayers.length) {
      toast.error("No manual courts found.");
      return;
    }

    const entries = manualPlayers.map((player) => {
      const raw = manualEloDrafts[player.id];
      return {
        userId: player.id,
        newElo: Number.parseInt(raw ?? "", 10),
      };
    });

    const invalid = entries.find((entry) => Number.isNaN(entry.newElo) || entry.newElo < 0);
    if (invalid) {
      toast.error("Enter valid manual ELO values for all players in manual courts.");
      return;
    }

    saveManualElo.mutate({ eventId: id, entries });
  };

  const formatResultValue = (score1: number | null, score2: number | null) => {
    if (score1 === null || score2 === null) return "-";
    if (score1 === score2) return "0.5";
    return score1 > score2 ? "1" : "0";
  };

  const formatStandingPoints = (value: number) =>
    Number.isInteger(value) ? String(value) : value.toFixed(1);

  const formatStandingDiff = (value: number) =>
    value > 0 ? `+${value}` : String(value);

  const standingsByCourt = useMemo(() => {
    if (!matchTable) return new Map<number, Array<{ id: string; name: string; points: number; diff: number }>>();
    const map = new Map<number, Array<{ id: string; name: string; points: number; diff: number }>>();

    matchTable.courts.forEach((court) => {
      if (court.isManual) return;

      const entries = new Map<string, { id: string; name: string; points: number; diff: number }>();
      court.players.forEach((player) => {
        entries.set(player.id, { id: player.id, name: player.name, points: 0, diff: 0 });
      });

      const matches = matchesByCourt.get(court.courtNumber) ?? [];
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

      const standings = Array.from(entries.values()).sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.diff !== a.diff) return b.diff - a.diff;
        return a.name.localeCompare(b.name);
      });

      map.set(court.courtNumber, standings);
    });

    return map;
  }, [matchTable, matchesByCourt]);

  const PlayerChip = ({
    participant,
    courtNumber,
  }: {
    participant: EventParticipant;
    courtNumber: number;
  }) => {
    const ref = useRef<HTMLSpanElement | null>(null);

    useEffect(() => {
      const el = ref.current;
      if (!el) return;

      return combine(
        draggable({
          element: el,
          getInitialData: () => ({ type: "court-player", userId: participant.user.id }),
        }),
        dropTargetForElements({
          element: el,
          canDrop: ({ source }) =>
            source.data.type === "court-player" && source.data.userId !== participant.user.id,
          getData: () => ({
            type: "court-player",
            userId: participant.user.id,
            courtNumber,
          }),
        }),
      );
    }, [participant.user.id, courtNumber]);

    return (
      <span
        ref={ref}
        className="text-xs font-medium px-2 py-1 rounded-full bg-muted cursor-move"
      >
        {participant.user.name} · {participant.user.elo}
      </span>
    );
  };

  const CourtDropZone = ({
    courtNumber,
    children,
  }: {
    courtNumber: number;
    children: ReactNode;
  }) => {
    const ref = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
      const el = ref.current;
      if (!el) return;

      return dropTargetForElements({
        element: el,
        canDrop: ({ source }) => source.data.type === "court-player",
        getData: () => ({ type: "court", courtNumber }),
      });
    }, [courtNumber]);

    return (
      <div ref={ref} className="rounded-lg border bg-background p-3">
        {children}
      </div>
    );
  };

  const handleApplyAssignments = () => {
    if (!id) return;
    const assignments = Object.entries(assignmentDrafts)
      .filter(([userId]) => UUID_REGEX.test(userId))
      .map(([userId, courtNumber]) => ({
        userId,
        courtNumber,
      }));

    if (!assignments.length) {
      toast.error("No valid court assignments to save.");
      return;
    }

    confirmAction(
      "Update Courts",
      "This will regenerate matchups and clear current scores and manual ELO values. Continue?",
      () => updateAssignments.mutate({ eventId: id, assignments }),
    );
  };

  const handleConfirmTable = () => {
    if (!id) return;
    confirmAction(
      "Confirm Match Table",
      "Confirming will apply Elo updates and lock scores. Continue?",
      () => confirmTable.mutate({ eventId: id }),
    );
  };

  if (authLoading) {
    return <Hero title="Loading..." compact />;
  }

  if (!user) {
    return (
      <Hero
        title="Login required"
        subtitle="Please log in to view the match table."
        compact
      />
    );
  }

  if (eventLoading || matchLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (eventError || !event) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <h2 className="text-2xl font-bold mb-4">Event not found</h2>
        <Button asChild>
          <Link to="/events">Back to Events</Link>
        </Button>
      </div>
    );
  }

  if (!canAccess) {
    return (
      <Hero
        title="Unauthorized"
        subtitle="You are not registered for this event."
        compact
      />
    );
  }

  const status = matchTable?.status ?? "DRAFT";
  const canEditScores = status === "OPEN";
  const hasRecordedScores = !!matchTable?.matches.some(
    (match) => match.score1 !== null || match.score2 !== null,
  );
  const hasManualElo = !!matchTable?.courts.some((court) =>
    court.players.some((player) => player.manualElo !== null && player.manualElo !== undefined),
  );
  const hasEnteredResults = hasRecordedScores || hasManualElo;

  return (
    <div className="min-h-screen bg-muted/20 pb-16">
      <Hero
        title={event.title}
        subtitle="Match Table"
        backgroundImage={padelHero}
        compact
      />

      <div className="container max-w-6xl mx-auto px-4 -mt-10 relative z-10 space-y-6">
        <Button variant="outline" className="bg-background shadow-sm" asChild>
          <Link to={`/events/${event.id}`} className="flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" /> Back to Event
          </Link>
        </Button>

        <Card className="shadow-lg border-0">
          <CardHeader>
            <CardTitle>Match Table Status</CardTitle>
            <CardDescription>
              {formatEventDate(event.date, false, event.endDate)} · {event.location ?? "Location TBD"}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Current status</p>
              <p className="text-lg font-semibold">{status}</p>
            </div>
            {isAdmin && (
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    if (hasEnteredResults) {
                      confirmAction(
                        "Regenerate match table",
                        "This will clear all entered scores and manual ELO values. Continue?",
                        () => generateTable.mutate({ eventId: event.id }),
                      );
                      return;
                    }
                    generateTable.mutate({ eventId: event.id });
                  }}
                  disabled={generateTable.isPending}
                >
                  {generateTable.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4 mr-2" />
                  )}
                  Generate Auto Table
                </Button>
                {status === "OPEN" && (
                  <Button
                    onClick={handleConfirmTable}
                    disabled={confirmTable.isPending}
                  >
                    {confirmTable.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle className="w-4 h-4 mr-2" />
                    )}
                    Confirm Results
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {isAdmin && event.participants.length > 0 && (
          <Card className="shadow-lg border-0">
            <CardHeader>
              <CardTitle>Manage Courts</CardTitle>
              <CardDescription>Adjust court assignments before confirming results.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                {assignmentCourts.map((court) => (
                  <CourtDropZone key={court.courtNumber} courtNumber={court.courtNumber}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold">Court {court.courtNumber}</span>
                      <span className="text-xs text-muted-foreground">{court.players.length} players</span>
                    </div>
                    <div className="flex flex-wrap gap-2 min-h-[36px]">
                      {court.players.length === 0 && (
                        <span className="text-xs text-muted-foreground">Drop players here</span>
                      )}
                      {court.players.map((player) => (
                        <PlayerChip
                          key={player.user.id}
                          participant={player}
                          courtNumber={court.courtNumber}
                        />
                      ))}
                    </div>
                  </CourtDropZone>
                ))}
              </div>
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  onClick={handleApplyAssignments}
                  disabled={updateAssignments.isPending}
                >
                  {updateAssignments.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Apply Court Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {matchError && (
          <Card className="shadow-lg border-0">
            <CardContent className="py-8 text-center text-muted-foreground">
              Match table not available yet.
            </CardContent>
          </Card>
        )}

        {matchTable && (
          <div className="space-y-6">
            {matchTable.courts.length === 0 ? (
              <Card className="shadow-lg border-0">
                <CardContent className="py-8 text-center text-muted-foreground">
                  Match table has not been generated yet.
                </CardContent>
              </Card>
            ) : (
              <Tabs
                defaultValue={`court-${matchTable.courts[0]?.courtNumber ?? 1}`}
                className="space-y-4"
              >
                <TabsList className="flex flex-wrap">
                  {matchTable.courts.map((court) => (
                    <TabsTrigger key={court.courtNumber} value={`court-${court.courtNumber}`}>
                      Court {court.courtNumber}
                    </TabsTrigger>
                  ))}
                </TabsList>

                {matchTable.courts.map((court) => (
                  <TabsContent key={court.courtNumber} value={`court-${court.courtNumber}`}>
                    <Card className="shadow-lg border-0">
                      <CardHeader>
                        <CardTitle>Court {court.courtNumber}</CardTitle>
                        <CardDescription>
                          {court.isManual
                            ? "Less than 5 players — manual ELO required."
                            : "5 players · 5 rounds"}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex flex-wrap gap-2">
                          {court.players.map((player) => (
                            <span
                              key={player.id}
                              className="text-xs font-medium px-2 py-1 rounded-full bg-muted"
                            >
                              {player.name} · {player.elo}
                            </span>
                          ))}
                        </div>

                        {court.isManual ? (
                          <div className="space-y-3">
                            <div className="overflow-x-auto">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Player</TableHead>
                                    <TableHead className="text-right">Current ELO</TableHead>
                                    <TableHead className="text-right">Manual ELO</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {court.players.map((player) => (
                                    <TableRow key={player.id}>
                                      <TableCell className="font-medium">{player.name}</TableCell>
                                      <TableCell className="text-right text-muted-foreground">{player.elo}</TableCell>
                                      <TableCell className="text-right">
                                        {isAdmin && status !== "CONFIRMED" ? (
                                          <Input
                                            type="number"
                                            min={0}
                                            className="w-24 ml-auto text-right"
                                            value={manualEloDrafts[player.id] ?? ""}
                                            onChange={(e) =>
                                              setManualEloDrafts((prev) => ({
                                                ...prev,
                                                [player.id]: e.target.value,
                                              }))
                                            }
                                          />
                                        ) : (
                                          <span className="text-sm">
                                            {player.manualElo ?? player.elo}
                                          </span>
                                        )}
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                            {isAdmin && status !== "CONFIRMED" && (
                              <div className="flex justify-end">
                                <Button
                                  variant="outline"
                                  onClick={handleSaveManualElo}
                                  disabled={saveManualElo.isPending}
                                >
                                  {saveManualElo.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                  Save Manual ELO
                                </Button>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-4">
                            <div className="grid gap-4 lg:grid-cols-2">
                              <div className="overflow-x-auto">
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Round</TableHead>
                                      <TableHead>Pair 1</TableHead>
                                      <TableHead>Pair 2</TableHead>
                                      <TableHead className="text-right">Score</TableHead>
                                      <TableHead className="text-right">Action</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {(matchesByCourt.get(court.courtNumber) ?? []).map((match) => (
                                      <TableRow key={match.id}>
                                        <TableCell className="font-medium">{match.round}</TableCell>
                                        <TableCell>
                                          {match.pair1.map((player) => player.name).join(" / ")}
                                        </TableCell>
                                        <TableCell>
                                          {match.pair2.map((player) => player.name).join(" / ")}
                                        </TableCell>
                                        <TableCell className="text-right">
                                          <div className="flex items-center justify-end gap-2">
                                            <Input
                                              type="number"
                                              min={0}
                                              className="w-16 text-right"
                                              disabled={!canEditScores}
                                              value={scoreDrafts[match.id]?.score1 ?? ""}
                                              onChange={(e) =>
                                                setScoreDrafts((prev) => ({
                                                  ...prev,
                                                  [match.id]: {
                                                    score1: e.target.value,
                                                    score2: prev[match.id]?.score2 ?? "",
                                                  },
                                                }))
                                              }
                                            />
                                            <span className="text-muted-foreground">:</span>
                                            <Input
                                              type="number"
                                              min={0}
                                              className="w-16 text-right"
                                              disabled={!canEditScores}
                                              value={scoreDrafts[match.id]?.score2 ?? ""}
                                              onChange={(e) =>
                                                setScoreDrafts((prev) => ({
                                                  ...prev,
                                                  [match.id]: {
                                                    score1: prev[match.id]?.score1 ?? "",
                                                    score2: e.target.value,
                                                  },
                                                }))
                                              }
                                            />
                                          </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            disabled={!canEditScores || updateMatch.isPending}
                                            onClick={() => handleSaveMatch(match)}
                                          >
                                            {updateMatch.isPending && savingMatchId === match.id ? (
                                              <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                              "Save"
                                            )}
                                          </Button>
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>

                              <div className="overflow-x-auto">
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Pair 1 P1</TableHead>
                                      <TableHead>Pair 1 P2</TableHead>
                                      <TableHead>Pair 2 P1</TableHead>
                                      <TableHead>Pair 2 P2</TableHead>
                                      <TableHead className="text-right">Result</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {(matchesByCourt.get(court.courtNumber) ?? []).map((match) => (
                                      <TableRow key={`${match.id}-summary`}>
                                        <TableCell>{match.pair1[0]?.name ?? "-"}</TableCell>
                                        <TableCell>{match.pair1[1]?.name ?? "-"}</TableCell>
                                        <TableCell>{match.pair2[0]?.name ?? "-"}</TableCell>
                                        <TableCell>{match.pair2[1]?.name ?? "-"}</TableCell>
                                        <TableCell className="text-right">
                                          {formatResultValue(match.score1, match.score2)}
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                            </div>

                            <div className="overflow-x-auto">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead className="text-right">Points</TableHead>
                                    <TableHead className="text-right">Difference</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {(standingsByCourt.get(court.courtNumber) ?? []).map((entry) => (
                                    <TableRow key={`${court.courtNumber}-${entry.id}`}>
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
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>
                ))}
              </Tabs>
            )}
          </div>
        )}
      </div>
      <ConfirmDialogComponent />
    </div>
  );
};

export default EventMatches;
