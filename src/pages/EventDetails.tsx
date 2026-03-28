import { useParams, Link } from "react-router-dom";
import { useState } from "react";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar, MapPin, Loader2, Users, ArrowLeft, Trophy, CheckCircle, X } from "lucide-react";
import { UserRole } from "@/context/AuthContext";
import { formatEventDate, isEventLocked } from "@/lib/utils";

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

  const canManageParticipants = !!user && (user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN);

  const { data: event, isLoading, error } = useQuery<EventDetailsResponse>({
    queryKey: ["event", id],
    queryFn: () => apiFetch(`/.netlify/functions/event-details?id=${id}`),
    enabled: !!id,
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
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Users className="w-5 h-5 text-primary" />
                  Participants ({event.participants.length} / {event.maxParticipants || 16})
                </CardTitle>
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