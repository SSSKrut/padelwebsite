import { Hero } from "@/components/Hero";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import productsData from "../../data/products.json";
import padelHero from "@/assets/memberships_title.png";

type Product = {
  name: string;
  type: string;
  priceEuro: number | null;
  description: string;
  buyLink: string | null;
};

const Memberships = () => {
  const items = productsData as Product[];

  const memberships = items.filter((p) => p.type === "membership");
  const passes = items.filter((p) => p.type === "pass");
  const addonInfo = items.find((p) => p.type === "addon-info");

  const getBadge = (name: string) => {
    if (name === "Year Membership") return { text: "Popular", variant: "secondary" as const };
    return null;
  };

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
          {memberships.map((membership, index) => {
            const badge = getBadge(membership.name);
            return (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between mb-2 gap-3">
                    <CardTitle className="text-2xl">{membership.name}</CardTitle>
                    {badge && badge.text === "Popular" && (
                      <Badge variant={badge.variant}>{badge.text}</Badge>
                    )}
                  </div>

                  <p className="text-4xl font-bold text-primary">€{membership.priceEuro}</p>
                  <p className="text-sm text-muted-foreground">per membership period</p>
                </CardHeader>

                <CardContent>
                  <p className="text-muted-foreground mb-6">{membership.description}</p>
                  {membership.buyLink && (
                    <Button asChild className="w-full" size="lg">
                      <a href={membership.buyLink} target="_blank" rel="noopener noreferrer">
                        Buy Membership
                      </a>
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Winter passes */}
        <h2 className="text-3xl font-bold text-center mb-12">Winter Saturday Passes</h2>
        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-16">
          {passes.map((pass, index) => {
            const badge = getBadge(pass.name);
            return (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between mb-2 gap-3">
                    <CardTitle className="text-2xl">{pass.name}</CardTitle>
                    {badge && badge.text === "Best deal" && (
                      <Badge variant={badge.variant}>{badge.text}</Badge>
                    )}
                  </div>

                  <p className="text-4xl font-bold text-primary">€{pass.priceEuro}</p>
                  <p className="text-sm text-muted-foreground">limited to Saturday winter games</p>
                </CardHeader>

                <CardContent>
                  <p className="text-muted-foreground mb-6">{pass.description}</p>
                  {pass.buyLink && (
                    <Button asChild className="w-full" size="lg">
                      <a href={pass.buyLink} target="_blank" rel="noopener noreferrer">
                        Buy Pass
                      </a>
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Add-ons (text only) */}
        <h2 className="text-3xl font-bold text-center mb-6">Add-ons</h2>
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-muted-foreground text-lg">
            {addonInfo?.description ?? "Soon available"}
          </p>
        </div>
      </section>
    </div>
  );
};

export default Memberships;
