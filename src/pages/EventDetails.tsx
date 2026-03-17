import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Hero } from "@/components/Hero";
import padelHero from "@/assets/padel-hero.png";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar, MapPin, Loader2, Users, ArrowLeft, Trophy, CheckCircle } from "lucide-react";
import { UserRole } from "@/context/AuthContext";

const EventDetails = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: event, isLoading, error } = useQuery({
    queryKey: ["event", id],
    queryFn: () => apiFetch(`/.netlify/functions/event-details?id=${id}`),
    enabled: !!id,
  });

  const registerMutation = useMutation({
    mutationFn: () =>
      apiFetch(`/.netlify/functions/event-register`, "POST", { eventId: id }),
    onSuccess: (data: any) => {
      toast({
        title: "Success",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ["event", id] });
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err.message || "Failed to register.",
        variant: "destructive",
      });
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
                          {new Date(event.date).toLocaleDateString("en-GB", {
                            weekday: "long",
                            day: "numeric",
                            month: "long",
                            hour: "2-digit",
                            minute: "2-digit"
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Badge variant={isCompleted ? "secondary" : "default"} className="text-sm px-3 py-1">
                    {isCompleted ? "Completed" : "Upcoming"}
                  </Badge>
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
                  Participants ({event.participants?.length || 0} / {event.maxParticipants || 16})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {event.participants && event.participants.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {event.participants.map((registration: any) => (
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
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 bg-muted/30 rounded-xl">
                    <p className="text-muted-foreground">No participants yet.</p>
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
                    {event.participants?.length || 0} <span className="text-lg text-muted-foreground">/ {event.maxParticipants || 16}</span>
                  </p>
                </div>

                {!isCompleted && (() => {
                  const isRegistered = user && event.participants?.some((p: any) => p.user.id === user.id);
                  const userIsUnverified = user && user.role === UserRole.UNVERIFIED_USER;
                  const isFull = (event.participants?.length || 0) >= (event.maxParticipants || 16);

                  if (!user) {
                    return (
                      <Button className="w-full mt-4" size="lg" asChild>
                        <Link to="/login">Login to Register</Link>
                      </Button>
                    );
                  }

                  if (isRegistered) {
                    return (
                      <Button 
                        variant="secondary"
                        className="w-full mt-4 flex gap-2" 
                        size="lg"
                        onClick={() => registerMutation.mutate()}
                        disabled={registerMutation.isPending}
                      >
                        {registerMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-5 h-5 text-green-500" />}
                        Cancel Registration
                      </Button>
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

                  if (isFull) {
                    return (
                      <Button 
                        variant="outline"
                        className="w-full mt-4" 
                        size="lg"
                        disabled
                      >
                        Event is Full
                      </Button>
                    );
                  }

                  return (
                    <Button 
                      className="w-full mt-4" 
                      size="lg"
                      onClick={() => registerMutation.mutate()}
                      disabled={registerMutation.isPending}
                    >
                      {registerMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                      Register Now
                    </Button>
                  );
                })()}

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
    </div>
  );
};

export default EventDetails;