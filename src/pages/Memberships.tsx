import { Hero } from "@/components/Hero";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import productsData from "../../data/products.json";
import padelHero from "@/assets/padel-hero.jpg";

const Memberships = () => {
  const memberships = productsData.filter((p) => p.type === "membership");
  const addons = productsData.filter((p) => p.type === "addon");

  return (
    <div className="min-h-screen">
      <Hero
        title="Memberships & Products"
        subtitle="Choose your plan and get exclusive benefits"
        backgroundImage={padelHero}
        compact
      />

      <section className="container mx-auto px-4 py-12">
        {/* Memberships */}
        <h2 className="text-3xl font-bold text-center mb-12">Memberships</h2>
        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-16">
          {memberships.map((membership, index) => (
            <Card key={index} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between mb-2">
                  <CardTitle className="text-2xl">{membership.name}</CardTitle>
                  <Badge variant="secondary">Popular</Badge>
                </div>
                <p className="text-4xl font-bold text-primary">€{membership.priceEuro}</p>
                <p className="text-sm text-muted-foreground">per month</p>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-6">{membership.description}</p>
                <Button asChild className="w-full" size="lg">
                  <a href={membership.buyLink} target="_blank" rel="noopener noreferrer">
                    Get Started
                  </a>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Add-ons */}
        <h2 className="text-3xl font-bold text-center mb-12">Add-ons</h2>
        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {addons.map((addon, index) => (
            <Card key={index} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle>{addon.name}</CardTitle>
                <p className="text-2xl font-bold text-primary">€{addon.priceEuro}</p>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">{addon.description}</p>
                <Button asChild className="w-full">
                  <a href={addon.buyLink} target="_blank" rel="noopener noreferrer">
                    Buy Now
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

export default Memberships;
