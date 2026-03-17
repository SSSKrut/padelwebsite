import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Hero } from "@/components/Hero";
import { EventCard } from "@/components/EventCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { Loader2 } from "lucide-react";
import padelHero from "@/assets/padel-hero.png";

const Events = () => {
  const { data: events, isLoading } = useQuery({
    queryKey: ["events"],
    queryFn: () => apiFetch("/.netlify/functions/events"),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const upcomingEvents = events?.filter((e: any) => e.status === "PUBLISHED" && new Date(e.date) >= new Date()) || [];
  const pastEvents = events?.filter((e: any) => e.status === "ARCHIVED" || (e.status === "PUBLISHED" && new Date(e.date) < new Date())) || [];

  return (
    <div className="min-h-screen">
      <Hero
        title="Padel Events"
        subtitle="Join our weekly padel sessions"
        backgroundImage={padelHero}
        compact
      />

      <section className="container mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold mb-8">Upcoming Events</h2>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {upcomingEvents.map((event: any) => (
            <EventCard key={event.id} event={event} />
          ))}
          {upcomingEvents.length === 0 && (
            <div className="col-span-full text-center py-12 bg-muted/50 rounded-xl">
              <p className="text-muted-foreground">No upcoming events are currently scheduled.</p>
            </div>
          )}
        </div>

        <h2 className="text-2xl font-bold mb-8">Past Events</h2>
        <div className="rounded-2xl border bg-background/80 shadow-sm overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted text-muted-foreground">
              <tr>
                <th className="px-6 py-4 font-medium">Event</th>
                <th className="px-6 py-4 font-medium">Date</th>
                <th className="px-6 py-4 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {pastEvents.map((event: any) => (
                <tr key={event.id} className="hover:bg-muted/50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-medium">{event.title}</p>
                    <p className="text-xs text-muted-foreground">{event.location}</p>
                  </td>
                  <td className="px-6 py-4">
                    {new Date(event.date).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "long",
                      year: "numeric"
                    })}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Button variant="ghost" size="sm" asChild>
                      <Link to={`/events/${event.id}`}>View Results</Link>
                    </Button>
                  </td>
                </tr>
              ))}
              {pastEvents.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-6 py-8 text-center text-muted-foreground">
                    No past events to display.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default Events;
