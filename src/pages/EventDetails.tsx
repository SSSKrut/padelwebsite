import { useParams, Link } from "react-router-dom";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useConfirm } from "@/hooks/useConfirm";
import { toast } from "sonner";
import { Hero } from "@/components/Hero";
import padelHero from "@/assets/padel-hero.png";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar, MapPin, Loader2, Users, ArrowLeft, Trophy, CheckCircle, X, Download } from "lucide-react";
import { UserRole } from "@/context/AuthContext";
import { formatEventDate, isEventLocked } from "@/lib/utils";
import { parseFileNameFromContentDisposition, triggerBlobDownload } from "@/lib/downloadFile";

interface EventParticipant {
  id: string;
  user: {
    id: string;
    name: string;
    elo: number;
  };
}

interface EventWaitlistEntry {
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
  description: string;
  date: string;
  endDate: string | null;
  location: string;
  status: string;
  maxParticipants: number;
  participants: EventParticipant[];
  waitlist: EventWaitlistEntry[];
  waitlistCount: number;
  currentUserWaitlistPosition: number | null;
  currentUserWaitlistAhead: number | null;
}

interface MatchTablePlayer {
  id: string;
  name: string;
  elo: number;
  manualElo?: number;
  previousElo?: number;
  newElo?: number;
  isWinner?: boolean;
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
}

interface MatchTableResponse {
  mode: "AUTO_COURTS" | "MANUAL_ELO";
  eventId: string;
  status: string;
  generatedAt: string | null;
  confirmedAt: string | null;
  courts: MatchTableCourt[];
  matches: MatchTableMatch[];
}

interface CourtWinner {
  courtNumber: number;
  winners: Array<{ id: string; name: string }>;
  points: number;
  diff: number;
  isManual?: boolean;
  manualElo?: Array<{ id: string; name: string; previousElo: number; newElo: number; diff: number }>;
}

function getErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error) {
    return err.message;
  }
  return fallback;
}

const EventDetails = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { confirmAction, ConfirmDialogComponent } = useConfirm();
  const queryClient = useQueryClient();
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);
  const [isExportingEventUsers, setIsExportingEventUsers] = useState(false);

  const canManageParticipants = !!user && (user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN);

  const { data: event, isLoading, error } = useQuery<EventDetailsResponse>({
    queryKey: ["event", id],
    queryFn: () => apiFetch(`/.netlify/functions/event-details?id=${id}`),
    enabled: !!id,
  });

  const isRegistered = !!user && !!event?.participants.some((p) => p.user.id === user.id);
  const canViewMatchTable = !!user && (canManageParticipants || isRegistered);

  const { data: matchTable, isLoading: matchTableLoading } = useQuery<MatchTableResponse>({
    queryKey: ["matchTable", id],
    queryFn: () => apiFetch(`/.netlify/functions/event-match-table?eventId=${id}`),
    enabled: !!id && canViewMatchTable,
  });

  const registerMutation = useMutation({
    mutationFn: () =>
      apiFetch(`/.netlify/functions/event-register`, "POST", { eventId: id }),
    onSuccess: (data: { message?: string }) => {
      toast.success(data.message);
      queryClient.invalidateQueries({ queryKey: ["event", id] });
    },
    onError: (err: unknown) => {
      toast.error(getErrorMessage(err, "Failed to register."));
    },
  });

  const removeParticipantMutation = useMutation({
    mutationFn: (userId: string) =>
      apiFetch("/.netlify/functions/admin-event-registration", "DELETE", {
        eventId: id,
        userId,
      }),
    onMutate: (userId: string) => {
      setRemovingUserId(userId);
    },
    onSuccess: (data: { message?: string }) => {
      toast.success(data.message || "Participant removed.");
      queryClient.invalidateQueries({ queryKey: ["event", id] });
    },
    onError: (err: unknown) => {
      toast.error(getErrorMessage(err, "Failed to remove participant."));
    },
    onSettled: () => {
      setRemovingUserId(null);
    },
  });

  const handleExportEventUsers = async () => {
    if (!id) return;

    setIsExportingEventUsers(true);
    try {
      const response = await fetch(
        `/.netlify/functions/admin-db-export-csv?eventId=${encodeURIComponent(id)}`,
        { method: "GET" },
      );

      if (!response.ok) {
        let errorMessage = "Failed to export event users CSV";
        try {
          const errorBody = await response.json();
          if (typeof errorBody?.error === "string") {
            errorMessage = errorBody.error;
          }
        } catch {
          // Keep fallback for non-JSON errors.
        }
        throw new Error(errorMessage);
      }

      const blob = await response.blob();
      const fileName = parseFileNameFromContentDisposition(
        response.headers.get("Content-Disposition"),
        "event_users.csv",
      );
      triggerBlobDownload(blob, fileName);
      toast.success("Event users export started");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to export event users CSV");
    } finally {
      setIsExportingEventUsers(false);
    }
  };

  const formatStandingPoints = (value: number) =>
    Number.isInteger(value) ? String(value) : value.toFixed(1);

  const formatStandingDiff = (value: number) =>
    value > 0 ? `+${value}` : String(value);

  const courtWinners = useMemo<CourtWinner[]>(() => {
    if (!matchTable?.courts?.length) return [];

    const matchesByCourt = new Map<number, MatchTableMatch[]>();
    matchTable.matches.forEach((match) => {
      const list = matchesByCourt.get(match.courtNumber) ?? [];
      list.push(match);
      matchesByCourt.set(match.courtNumber, list);
    });

    return matchTable.courts.map((court) => {
      if (court.isManual) {
        const manualWinners = court.players.filter((p) => p.isWinner);
        const winners = manualWinners.map((p) => ({ id: p.id, name: p.name }));
        const manualElo = manualWinners.map((p) => {
          const previousElo = p.previousElo ?? p.elo;
          const newElo = p.manualElo ?? p.newElo ?? p.elo;
          return {
            id: p.id,
            name: p.name,
            previousElo,
            newElo,
            diff: newElo - previousElo,
          };
        });
        
        return {
          courtNumber: court.courtNumber,
          winners,
          points: 0,
          diff: 0,
          isManual: true,
          manualElo,
        };
      }

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

        const top = standings[0];
        if (!top) {
          return null;
        }

        const winners = standings
          .filter((entry) => entry.points === top.points && entry.diff === top.diff)
          .map((entry) => ({ id: entry.id, name: entry.name }));

        return {
          courtNumber: court.courtNumber,
          winners,
          points: top.points,
          diff: top.diff,
        };
      })
      .filter((winner): winner is CourtWinner => winner !== null);
  }, [matchTable]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <h2 className="text-2xl font-bold mb-4">Event not found</h2>
        <Button asChild>
          <Link to="/events">Back to Events</Link>
        </Button>
      </div>
    );
  }

  const isCompleted = event.status === "ARCHIVED";
  const isScheduled = event.status === "SCHEDULED";

  return (
    <div className="min-h-screen bg-muted/20 pb-16">
      <Hero
        title={event.title}
        subtitle="Event Details"
        backgroundImage={padelHero}
        compact
      />

      <div className="container max-w-5xl mx-auto px-4 -mt-10 relative z-10">
        <Button variant="outline" className="mb-6 bg-background shadow-sm" asChild>
          <Link to="/events" className="flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" /> Back to Events
          </Link>
        </Button>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-8">
            <Card className="shadow-lg border-0">
              <CardHeader className="pb-4">
                <div className="flex flex-wrap justify-between items-start gap-4">
                  <div>
                    <CardTitle className="text-3xl font-bold mb-2">{event.title}</CardTitle>
                    <div className="flex items-center gap-4 text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4" />
                        <span>
                          {formatEventDate(event.date, false, event.endDate)}
                        </span>
                      </div>
                    </div>
                  </div>
                  {isScheduled ? (
                    <Badge variant="outline" className="text-sm px-3 py-1 border-amber-500 text-amber-600">
                      Scheduled
                    </Badge>
                  ) : (
                    <Badge variant={isCompleted ? "secondary" : "default"} className="text-sm px-3 py-1">
                      {isCompleted ? "Completed" : "Upcoming"}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-muted-foreground mb-6 bg-muted/30 p-3 rounded-lg">
                  <MapPin className="w-5 h-5 text-primary" />
                  <span className="font-medium text-foreground">{event.location}</span>
                </div>
                
                <h3 className="font-semibold text-lg mb-2">About this event</h3>
                <p className="text-muted-foreground whitespace-pre-line leading-relaxed">
                  {event.description}
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-lg border-0">
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Users className="w-5 h-5 text-primary" />
                    Participants ({event.participants.length} / {event.maxParticipants || 16})
                  </CardTitle>
                  {(canViewMatchTable || canManageParticipants) && (
                    <div className="flex flex-wrap gap-2">
                      {canViewMatchTable && (
                        <Button size="sm" variant="outline" asChild>
                          <Link to={`/events/${event.id}/matches`}>Match Table</Link>
                        </Button>
                      )}
                      {canManageParticipants && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleExportEventUsers}
                            disabled={isExportingEventUsers}
                          >
                            {isExportingEventUsers ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <Download className="mr-2 h-4 w-4" />
                            )}
                            Export Event Users
                          </Button>
                        </>
                      )}
                    </div>
                  )}
                </div>
                <CardDescription>
                  Waitlist: {event.waitlistCount}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {event.participants.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {event.participants.map((registration) => (
                      <div 
                        key={registration.id} 
                        className="flex items-center gap-4 p-3 rounded-xl border bg-card hover:bg-muted/50 transition-colors"
                      >
                        <Avatar className="w-12 h-12 border-2 border-background shadow-sm">
                          <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${registration.user.name}`} />
                          <AvatarFallback>{registration.user.name?.substring(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="font-semibold text-sm">{registration.user.name}</p>
                          <p className="text-xs text-muted-foreground">Registered Participant</p>
                        </div>
                        <div className="text-right flex flex-col items-center justify-center">
                          <Trophy className="w-4 h-4 text-amber-500 mb-1" />
                          <span className="text-xs font-bold">{registration.user.elo}</span>
                        </div>
                        {canManageParticipants && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            disabled={removeParticipantMutation.isPending}
                            onClick={() =>
                              confirmAction(
                                "Remove Participant",
                                `Remove ${registration.user.name} from this event?`,
                                () => removeParticipantMutation.mutate(registration.user.id),
                              )
                            }
                            aria-label={`Remove ${registration.user.name}`}
                          >
                            {removeParticipantMutation.isPending && removingUserId === registration.user.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <X className="w-4 h-4" />
                            )}
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 bg-muted/30 rounded-xl">
                    <p className="text-muted-foreground">No participants yet.</p>
                  </div>
                )}

                {canManageParticipants && (
                  <div className="mt-8">
                    <h4 className="font-semibold mb-3">Waitlist Queue ({event.waitlistCount})</h4>
                    {event.waitlist.length > 0 ? (
                      <div className="space-y-2">
                        {event.waitlist.map((entry, index) => (
                          <div
                            key={entry.id}
                            className="flex items-center justify-between rounded-lg border bg-muted/20 p-3"
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-xs font-semibold rounded-md border px-2 py-1 bg-background">
                                #{index + 1}
                              </span>
                              <span className="text-sm font-medium">{entry.user.name}</span>
                            </div>
                            <span className="text-xs text-muted-foreground">ELO {entry.user.elo}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Waitlist is empty.</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {canViewMatchTable && (
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
                  ) : (matchTable.mode === "MANUAL_ELO" ? matchTable.courts[0]?.players.length > 0 : courtWinners.length > 0) ? (
                    <div className="overflow-x-auto">
                      {matchTable.mode === "MANUAL_ELO" ? (
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
                            {matchTable.courts[0]?.players.map((p) => {
                              const prev = p.previousElo ?? p.elo;
                              const current = matchTable.status === "CONFIRMED" ? (p.newElo ?? p.elo) : (p.manualElo ?? p.elo);
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
            )}
          </div>

          <div className="space-y-6">
            <Card className="shadow-lg border-0 sticky top-24">
              <CardHeader>
                <CardTitle>Event Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Status</p>
                  <p className="font-medium flex items-center gap-2">
                    {isCompleted ? (
                      <><span className="w-2 h-2 rounded-full bg-slate-500"></span> Archived</>
                    ) : (
                      <><span className="w-2 h-2 rounded-full bg-green-500"></span> Active</>
                    )}
                  </p>
                </div>
                
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Total Participants</p>
                  <p className="font-medium text-2xl">
                    {event.participants.length} <span className="text-lg text-muted-foreground">/ {event.maxParticipants || 16}</span>
                  </p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground mb-1">Waitlist</p>
                  <p className="font-medium text-2xl">{event.waitlistCount}</p>
                </div>

                {!isCompleted && (() => {
                  const isRegistered = user && event.participants.some((p) => p.user.id === user.id);
                  const isWaitlisted = user && event.currentUserWaitlistPosition !== null;
                  const userIsUnverified = user && user.role === UserRole.UNVERIFIED_USER;
                  const isFull = event.participants.length >= (event.maxParticipants || 16);
                  const userIsPremium = !!user?.isPremium;
                  
                  const isLocked = isEventLocked(event.date);

                  if (!user) {
                    return (
                      <Button className="w-full mt-4" size="lg" asChild>
                        <Link to="/login">Login to Register</Link>
                      </Button>
                    );
                  }

                  if (isRegistered) {
                    return (
                      <div className="mt-4 space-y-2">
                        <Button
                          variant="secondary"
                          className="w-full flex gap-2"
                          size="lg"
                          onClick={() => registerMutation.mutate()}
                          disabled={registerMutation.isPending || isLocked}
                        >
                          {registerMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-5 h-5 text-green-500" />}
                          Cancel Registration
                        </Button>
                        {isLocked && <p className="text-xs text-center text-destructive">Locked (less than 24h to start)</p>}
                      </div>
                    );
                  }

                  if (isWaitlisted) {
                    return (
                      <div className="mt-4 space-y-2">
                        <Button
                          variant="secondary"
                          className="w-full flex gap-2"
                          size="lg"
                          onClick={() => registerMutation.mutate()}
                          disabled={registerMutation.isPending || isLocked}
                        >
                          {registerMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-5 h-5 text-green-500" />}
                          Leave Waitlist
                        </Button>
                        <p className="text-xs text-center text-muted-foreground">
                          You are #{event.currentUserWaitlistPosition} in queue. People ahead of you: {event.currentUserWaitlistAhead}
                        </p>
                        {isLocked && <p className="text-xs text-center text-destructive">Locked (less than 24h to start)</p>}
                      </div>
                    );
                  }

                  if (userIsUnverified) {
                    return (
                      <Button 
                        variant="outline"
                        className="w-full mt-4" 
                        size="lg"
                        disabled
                      >
                        Admin must verify your account
                      </Button>
                    );
                  }

                  const shouldJoinWaitlist = isFull;

                  return (
                    <div className="mt-4 space-y-2">
                      <Button
                        className="w-full"
                        variant={shouldJoinWaitlist ? "outline" : "default"}
                        size="lg"
                        onClick={() => registerMutation.mutate()}
                        disabled={registerMutation.isPending || isLocked}
                      >
                        {registerMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                        {shouldJoinWaitlist ? (userIsPremium ? "Join Premium Waitlist" : "Join Waitlist") : "Register Now"}
                      </Button>
                      {shouldJoinWaitlist && (
                        <p className="text-xs text-center text-muted-foreground">
                          {userIsPremium
                            ? "Event is full. You will be added to the premium-priority waitlist."
                            : "Event is full. You will be added to the waitlist."}
                        </p>
                      )}
                      {isLocked && <p className="text-xs text-center text-destructive">Locked (less than 24h to start)</p>}
                    </div>
                  );
                })()}

                {!isCompleted && (
                  <p className="text-xs text-muted-foreground text-center">
                    Registration and cancellation close 24 hours before the event start.
                  </p>
                )}

                {isCompleted && (
                  <div className="p-4 bg-primary/10 rounded-xl flex items-start gap-3 mt-4">
                    <Trophy className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-sm text-primary">Event Completed</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Thanks to everyone who participated!
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      <ConfirmDialogComponent />
    </div>
  );
};

export default EventDetails;