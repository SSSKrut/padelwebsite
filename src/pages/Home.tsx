import { Link } from "react-router-dom";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Hero } from "@/components/Hero";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EventCard } from "@/components/EventCard";
import { Loader2 } from "lucide-react";
import { Users, Trophy, Heart, Briefcase } from "lucide-react";
import { apiFetch } from "@/lib/api";
import siteData from "../../data/site.json";
import productsData from "../../data/products.json";
// import padelHero from "@/assets/padel-hero.jpg";
import padelHero from "@/assets/Title_page.png";

type HomeEvent = {
  id: string;
  title: string;
  description?: string;
  date: string;
  endDate?: string | null;
  location?: string;
  status: "DRAFT" | "SCHEDULED" | "PUBLISHED" | "ARCHIVED";
  maxParticipants?: number;
  _count?: {
    participants: number;
  };
  participants?: any[];
};

const Home = () => {
  const memberships = productsData.filter((p) => p.type === "membership");
  const { data: events, isLoading: eventsLoading, isError: eventsError } = useQuery<HomeEvent[]>({
    queryKey: ["events", "home"],
    queryFn: () => apiFetch("/.netlify/functions/events"),
  });

  const upcomingEvents = useMemo(() => {
    if (!events) return [];
    const now = new Date();
    return events
      .filter((event) =>
        event.status === "PUBLISHED" &&
        new Date(event.date) >= now,
      )
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 3);
  }, [events]);

  const features = [
    { icon: Users, title: "Community", description: "Join 300+ Active Players" },
    { icon: Trophy, title: "Weekly Games", description: "Sessions 2x per Week" },
    { icon: Heart, title: "All Levels", description: "Beginner to Expert" },
    {
      icon: Briefcase,
      title: "Corporate Tournaments",
      description: "Perfect Tournament for You",
    },
  ];

  return (
    <div className="min-h-screen">
      <Hero
        title={siteData.brand}
        subtitle={siteData.tagline}
        backgroundImage={padelHero}
      >
        <div className="flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link to={siteData.ctaPrimaryHref}>{siteData.ctaPrimaryLabel}</Link>
          </Button>

          <Button asChild variant="secondary" size="lg">
            <Link to="/memberships">View Memberships</Link>
          </Button>

          <Button asChild variant="outline" size="lg">
            <Link to="/corporate">Organise Custom Event</Link>
          </Button>
        </div>
      </Hero>

      {/* Why Play With Us */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
          Why Play With Us
        </h2>
        <div className="grid md:grid-cols-4 gap-8">
          {features.map((feature) => (
            <div key={feature.title} className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 text-primary mb-4">
                <feature.icon size={32} />
              </div>
              <h3 className="font-semibold mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Upcoming Events */}
      <section className="container mx-auto px-4 py-16 bg-muted/30">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
          Upcoming Events
        </h2>
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {eventsLoading && (
            <div className="col-span-full flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          )}
          {!eventsLoading && !eventsError && upcomingEvents.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
          {!eventsLoading && eventsError && (
            <div className="col-span-full rounded-xl border border-destructive/40 bg-background p-6 text-center text-sm text-destructive">
              Failed to load current events.
            </div>
          )}
          {!eventsLoading && !eventsError && upcomingEvents.length === 0 && (
            <div className="col-span-full rounded-xl border bg-background p-6 text-center text-sm text-muted-foreground">
              No upcoming events right now.
            </div>
          )}
        </div>
        <div className="text-center">
          <Button asChild variant="outline" size="lg">
            <Link to="/events">View All Events</Link>
          </Button>
        </div>
      </section>

      {/* Memberships Promo */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
          Become a Member
        </h2>
        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {memberships.map((membership, index) => (
            <Card key={index} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle>{membership.name}</CardTitle>
                <p className="text-3xl font-bold text-primary">
                  €{membership.priceEuro}
                </p>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  {membership.description}
                </p>
                <Button asChild className="w-full">
                  <a
                    href={membership.buyLink}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Become a Member
                  </a>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Home;
