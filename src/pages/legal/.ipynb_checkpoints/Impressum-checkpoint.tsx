import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const Impressum = () => {
  return (
    <div className="container mx-auto px-4 py-16 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl">Impressum</CardTitle>
        </CardHeader>

        <CardContent className="prose prose-sm max-w-none space-y-6">
          <section>
            <h2 className="text-xl font-semibold mb-2">Legal information (Austria)</h2>
            <p>
              <strong>Sun Set Padel</strong> — Padel community &amp; event organisation
            </p>
            <p>
              <strong>Operator (Einzelunternehmen):</strong> Vladlen Bazaluk
            </p>
            <p>
              <strong>Business address:</strong> Donau-City-Straße 12, 1220 Vienna, Austria
            </p>
            <p>
              <strong>Email:</strong>{" "}
              <a className="text-primary hover:underline" href="mailto:hello@sunsetpadel.at">
                hello@sunsetpadel.at
              </a>
            </p>
            <p>
              <strong>Business purpose:</strong> Organisation of padel sports events and community
              activities, corporate padel tournaments, sale of memberships and merchandise.
            </p>
            <p>
              <strong>VAT ID (UID):</strong> Not available
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">Responsible for content</h2>
            <p>Vladlen Bazaluk</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">Online dispute resolution (ODR)</h2>
            <p>
              Consumers may submit complaints via the EU online dispute resolution platform:{" "}
              <a
                className="text-primary hover:underline"
                href="https://ec.europa.eu/consumers/odr"
                target="_blank"
                rel="noopener noreferrer"
              >
                https://ec.europa.eu/consumers/odr
              </a>
            </p>
            <p>
              Sun Set Padel is not obliged and does not participate in dispute resolution proceedings
              before a consumer arbitration board.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">Disclaimer</h2>
            <p className="text-muted-foreground">
              Despite careful content control, we assume no liability for the content of external
              links. The operators of the linked pages are solely responsible for their content.
            </p>
          </section>
        </CardContent>
      </Card>
    </div>
  );
};

export default Impressum;
