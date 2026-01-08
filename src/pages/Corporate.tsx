 (cd "$(git rev-parse --show-toplevel)" && git apply --3way <<'EOF' 
diff --git a/src/pages/Corporate.tsx b/src/pages/Corporate.tsx
index 357fce54145ef59ced4323239d681dcf424a4c92..8313ba8663e4b01cd18c49b570c00970dacfc208 100644
--- a/src/pages/Corporate.tsx
+++ b/src/pages/Corporate.tsx
@@ -1,29 +1,32 @@
 import { Hero } from "@/components/Hero";
 import { Button } from "@/components/ui/button";
 import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
 import { Badge } from "@/components/ui/badge";
+import { Input } from "@/components/ui/input";
+import { Textarea } from "@/components/ui/textarea";
+import { Label } from "@/components/ui/label";
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
@@ -164,50 +167,123 @@ const Corporate = () => {
 
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
 
+        {/* Request form */}
+        <div id="request" className="max-w-5xl mx-auto mb-16">
+          <Card>
+            <CardHeader>
+              <CardTitle className="text-2xl">Request a corporate offer</CardTitle>
+              <p className="text-muted-foreground mt-2">
+                Share a few details and we’ll respond with a tailored proposal within 24 hours.
+              </p>
+            </CardHeader>
+            <CardContent>
+              <form
+                name="corporate-request"
+                method="POST"
+                data-netlify="true"
+                netlify-honeypot="bot-field"
+                className="space-y-6"
+              >
+                <input type="hidden" name="form-name" value="corporate-request" />
+                <div className="hidden">
+                  <Label htmlFor="bot-field">Don’t fill this out if you’re human</Label>
+                  <Input id="bot-field" name="bot-field" />
+                </div>
+
+                <div className="grid gap-6 md:grid-cols-2">
+                  <div className="space-y-2">
+                    <Label htmlFor="name">Full name</Label>
+                    <Input id="name" name="name" placeholder="Your name" required />
+                  </div>
+                  <div className="space-y-2">
+                    <Label htmlFor="company">Company</Label>
+                    <Input id="company" name="company" placeholder="Company name" required />
+                  </div>
+                  <div className="space-y-2">
+                    <Label htmlFor="email">Work email</Label>
+                    <Input id="email" name="email" type="email" placeholder="you@company.com" required />
+                  </div>
+                  <div className="space-y-2">
+                    <Label htmlFor="phone">Phone</Label>
+                    <Input id="phone" name="phone" type="tel" placeholder="+43 660 123 4567" />
+                  </div>
+                  <div className="space-y-2">
+                    <Label htmlFor="team-size">Estimated group size</Label>
+                    <Input id="team-size" name="teamSize" placeholder="e.g. 20–40 people" />
+                  </div>
+                  <div className="space-y-2">
+                    <Label htmlFor="date">Preferred dates</Label>
+                    <Input id="date" name="preferredDates" placeholder="e.g. 15–30 May" />
+                  </div>
+                </div>
+
+                <div className="space-y-2">
+                  <Label htmlFor="goals">Event goals & add-ons</Label>
+                  <Textarea
+                    id="goals"
+                    name="goals"
+                    placeholder="Tell us about your goals, add-ons, or anything else we should plan for."
+                    rows={5}
+                  />
+                </div>
+
+                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
+                  <p className="text-sm text-muted-foreground">
+                    By submitting, you agree to be contacted about your corporate event inquiry.
+                  </p>
+                  <Button type="submit" size="lg">
+                    Send request
+                  </Button>
+                </div>
+              </form>
+            </CardContent>
+          </Card>
+        </div>
+
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
 
 
EOF
)