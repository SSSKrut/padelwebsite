import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, Trophy } from "lucide-react";
import { UserRole } from "@/context/AuthContext";
import { isEventLocked } from "@/lib/utils";
import type { EventDetailsResponse } from "@/types/events";

interface AuthUser {
  id: string;
  role: UserRole;
  isPremium?: boolean;
}

export function RegistrationCTA({
  event,
  user,
  isCompleted,
  registerMutation,
}: {
  event: EventDetailsResponse;
  user: AuthUser | null;
  isCompleted: boolean;
  registerMutation: {
    mutate: () => void;
    isPending: boolean;
  };
}) {
  return (
    <>
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
              {isLocked && (
                <p className="text-xs text-center text-muted-foreground">
                  Registration and cancellation are closed within 24 hours.
                </p>
              )}
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
              {isLocked && (
                <p className="text-xs text-center text-muted-foreground">
                  Registration and waitlist cancellation are closed within 24 hours.
                </p>
              )}
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
              {shouldJoinWaitlist ? (userIsPremium ? "Join Waitlist" : "Join Waitlist") : "Register Now"}
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
    </>
  );
}
