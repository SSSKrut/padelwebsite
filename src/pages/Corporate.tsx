import { useState, type FormEvent } from "react";
import { Hero } from "@/components/Hero";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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

type FormStatus = "idle" | "loading" | "success" | "error";

const Corporate = () => {
  const data = corporateData as CorporateJson;
  const [formStatus, setFormStatus] = useState<FormStatus>("idle");
  const [formMessage, setFormMessage] = useState<string>("");

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

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormStatus("loading");
    setFormMessage("");

    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") ?? "").trim();
    const company = String(formData.get("company") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const phone = String(formData.get("phone") ?? "").trim();
    const teamSize = String(formData.get("teamSize") ?? "").trim();
    const preferredDates = String(formData.get("preferredDates") ?? "").trim();
    const goals = String(formData.get("goals") ?? "").trim();

    // Basic client-side validation (keeps function logs clean)
    if (!name || !company || !email) {
      setFormStatus("error");
      setFormMessage("Please fill in your name, company, and email.");
      return;
    }

    const messageLines = [
      `Company: ${company || "-"}`,
      `Group size: ${teamSize || "-"}`,
      `Preferred dates: ${preferredDates || "-"}`,
      "",
      "Goals & add-ons:",
      goals || "-",
    ];

    try {
      const response = await fetch("/.netlify/functions/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          phone,
          subject: "Corporate event request",
          message: messageLines.join("\n"),
        }),
      });

      // Read response body once (works for both JSON and text)
      const raw = await response.text();

      if (!response.ok) {
        // Helpful debugging in DevTools + show a more actionable UI message
        // eslint-disable-next-line no-console
        console.error("Contact form error:", response.status, raw);
        throw new Error(`HTTP ${response.status}: ${raw}`);
      }

      // If your function returns JSON, you can optionally parse it:
      // const data = raw ? JSON.parse(raw) : null;

      setFormStatus("success");
      setFormMessage("Thanks! We’ll be in touch within 24 hours.");
      event.currentTarget.reset();
    } catch (error: any) {
      // eslint-disable-next-line no-console
      console.error("Contact form submit failed:", error);

      setFormStatus("error");
      // Keep user-facing message friendly; details are in console/network
      setFormMessage(
        "Something went wrong. Please email us at sunsetpadelvienna@gmail.com."
      );
    }
  };

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
              <p className="text-muted-foreground mt-2">
                {data.photoSection.subheadline}
              </p>
            )}
          </div>

          {photos.length > 0 && (
            <div className="grid md:grid-cols-4 gap-4">
              {photos.map((p, i) => (
                <div
                  key={i}
                  className="rounded-lg overflow-hidden bg-muted/30 aspect-[4/3]"
                >
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
            <p className="text-center text-muted-foreground mb-10">
              {data.packages.subheadline}
            </p>
          )}

          <div className="grid md:grid-cols-3 gap-6">
            {packages.map((pkg, index) => (
              <Card
                key={index}
                className="hover:shadow-lg transition-shadow"
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <CardTitle className="text-2xl">{pkg.name}</CardTitle>
                    {pkg.badge && <Badge>{pkg.badge}</Badge>}
                  </div>
                  {pkg.idealFor && (
                    <p className="text-sm text-muted-foreground mt-2">
                      {pkg.idealFor}
                    </p>
                  )}
                </CardHeader>

                <CardContent>
                  <ul className="space-y-3 mb-6">
                    {(pkg.highlights ?? []).map((bullet, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <Check
                          className="text-primary mt-1 flex-shrink-0"
                          size={18}
                        />
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
            <p className="text-center text-muted-foreground mt-8">
              {data.packages.note}
            </p>
          )}
        </div>

        {/* Case study */}
        {data.caseStudy && (
          <div className="max-w-5xl mx-auto mb-16">
            <Card>
              <CardHeader>
                <CardTitle>{data.caseStudy.headline}</CardTitle>
                {data.caseStudy.subheadline && (
                  <p className="text-muted-foreground mt-2">
                    {data.caseStudy.subheadline}
                  </p>
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

        {/* Request form */}
        <div id="request" className="max-w-5xl mx-auto mb-16">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Request a corporate offer</CardTitle>
              <p className="text-muted-foreground mt-2">
                Share a few details and we’ll respond with a tailored proposal within 24 hours.
              </p>
            </CardHeader>
            <CardContent>
              <form className="space-y-6" onSubmit={handleSubmit}>
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full name</Label>
                    <Input id="name" name="name" placeholder="Your name" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company">Company</Label>
                    <Input id="company" name="company" placeholder="Company name" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Work email</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="you@company.com"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input id="phone" name="phone" type="tel" placeholder="+43 660 123 4567" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="team-size">Estimated group size</Label>
                    <Input id="team-size" name="teamSize" placeholder="e.g. 20–40 people" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="date">Preferred dates</Label>
                    <Input id="date" name="preferredDates" placeholder="e.g. 15–30 May" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="goals">Event goals & add-ons</Label>
                  <Textarea
                    id="goals"
                    name="goals"
                    placeholder="Tell us about your goals, add-ons, or anything else we should plan for."
                    rows={5}
                  />
                </div>

                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <p className="text-sm text-muted-foreground">
                    By submitting, you agree to be contacted about your corporate event inquiry.
                  </p>
                  <Button type="submit" size="lg" disabled={formStatus === "loading"}>
                    {formStatus === "loading" ? "Sending..." : "Send request"}
                  </Button>
                </div>

                {formMessage && (
                  <p
                    className={`text-sm ${
                      formStatus === "success" ? "text-emerald-600" : "text-destructive"
                    }`}
                  >
                    {formMessage}
                  </p>
                )}
              </form>
            </CardContent>
          </Card>
        </div>

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
