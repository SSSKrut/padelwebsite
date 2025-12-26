import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const Terms = () => {
  return (
    <div className="container mx-auto px-4 py-16 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl">Terms &amp; Conditions</CardTitle>
        </CardHeader>

        <CardContent className="prose prose-sm max-w-none space-y-6">
          <section>
            <h2 className="text-xl font-semibold mb-2">1. Scope of application</h2>
            <p className="text-muted-foreground">
              These Terms &amp; Conditions apply to all services offered by <strong>Sun Set Padel</strong>,
              operated as an Einzelunternehmen by <strong>Vladlen Bazaluk</strong>, including padel events
              and community games, corporate tournaments, memberships/passes, and merchandise sales.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">2. Participation &amp; registration</h2>
            <ul>
              <li className="text-muted-foreground">
                Event registration becomes binding once confirmed.
              </li>
              <li className="text-muted-foreground">
                Participation requires adequate physical and health condition.
              </li>
              <li className="text-muted-foreground">
                All participants play at their own risk.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">3. Payments</h2>
            <ul>
              <li className="text-muted-foreground">All prices are stated in euros (€).</li>
              <li className="text-muted-foreground">
                Payments are processed via third-party payment providers.
              </li>
              <li className="text-muted-foreground">
                Memberships and passes are valid only for the specified period/conditions.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">
              4. Membership cancellation &amp; refund policy
            </h2>
            <ul>
              <li className="text-muted-foreground">
                Memberships may be cancelled within <strong>1 month</strong> of purchase, provided they
                have <strong>not been used</strong> (no event participation or benefits redeemed).
              </li>
              <li className="text-muted-foreground">
                Once a membership has been used, refunds are excluded.
              </li>
              <li className="text-muted-foreground">
                Refund requests must be submitted in writing via email.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">5. Event cancellations &amp; refunds</h2>
            <ul>
              <li className="text-muted-foreground">
                Event participation fees are generally non-refundable.
              </li>
              <li className="text-muted-foreground">
                Replacement by another participant may be allowed upon request.
              </li>
              <li className="text-muted-foreground">
                If an event is cancelled by Sun Set Padel, fees will be refunded or credited.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">6. Liability</h2>
            <p className="text-muted-foreground">
              Participation in events is at the participant’s own risk. Sun Set Padel is not liable for
              injuries, accidents, or loss of personal belongings, except in cases of gross negligence
              or intent. Facilities and venues are used at participants’ own responsibility.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">7. Photos &amp; media rights</h2>
            <p className="text-muted-foreground">
              Photos and videos are taken at Sun Set Padel events and may be used for promotional
              purposes (website, social media, marketing materials), unless a participant objects
              explicitly in writing or informs us on site.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">8. Merchandise</h2>
            <ul>
              <li className="text-muted-foreground">Merchandise is sold as described.</li>
              <li className="text-muted-foreground">
                Minor deviations in color or design may occur.
              </li>
              <li className="text-muted-foreground">Statutory warranty rights apply.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">9. Governing law</h2>
            <p className="text-muted-foreground">
              These Terms &amp; Conditions are governed by the laws of Austria, excluding conflict-of-law
              rules.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">10. Severability clause</h2>
            <p className="text-muted-foreground">
              If individual provisions of these Terms are invalid, the validity of the remaining
              provisions remains unaffected.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">Contact</h2>
            <p className="text-muted-foreground">
              For questions regarding these Terms, please contact{" "}
              <a className="text-primary hover:underline" href="mailto:hello@sunsetpadel.at">
                hello@sunsetpadel.at
              </a>
              .
            </p>
          </section>
        </CardContent>
      </Card>
    </div>
  );
};

export default Terms;
