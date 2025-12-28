import { Hero } from "@/components/Hero";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import merchData from "../../data/merch.json";
import padelHero from "@/assets/merch_title.png";

const Merch = () => {
  return (
    <div className="min-h-screen">
      <Hero
        title="Official Merchandise"
        subtitle="Rep the Sun Set Padel brand"
        backgroundImage={padelHero}
        compact
      />

      <section className="container mx-auto px-4 py-12">
        {/* Products Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {merchData.map((item, index) => (
            <Card key={index} className="hover:shadow-lg transition-shadow overflow-hidden">
              <div className="aspect-square bg-muted flex items-center justify-center">
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "/placeholder.svg";
                  }}
                />
              </div>
              <CardHeader>
                <CardTitle className="text-xl">{item.name}</CardTitle>
                <p className="text-2xl font-bold text-primary">€{item.priceEuro}</p>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">{item.description}</p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {item.options.map((size) => (
                    <Badge key={size} variant="outline">
                      {size}
                    </Badge>
                  ))}
                </div>
                <Button asChild className="w-full">
                  <a href={item.buyLink} target="_blank" rel="noopener noreferrer">
                    Buy Now
                  </a>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* FAQ */}
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-8">FAQ</h2>
          <Card>
            <CardContent className="space-y-4 pt-6">
              <div>
                <h3 className="font-semibold mb-2">Shipping & Delivery</h3>
                <p className="text-sm text-muted-foreground">
                  We ship within Austria. Delivery takes 3-5 business days. Free shipping on
                  orders over €50.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Returns & Exchanges</h3>
                <p className="text-sm text-muted-foreground">
                  30-day return policy for unworn items. Contact us at hello@sunsetpadel.at for
                  returns or exchanges.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
};

export default Merch;
