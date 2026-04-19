import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Hero } from "@/components/Hero";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { monitorForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { useAuth } from "@/hooks/useAuth";
import { UserRole } from "@/context/AuthContext";
import { apiFetch } from "@/lib/api";
import padelHero from "@/assets/padel-hero.png";
import { ArrowLeft, Loader2, RefreshCw, CheckCircle, Info } from "lucide-react";
import { formatEventDate } from "@/lib/utils";
import { useConfirm } from "@/hooks/useConfirm";
import { useMatchTableMutations } from "@/hooks/useMatchTableMutations";
import { toast } from "sonner";
import type {
  EventParticipant,
  EventDetailsResponse,
  MatchTableMatch,
  MatchTableResponse,
} from "@/types/events";
import { calculateCourtStandings } from "@/lib/standings";
import { PlayerChip } from "@/components/events/PlayerChip";
import { CourtDropZone } from "@/components/events/CourtDropZone";
import { ManualEloTable } from "@/components/events/ManualEloTable";
import { MatchRoundsTable } from "@/components/events/MatchRoundsTable";
import { CourtStandingsTable } from "@/components/events/CourtStandingsTable";
import { CustomMatchesAdminPanel } from "@/components/events/CustomMatchesAdminPanel";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

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

  const formatConfig = ((): {
    pairingStrategy?: string;
    playersPerCourt?: number;
    rounds?: number;
  } | null => {
    if (!event?.formatConfig || typeof event.formatConfig !== "object") {
      return null;
    }
    return event.formatConfig as {
      pairingStrategy?: string;
      playersPerCourt?: number;
      rounds?: number;
    };
  })();

  const [scoreDrafts, setScoreDrafts] = useState<Record<string, { score1: string; score2: string }>>({});
  const [statusDrafts, setStatusDrafts] = useState<Record<string, "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "ABANDONED" | "WALKOVER" | "NO_CONTEST">>({});
  const [assignmentDrafts, setAssignmentDrafts] = useState<Record<string, number>>({});
  const [manualEloDrafts, setManualEloDrafts] = useState<Record<string, string>>({});
  const [manualWinnerDrafts, setManualWinnerDrafts] = useState<Record<string, boolean>>({});
  const {
    savingMatchId,
    updateMatch,
    generateTable,
    updateAssignments,
    saveManualElo,
    confirmTable,
    handleSaveMatch,
    handleSaveManualElo,
    handleApplyAssignments,
    handleConfirmTable,
  } = useMatchTableMutations({
    eventId: id,
    scoreDrafts,
    statusDrafts,
    manualEloDrafts,
    manualWinnerDrafts,
    assignmentDrafts,
    matchTable,
    confirmAction,
  });

  const updateCourtOverride = useMutation({
    mutationFn: async (payload: { courtNumber: number; isManual: boolean }) => {
      if (!id) throw new Error("Missing eventId");
      return apiFetch("/.netlify/functions/admin-event-court-overrides", "PATCH", {
        eventId: id,
        ...payload,
      });
    },
    onSuccess: () => {
      toast.success("Court mode updated");
      queryClient.invalidateQueries({ queryKey: ["matchTable", id] });
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Failed to update court mode");
    },
  });

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
  const playersPerCourt = Number.isFinite(formatConfig?.playersPerCourt)
    ? Number(formatConfig.playersPerCourt)
    : 5;
  const courtCount = Math.max(1, Math.ceil(participantCount / playersPerCourt));

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
    const nextStatuses: Record<string, "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "ABANDONED" | "WALKOVER" | "NO_CONTEST"> = {};
    matchTable.matches.forEach((match) => {
      nextDrafts[match.id] = {
        score1: match.score1 !== null ? String(match.score1) : "",
        score2: match.score2 !== null ? String(match.score2) : "",
      };
      nextStatuses[match.id] = (match.status ?? "SCHEDULED") as "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "ABANDONED" | "WALKOVER" | "NO_CONTEST";
    });
    setScoreDrafts(nextDrafts);
    setStatusDrafts(nextStatuses);
  }, [matchTable]);

  useEffect(() => {
    if (!matchTable) return;
    const nextManual: Record<string, string> = {};
    const nextWinners: Record<string, boolean> = {};
    matchTable.courts
      .filter((court) => matchTable.mode === "MANUAL_ELO" || court.isManual)
      .forEach((court) => {
        court.players.forEach((player) => {
          const fallback = player.manualElo ?? player.elo;
          nextManual[player.id] = String(fallback);
          nextWinners[player.id] = player.isWinner ?? false;
        });
      });
    setManualEloDrafts(nextManual);
    setManualWinnerDrafts(nextWinners);
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

  const standingsByCourt = useMemo(() => {
    if (!matchTable) return new Map<number, Array<{ id: string; name: string; points: number; diff: number }>>();
    const manualMode = matchTable.mode === "MANUAL_ELO";
    const map = new Map<number, Array<{ id: string; name: string; points: number; diff: number }>>();

    matchTable.courts.forEach((court) => {
      const matches = matchesByCourt.get(court.courtNumber) ?? [];
      const hideStandings = (manualMode || court.isManual) && matches.length === 0;
      if (hideStandings) return;
      map.set(court.courtNumber, calculateCourtStandings(court.players, matches));
    });

    return map;
  }, [matchTable, matchesByCourt]);

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
  const showCustomMatchesPanel = !!matchTable && isAdmin;
  const statusOptions: Array<
    "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "ABANDONED" | "WALKOVER" | "NO_CONTEST"
  > = isAdmin
    ? ["SCHEDULED", "IN_PROGRESS", "COMPLETED", "ABANDONED", "WALKOVER", "NO_CONTEST"]
    : ["IN_PROGRESS", "COMPLETED", "ABANDONED"];

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
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle>Match Table Status</CardTitle>
                <CardDescription>
                  {formatEventDate(event.date, false, event.endDate)} · {event.location ?? "Location TBD"}
                </CardDescription>
              </div>
              {isAdmin && (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="icon" title="Scoring rules">
                      <Info className="w-4 h-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Scoring & ELO rules</DialogTitle>
                      <DialogDescription>
                        How match results, manual overrides, and court modes affect ratings.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 text-sm text-muted-foreground">
                      <ul className="list-disc pl-5 space-y-2">
                        <li>
                          Only matches with status <strong>COMPLETED</strong> and both scores filled are used for ELO.
                        </li>
                        <li>
                          <strong>Force manual ELO</strong> hides matches for that court and requires manual values.
                        </li>
                        <li>
                          Manual ELO overrides match results only when the value is changed. If unchanged, we use match scores.
                        </li>
                        <li>
                          Short courts (&lt; players per court) use match scores if completed matches exist; otherwise manual ELO is required.
                        </li>
                        <li>
                          Press <strong>Confirm Results</strong> to apply updates and lock the table.
                        </li>
                      </ul>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
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
                        () => generateTable.mutate({ eventId: event.id, mode: "AUTO_COURTS" }),
                      );
                      return;
                    }
                    generateTable.mutate({ eventId: event.id, mode: "AUTO_COURTS" });
                  }}
                  disabled={generateTable.isPending}
                >
                  {generateTable.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4 mr-2" />
                  )}
                  Generate King of the Court
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    if (hasEnteredResults) {
                      confirmAction(
                        "Regenerate match table",
                        "This will clear all entered scores and manual ELO values. Continue?",
                        () => generateTable.mutate({ eventId: event.id, mode: "MANUAL_ELO" }),
                      );
                      return;
                    }
                    generateTable.mutate({ eventId: event.id, mode: "MANUAL_ELO" });
                  }}
                  disabled={generateTable.isPending}
                >
                  {generateTable.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4 mr-2" />
                  )}
                  Generate Manual ELO (Admin)
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

        {isAdmin && event.participants.length > 0 && matchTable?.mode !== "MANUAL_ELO" && (
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

        {showCustomMatchesPanel && (
          <Card className="shadow-lg border-0">
            <CardHeader>
              <CardTitle>Custom Matches</CardTitle>
              <CardDescription>
                Create and manage custom matches, substitute players, or mark unfinished games.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CustomMatchesAdminPanel
                eventId={event.id}
                participants={event.participants}
                matches={matchTable.matches}
                status={status}
                courtNumbers={matchTable.courts.map((court) => court.courtNumber)}
              />
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
                      {matchTable.mode === "MANUAL_ELO" ? "Participants List" : `Court ${court.courtNumber}`}
                    </TabsTrigger>
                  ))}
                </TabsList>

                {matchTable.courts.map((court) => {
                  const courtMatches = matchesByCourt.get(court.courtNumber) ?? [];
                  const isManualCourt = (matchTable.mode === "MANUAL_ELO" || court.isManual) && courtMatches.length === 0;
                  return (
                  <TabsContent key={court.courtNumber} value={`court-${court.courtNumber}`}>
                    <Card className="shadow-lg border-0">
                      <CardHeader>
                        {matchTable.mode === "MANUAL_ELO" ? (
    <CardTitle>Tournament Participants (Manual ELO)</CardTitle>
  ) : (
    <CardTitle>Court {court.courtNumber}</CardTitle>
  )}
                        <CardDescription>
                          {isManualCourt
                            ? matchTable.mode === "MANUAL_ELO"
                              ? "Manual ELO mode — admin sets ratings and winners."
                              : `Less than ${playersPerCourt} players — manual ELO required.`
                            : `${playersPerCourt} players · ${Number.isFinite(formatConfig?.rounds) ? formatConfig.rounds : "standard"} rounds`}
                        </CardDescription>
                        {isAdmin && matchTable.mode !== "MANUAL_ELO" && (
                          <div className="flex items-center gap-2 mt-2">
                            <Switch
                              checked={court.manualOverride ?? false}
                              onCheckedChange={(checked) =>
                                updateCourtOverride.mutate({
                                  courtNumber: court.courtNumber,
                                  isManual: checked,
                                })
                              }
                              disabled={status !== "OPEN" || updateCourtOverride.isPending}
                            />
                            <span className="text-xs text-muted-foreground">
                              Force manual ELO for this court
                            </span>
                          </div>
                        )}
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

                        {isManualCourt ? (
                          <ManualEloTable
                            court={court}
                            status={status}
                            isAdmin={isAdmin}
                            manualEloDrafts={manualEloDrafts}
                            manualWinnerDrafts={manualWinnerDrafts}
                            onManualEloChange={(playerId, value) =>
                              setManualEloDrafts((prev) => ({ ...prev, [playerId]: value }))
                            }
                            onManualWinnerChange={(playerId, checked) =>
                              setManualWinnerDrafts((prev) => ({ ...prev, [playerId]: checked }))
                            }
                            onSave={handleSaveManualElo}
                            isSaving={saveManualElo.isPending}
                          />
                        ) : (
                          <div className="space-y-4">
                            <MatchRoundsTable
                              matches={courtMatches}
                              canEditScores={canEditScores}
                              scoreDrafts={scoreDrafts}
                              statusDrafts={statusDrafts}
                              statusOptions={statusOptions}
                              onScoreChange={(matchId, field, value) =>
                                setScoreDrafts((prev) => ({
                                  ...prev,
                                  [matchId]: {
                                    score1: field === "score1" ? value : (prev[matchId]?.score1 ?? ""),
                                    score2: field === "score2" ? value : (prev[matchId]?.score2 ?? ""),
                                  },
                                }))
                              }
                              onStatusChange={(matchId, nextStatus) =>
                                setStatusDrafts((prev) => ({
                                  ...prev,
                                  [matchId]: nextStatus,
                                }))
                              }
                              onSaveMatch={handleSaveMatch}
                              isUpdatePending={updateMatch.isPending}
                              savingMatchId={savingMatchId}
                            />
                            <CourtStandingsTable
                              courtNumber={court.courtNumber}
                              standings={standingsByCourt.get(court.courtNumber) ?? []}
                            />
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>
                );
                })}
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
