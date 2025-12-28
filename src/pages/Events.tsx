import { useState } from "react";
import { Hero } from "@/components/Hero";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import eventsData from "../../data/events.json";
import padelHero from "@/assets/padel-hero.png";

const Events = () => {
  const [filter, setFilter] = useState<string>("All");

  const levels = ["All", ...Array.from(new Set(eventsData.map((e) => e.level)))];

  const filteredEvents =
    filter === "All" ? eventsData : eventsData.filter((e) => e.level === filter);

  return (
    <div className="min-h-screen">
      <Hero
        title="Upcoming Events"
        subtitle="Join our weekly padel sessions"
        backgroundImage={padelHero}
        compact
      />

      <section className="container mx-auto px-4 py-12">
        {/* Filter */}
        <div className="flex flex-wrap gap-2 mb-8 justify-center">
          {levels.map((level) => (
            <Button
              key={level}
              variant={filter === level ? "default" : "outline"}
              onClick={() => setFilter(level)}
            >
              {level}
            </Button>
          ))}
        </div>

        {/* Events Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEvents.map((event, index) => (
            <Card key={index} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between mb-2">
                  <CardTitle className="text-xl">{event.title}</CardTitle>
                  <Badge>{event.level}</Badge>
                </div>

                <p className="text-sm text-muted-foreground">
                  {new Date(event.date).toLocaleDateString("en-GB", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  })}
                </p>
                <p className="text-sm text-muted-foreground">{event.time}</p>
              </CardHeader>

              <CardContent>
                <p className="text-sm font-medium mb-2">{event.venue}</p>
                <p className="text-sm text-muted-foreground mb-4">
                  {event.description}
                </p>

                <div className="flex items-center justify-between">
                  <span className="font-bold text-xl text-primary">
                    €{event.priceEuro}
                  </span>

                  {event.regLinkVisible ? (
                    <Button asChild>
                      <a href={event.regLink} target="_blank" rel="noopener noreferrer">
                        Register
                      </a>
                    </Button>
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      Registration soon
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredEvents.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No events found for this level.</p>
          </div>
        )}
      </section>
    </div>
  );
};

export default Events;
