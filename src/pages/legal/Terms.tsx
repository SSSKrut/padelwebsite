import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const Terms = () => {
  return (
    <div className="container mx-auto px-4 py-16 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl">Terms & Conditions</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none space-y-4">
          <section>
            <h2 className="text-xl font-semibold mb-2">General Terms</h2>
            <p className="text-muted-foreground">
              By using our services and participating in our events, you agree to these terms and
              conditions.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">Event Registration</h2>
            <p className="text-muted-foreground">
              Registration for events is binding. Cancellations must be made at least 24 hours in
              advance for a full refund. Late cancellations may incur a fee.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">Liability</h2>
            <p className="text-muted-foreground">
              Participation in padel events is at your own risk. Sun Set Padel is not liable for
              injuries or accidents during events. We recommend appropriate sports insurance.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">Code of Conduct</h2>
            <p className="text-muted-foreground">
              We expect all participants to behave respectfully and sportingly. Unsportsmanlike
              conduct may result in exclusion from events.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">Memberships</h2>
            <p className="text-muted-foreground">
              Memberships are monthly subscriptions that can be canceled at any time with 30 days'
              notice. Benefits apply from the month of purchase.
            </p>
          </section>
        </CardContent>
      </Card>
    </div>
  );
};

export default Terms;
