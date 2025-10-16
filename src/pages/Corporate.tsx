import { Hero } from "@/components/Hero";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check } from "lucide-react";
import corporateData from "../../data/corporate.json";
import padelHero from "@/assets/padel-hero.jpg";

const Corporate = () => {
  return (
    <div className="min-h-screen">
      <Hero
        title="Corporate Tournaments"
        subtitle={corporateData.hero}
        backgroundImage={padelHero}
        compact
      />

      <section className="container mx-auto px-4 py-12">
        {/* Packages */}
        <h2 className="text-3xl font-bold text-center mb-12">Our Packages</h2>
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          {corporateData.packages.map((pkg, index) => (
            <Card key={index} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="text-2xl">{pkg.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {pkg.bullets.map((bullet, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Check className="text-primary mt-1 flex-shrink-0" size={18} />
                      <span className="text-sm">{bullet}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Case Study */}
        <div className="max-w-3xl mx-auto mb-16">
          <Card>
            <CardHeader>
              <CardTitle>Recent Success Story</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                We recently organized a tournament for a tech company with 24 participants. The
                event included court branding, professional photography, catering, and an awards
                ceremony. Feedback was exceptional — 95% would recommend us for corporate events.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Form Embed */}
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-8">Request a Quote</h2>
          <div className="bg-card rounded-lg p-4 shadow-card">
            <iframe
              src={corporateData.briefFormEmbedUrl}
              width="100%"
              height="800"
              frameBorder="0"
              marginHeight={0}
              marginWidth={0}
              className="rounded"
            >
              Loading…
            </iframe>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Corporate;
