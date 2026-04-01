import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatEventDate } from "@/lib/utils";

export interface EventCardProps {
  event: {
    id: string;
    title: string;
    date: string | Date;
    endDate?: string | Date | null;
    location?: string;
    description?: string;
    status?: string;
    maxParticipants?: number;
    _count?: {
      participants: number;
    };
    participants?: any[];
  };
}

export function EventCard({ event }: EventCardProps) {
  const participantsCount = event._count?.participants ?? event.participants?.length ?? 0;
  const maxParticipants = event.maxParticipants ?? 16;

  return (
    <Card className="hover:shadow-lg transition-shadow flex flex-col h-full">
      <CardHeader>
        <div className="flex items-start justify-between mb-2">
          <CardTitle className="text-xl">{event.title}</CardTitle>
          {event.status === "SCHEDULED" && (
            <Badge variant="outline" className="border-amber-500 text-amber-600 text-xs shrink-0">
              Scheduled
            </Badge>
          )}
        </div>

        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
          {formatEventDate(event.date, false, event.endDate)}
        </p>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col">
        <p className="text-sm font-medium mb-2">{event.location}</p>
        <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
          {event.description}
        </p>

        <div className="mt-auto flex items-center justify-between pt-4 border-t">
          <span className="text-sm text-muted-foreground">
            {participantsCount} / {maxParticipants} participants
          </span>
          <Button asChild>
            <Link to={`/events/${event.id}`}>View Details</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
