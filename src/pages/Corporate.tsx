import { Hero } from "@/components/Hero";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";
import corporateData from "../../data/corporate.json";
import padelHero from "@/assets/corporate_title.png";

const Corporate = () => {
  const hero = corporateData.hero;
  const packages = corporateData.packages?.packageCards ?? [];
  const photos = corporateData.photoSection?.photos ?? [];
  const faqItems = corporateData.faq?.items ?? [];
  const request = corporateData.requestSection;

  return (
    <div className="min-h-screen">
      <Hero
        title={hero.headline}
        subtitle={hero.subheadline}
        backgroundImage={hero.heroImage?.src ? hero.heroImage.src : padelHero}
        compact
      >
        <Button asChild size="lg">
          <a href={hero.primaryCta.href}>{hero.primaryCta.label}</a>
        </Button>
        <Button asChild variant="secondary" size="lg">
          <a href={hero.secondaryCta.href}>{hero.secondaryCta.label}</a>
        </Button>
      </Hero>

      <section className="container mx-auto px-4 py-12">
        {/* Social proof */}
        <div className="max-w-5xl mx-auto mb-16">
          <h2 className="text-3xl font-bold text-center mb-8">
            {corporateData.socialProof?.headline ?? "Why teams choose Sun Set Padel"}
          </h2>
          <div className="grid md:grid-cols-4 gap-6">
            {(corporateData.socialProof?.cards ?? []).map((c, i) => (
              <Card key={i}>
                <CardHeader>
                  <CardTitle className="text-lg">{c.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{c.text}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Photos */}
        <div className="max-w-6xl mx-auto mb-16">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold">{corporateData.photoSection?.headline ?? "What it looks like"}</h2>
            {corporateData.photoSection?.subheadline && (
              <p className="text-muted-foreground mt-2">{corporateData.photoSection.subheadline}</p>
            )}
          </div>

          {photos.length > 0 && (
            <div className="grid md:grid-cols-4 gap-4">
              {photos.map((p, i) => (
                <div key={i} className="rounded-lg overflow-hidden bg-muted/30 aspect-[4/3]">
                  {/* If you use <img>, this will work with public/ paths */}
                  <img
                    src={p.src}
                    alt={p.alt}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
              ))}
            </div>
          )}

          <div className="text-center mt-8">
            <Button asChild size="lg">
              <a href={corporateData.photoSection?.cta?.href ?? "#request"}>
                {corporateData.photoSection?.cta?.label ?? "Get a proposal"}
              </a>
            </Button>
          </div>
        </div>

        {/* Packages */}
        <div id="packages" className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-4">
            {corporateData.packages?.headline ?? "Corporate Packages"}
          </h2>
          {corporateData.packages?.subheadline && (
            <p className="text-center text-muted-foreground mb-10">
              {corporateData.packages.subheadline}
            </p>
          )}

          <div className="grid md:grid-cols-3 gap-6">
            {packages.map((pkg: any, index: number) => (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <CardTitle className="text-2xl">{pkg.name}</CardTitle>
                    {pkg.badge && <Badge>{pkg.badge}</Badge>}
                  </div>
                  {pkg.idealFor && (
                    <p className="text-sm text-muted-foreground mt-2">{pkg.idealFor}</p>
                  )}
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 mb-6">
                    {(pkg.highlights ?? []).map((bullet: string, i: number) => (
                      <li key={i} className="flex items-start gap-2">
                        <Check className="text-primary mt-1 flex-shrink-0" size={18} />
                        <span className="text-sm">{bullet}</span>
                      </li>
                    ))}
                  </ul>
                  {pkg.cta?.href && pkg.cta?.label && (
                    <Button asChild className="w-full">
                      <a href={pkg.cta.href}>{pkg.cta.label}</a>
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {corporateData.packages?.note && (
            <p className="text-center text-muted-foreground mt-8">
              {corporateData.packages.note}
            </p>
          )}
        </div>

        {/* Case study */}
        {corporateData.caseStudy && (
          <div className="max-w-5xl mx-auto mb-16">
            <Card>
              <CardHeader>
                <CardTitle>{corporateData.caseStudy.headline}</CardTitle>
                {corporateData.caseStudy.subheadline && (
                  <p className="text-muted-foreground mt-2">{corporateData.caseStudy.subheadline}</p>
                )}
              </CardHeader>
              <CardContent>
                {corporateData.caseStudy.image?.src && (
                  <div className="rounded-lg overflow-hidden bg-muted/30 mb-6 aspect-[16/9]">
                    <img
                      src={corporateData.caseStudy.image.src}
                      alt={corporateData.caseStudy.image.alt ?? "Corporate event"}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                )}
                <ul className="space-y-2">
                  {(corporateData.caseStudy.bullets ?? []).map((b: string, i: number) => (
                    <li key={i} className="text-sm">• {b}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        )}

        {/* FAQ */}
        {faqItems.length > 0 && (
          <div className="max-w-4xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-center mb-8">{corporateData.faq.headline}</h2>
            <div className="grid gap-4">
              {faqItems.map((it: any, i: number) => (
                <Card key={i}>
                  <CardHeader>
                    <CardTitle className="text-lg">{it.q}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{it.a}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Request section */}
        <div id="request" className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-3">{request.headline}</h2>
          {request.subheadline && (
            <p className="text-center text-muted-foreground mb-8">{request.subheadline}</p>
          )}

          <div className="bg-card rounded-lg p-4 shadow-card">
            <iframe
              src={request.briefFormEmbedUrl}
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

          {request.contactFallback?.email && (
            <p className="text-center text-sm text-muted-foreground mt-6">
              {request.contactFallback.text}{" "}
              <a className="underline" href={`mailto:${request.contactFallback.email}`}>
                {request.contactFallback.email}
              </a>
            </p>
          )}
        </div>
      </section>
    </div>
  );
};

export default Corporate;

