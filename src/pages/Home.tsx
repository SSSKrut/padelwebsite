import { Link } from "react-router-dom";
import { Hero } from "@/components/Hero";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Trophy, Calendar, Heart } from "lucide-react";
import siteData from "../../data/site.json";
import eventsData from "../../data/events.json";
import productsData from "../../data/products.json";
import padelHero from "@/assets/padel-hero.jpg";

const Home = () => {
  const memberships = productsData.filter((p) => p.type === "membership");
  const upcomingEvents = eventsData.slice(0, 3);

  const features = [
    { icon: Users, title: "Community", description: "Join 200+ active players" },
    { icon: Trophy, title: "Tournaments", description: "Weekly competitive events" },
    { icon: Calendar, title: "Regular Games", description: "Sessions 4x per week" },
    { icon: Heart, title: "All Levels", description: "Beginner to advanced" },
  ];

  return (
    <div className="min-h-screen">
      <Hero
        title={siteData.brand}
        subtitle={siteData.tagline}
        backgroundImage={padelHero}
      >
        <Button asChild size="lg">
          <Link to={siteData.ctaPrimaryHref}>{siteData.ctaPrimaryLabel}</Link>
        </Button>
        <Button asChild variant="secondary" size="lg">
          <Link to="/memberships">View Memberships</Link>
        </Button>
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
              <p className="text-sm text-muted-foreground">{feature.description}</p>
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
          {upcomingEvents.map((event, index) => (
            <Card key={index} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between mb-2">
                  <CardTitle className="text-xl">{event.title}</CardTitle>
                  <Badge>{event.level}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {new Date(event.date).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                  })}{" "}
                  • {event.time}
                </p>
              </CardHeader>
              <CardContent>
                <p className="text-sm mb-2">{event.venue}</p>
                <p className="text-sm text-muted-foreground mb-4">{event.description}</p>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-lg">€{event.priceEuro}</span>
                  <Button asChild size="sm">
                    <a href={event.regLink} target="_blank" rel="noopener noreferrer">
                      Register
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
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
                <p className="text-3xl font-bold text-primary">€{membership.priceEuro}</p>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">{membership.description}</p>
                <Button asChild className="w-full">
                  <a href={membership.buyLink} target="_blank" rel="noopener noreferrer">
                    Get Started
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
