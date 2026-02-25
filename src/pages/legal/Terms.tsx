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
                Memberships (6-month and 12-month plans) are prepaid and valid only for the specified duration
                and conditions described at the time of purchase.
              </li>
            </ul>
          </section>

          {/* UPDATED + EXPANDED MEMBERSHIP SECTION */}
          <section>
            <h2 className="text-xl font-semibold mb-2">4. Membership (6-month &amp; 12-month plans)</h2>

            <p className="text-muted-foreground">
              Sun Set Padel offers paid Membership plans with a validity of either <strong>6 months</strong> or{" "}
              <strong>12 months</strong> from the date of purchase.
            </p>

            <h3 className="text-lg font-semibold mt-4 mb-2">4.1 Nature of membership</h3>
            <p className="text-muted-foreground">
              Membership is a prepaid access model that provides specific benefits for the chosen validity
              period. It does not constitute a club share, partnership, or ownership right.
            </p>

            <h3 className="text-lg font-semibold mt-4 mb-2">4.2 Benefits</h3>
            <p className="text-muted-foreground">
              Depending on the selected membership tier, benefits may include:
            </p>
            <ul>
              <li className="text-muted-foreground">
                Early access to event registration (at least 24 hours before public release)
              </li>
              <li className="text-muted-foreground">
                A fixed per-game discount (e.g. EUR 3 or EUR 4 per participation, depending on plan)
              </li>
              <li className="text-muted-foreground">Priority waitlist handling</li>
              <li className="text-muted-foreground">Access to members-only events</li>
              <li className="text-muted-foreground">
                Free participation in selected quarterly tournaments (if included in the purchased plan)
              </li>
            </ul>
            <p className="text-muted-foreground">
              The exact benefits applicable are those displayed at the time of purchase.
            </p>

            <h3 className="text-lg font-semibold mt-4 mb-2">4.3 No guaranteed event spot</h3>
            <p className="text-muted-foreground">
              Early access does not guarantee participation in any specific event. All event participation remains
              subject to available capacity.
            </p>
            <p className="text-muted-foreground">
              Sun Set Padel reserves the right to allocate a portion of event spots for open players to ensure
              sustainable community growth.
            </p>

            <h3 className="text-lg font-semibold mt-4 mb-2">4.4 Personal use</h3>
            <p className="text-muted-foreground">
              Memberships are strictly personal and non-transferable. Early-access registration links may only be
              used by the member. Registering third parties or sharing early-access links is prohibited.
            </p>
            <p className="text-muted-foreground">
              Misuse may result in immediate termination of membership without refund.
            </p>

            <h3 className="text-lg font-semibold mt-4 mb-2">4.5 Validity</h3>
            <ul>
              <li className="text-muted-foreground">6-month plan: valid for 6 months from purchase date</li>
              <li className="text-muted-foreground">12-month plan: valid for 12 months from purchase date</li>
            </ul>
            <p className="text-muted-foreground">
              Membership automatically expires at the end of the validity period unless renewed.
            </p>

            <h3 className="text-lg font-semibold mt-4 mb-2">4.6 Cancellation &amp; withdrawal</h3>
            <p className="text-muted-foreground">
              Consumers purchasing online are entitled to a 14-day statutory right of withdrawal under Austrian/EU
              consumer law, provided that no membership benefits have been used.
            </p>
            <p className="text-muted-foreground">Membership is considered used if:</p>
            <ul>
              <li className="text-muted-foreground">
                a discounted participation has been applied, or
              </li>
              <li className="text-muted-foreground">
                an early-access registration link has been sent.
              </li>
            </ul>
            <p className="text-muted-foreground">
              After first use or expiry of the 14-day withdrawal period (whichever occurs first), membership fees
              are non-refundable.
            </p>
            <p className="text-muted-foreground">
              Refund requests must be submitted in writing via email.
            </p>

            <h3 className="text-lg font-semibold mt-4 mb-2">4.7 Discontinuation of events</h3>
            <p className="text-muted-foreground">
              If Sun Set Padel permanently discontinues organizing events available to members during the membership
              validity period, a pro-rata refund will be issued based on the remaining full months.
            </p>
            <p className="text-muted-foreground">
              Temporary cancellations, scheduling changes, or capacity limitations do not constitute discontinuation.
            </p>
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
              <li className="text-muted-foreground">
                The existence of a membership does not entitle the member to refunds for individual event
                cancellations or fully booked events.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">6. Liability</h2>
            <p className="text-muted-foreground">
              Participation in events is at the participant’s own risk. Sun Set Padel is not liable for injuries,
              accidents, or loss of personal belongings, except in cases of gross negligence or intent. Facilities
              and venues are used at participants’ own responsibility.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">7. Photos &amp; media rights</h2>
            <p className="text-muted-foreground">
              Photos and videos are taken at Sun Set Padel events and may be used for promotional purposes
              (website, social media, marketing materials), unless a participant objects explicitly in writing or
              informs us on site.
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
              These Terms &amp; Conditions are governed by the laws of Austria, excluding conflict-of-law rules.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">10. Severability clause</h2>
            <p className="text-muted-foreground">
              If individual provisions of these Terms are invalid, the validity of the remaining provisions
              remains unaffected.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">Contact</h2>
            <p className="text-muted-foreground">
              For questions regarding these Terms, please contact{" "}
              <a className="text-primary hover:underline" href="mailto:sunsetpadelvienna@gmail.com">
                sunsetpadelvienna@gmail.com
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