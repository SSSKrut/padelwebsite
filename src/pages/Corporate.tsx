import { Hero } from "@/components/Hero";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";
import corporateData from "../../data/corporate.json";
import corporateTitleImage from "@/assets/corporate_title.png";

type CorporateJson = typeof corporateData;

type PackageCard = {
  name: string;
  badge?: string;
  idealFor?: string;
  highlights?: string[];
  cta?: { label?: string; href?: string };
};

const Corporate = () => {
  const data = corporateData as CorporateJson;

  const hero = data.hero;
  const packages: PackageCard[] = (data.packages?.packageCards ?? []) as PackageCard[];
  const photos = data.photoSection?.photos ?? [];
  const faqItems = data.faq?.items ?? [];

  // If useLocalTitleImage is true, always use the imported local image.
  // Otherwise use hero.heroImage.src (public path) and fallback to local.
  const useLocalTitleImage = (hero as any)?.useLocalTitleImage === true;

  const heroBg: string = useLocalTitleImage
    ? String(corporateTitleImage)
    : String((hero as any)?.heroImage?.src ?? corporateTitleImage);

  return (
    <div className="min-h-screen">
      <Hero
        title={hero.headline}
        subtitle={hero.subheadline}
        backgroundImage={heroBg}
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
            {data.socialProof?.headline ?? "Why teams choose Sun Set Padel"}
          </h2>

          <div className="grid md:grid-cols-4 gap-6">
            {(data.socialProof?.cards ?? []).map((c, i) => (
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
            <h2 className="text-3xl font-bold">
              {data.photoSection?.headline ?? "What it looks like"}
            </h2>
            {data.photoSection?.subheadline && (
              <p className="text-muted-foreground mt-2">{data.photoSection.subheadline}</p>
            )}
          </div>

          {photos.length > 0 && (
            <div className="grid md:grid-cols-4 gap-4">
              {photos.map((p, i) => (
                <div key={i} className="rounded-lg overflow-hidden bg-muted/30 aspect-[4/3]">
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
              <a href={data.photoSection?.cta?.href ?? "#packages"}>
                {data.photoSection?.cta?.label ?? "See packages"}
              </a>
            </Button>
          </div>
        </div>

        {/* Packages */}
        <div id="packages" className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-4">
            {data.packages?.headline ?? "Corporate Packages"}
          </h2>
          {data.packages?.subheadline && (
            <p className="text-center text-muted-foreground mb-10">{data.packages.subheadline}</p>
          )}

          <div className="grid md:grid-cols-3 gap-6">
            {packages.map((pkg, index) => (
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
                    {(pkg.highlights ?? []).map((bullet, i) => (
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

          {data.packages?.note && (
            <p className="text-center text-muted-foreground mt-8">{data.packages.note}</p>
          )}
        </div>

        {/* Case study */}
        {data.caseStudy && (
          <div className="max-w-5xl mx-auto mb-16">
            <Card>
              <CardHeader>
                <CardTitle>{data.caseStudy.headline}</CardTitle>
                {data.caseStudy.subheadline && (
                  <p className="text-muted-foreground mt-2">{data.caseStudy.subheadline}</p>
                )}
              </CardHeader>

              <CardContent>
                {data.caseStudy.image?.src && (
                  <div className="rounded-lg overflow-hidden bg-muted/30 mb-6 aspect-[16/9]">
                    <img
                      src={data.caseStudy.image.src}
                      alt={data.caseStudy.image.alt ?? "Corporate event"}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                )}

                <ul className="space-y-2">
                  {(data.caseStudy.bullets ?? []).map((b, i) => (
                    <li key={i} className="text-sm">
                      • {b}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        )}

        {/* FAQ */}
        {faqItems.length > 0 && (
          <div className="max-w-4xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-center mb-8">
              {data.faq?.headline ?? "FAQ"}
            </h2>
            <div className="grid gap-4">
              {faqItems.map((it, i) => (
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
      </section>
    </div>
  );
};

export default Corporate;
