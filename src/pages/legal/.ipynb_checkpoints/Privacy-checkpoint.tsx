import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const Privacy = () => {
  return (
    <div className="container mx-auto px-4 py-16 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl">Privacy Policy (GDPR)</CardTitle>
        </CardHeader>

        <CardContent className="prose prose-sm max-w-none space-y-6">
          <section>
            <h2 className="text-xl font-semibold mb-2">Last updated</h2>
            <p className="text-muted-foreground">[Insert date]</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">1. General information</h2>
            <p className="text-muted-foreground">
              The protection of your personal data is important to us. This Privacy Policy explains
              how <strong>Sun Set Padel</strong>, operated as an Einzelunternehmen by{" "}
              <strong>Vladlen Bazaluk</strong>, processes personal data in accordance with the{" "}
              <strong>General Data Protection Regulation (GDPR)</strong>.
            </p>
            <p className="text-muted-foreground">
              <strong>Data controller:</strong> Sun Set Padel – Vladlen Bazaluk
              <br />
              Donau-City-Straße 12, 1220 Vienna, Austria
              <br />
              Email:{" "}
              <a className="text-primary hover:underline" href="mailto:hello@sunsetpadel.at">
                hello@sunsetpadel.at
              </a>
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">2. Personal data we process</h2>

            <h3 className="text-lg font-semibold mt-4 mb-2">2.1 Website access data</h3>
            <p className="text-muted-foreground">
              When visiting our website, technical data may be processed automatically, such as IP
              address, browser type and version, operating system, date and time of access, and
              referrer URL.
            </p>
            <p className="text-muted-foreground">
              <strong>Purpose:</strong> website security and technical functionality
              <br />
              <strong>Legal basis:</strong> Art. 6(1)(f) GDPR (legitimate interest)
            </p>

            <h3 className="text-lg font-semibold mt-4 mb-2">2.2 Contact inquiries</h3>
            <p className="text-muted-foreground">
              If you contact us via contact forms, email, or messaging services, we process your
              name, email address, phone number (if provided), and message content.
            </p>
            <p className="text-muted-foreground">
              <strong>Purpose:</strong> responding to inquiries and communication
              <br />
              <strong>Legal basis:</strong> Art. 6(1)(b) GDPR (pre-contractual measures)
            </p>

            <h3 className="text-lg font-semibold mt-4 mb-2">
              2.3 Event registrations &amp; memberships
            </h3>
            <p className="text-muted-foreground">
              When registering for events or purchasing memberships, we may process your name,
              email address, registration details, and payment confirmation.
            </p>
            <p className="text-muted-foreground">
              Payments are processed exclusively via external payment providers (e.g. Stripe,
              Mollie, SumUp). Sun Set Padel does not store payment card or banking data.
            </p>
            <p className="text-muted-foreground">
              <strong>Legal basis:</strong> Art. 6(1)(b) GDPR (contract performance)
            </p>

            <h3 className="text-lg font-semibold mt-4 mb-2">2.4 Photos &amp; videos at events</h3>
            <p className="text-muted-foreground">
              Photos and videos are always taken at Sun Set Padel events and may be used for the
              website, social media channels, and marketing materials.
            </p>
            <p className="text-muted-foreground">
              <strong>Legal basis:</strong> Art. 6(1)(a) GDPR (consent)
            </p>
            <p className="text-muted-foreground">
              Participants who do not wish to appear in photos or videos may object at any time by
              informing us on site or by email.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">3. Cookies</h2>
            <p className="text-muted-foreground">
              Our website may use technically necessary cookies to ensure proper functionality.
              Analytics or marketing cookies (if used) are only activated with user consent.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">4. Data recipients</h2>
            <p className="text-muted-foreground">Personal data may be shared with:</p>
            <ul>
              <li className="text-muted-foreground">Website hosting providers</li>
              <li className="text-muted-foreground">
                Form and communication tools (e.g. Google Forms)
              </li>
              <li className="text-muted-foreground">
                Payment providers (e.g. Stripe, Mollie, SumUp)
              </li>
            </ul>
            <p className="text-muted-foreground">
              All recipients process data in compliance with GDPR.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">5. Data retention</h2>
            <p className="text-muted-foreground">
              Personal data is stored only as long as necessary for the respective purpose or as
              required by statutory retention obligations.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">6. Your rights</h2>
            <p className="text-muted-foreground">You have the right to:</p>
            <ul>
              <li className="text-muted-foreground">Access (Art. 15 GDPR)</li>
              <li className="text-muted-foreground">Rectification (Art. 16 GDPR)</li>
              <li className="text-muted-foreground">Erasure (Art. 17 GDPR)</li>
              <li className="text-muted-foreground">Restriction of processing (Art. 18 GDPR)</li>
              <li className="text-muted-foreground">Data portability (Art. 20 GDPR)</li>
              <li className="text-muted-foreground">Objection (Art. 21 GDPR)</li>
            </ul>
            <p className="text-muted-foreground">
              To exercise your rights, contact{" "}
              <a className="text-primary hover:underline" href="mailto:hello@sunsetpadel.at">
                hello@sunsetpadel.at
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">7. Supervisory authority</h2>
            <p className="text-muted-foreground">
              You have the right to lodge a complaint with the Austrian Data Protection Authority:
            </p>
            <p className="text-muted-foreground">
              <a
                className="text-primary hover:underline"
                href="https://www.dsb.gv.at"
                target="_blank"
                rel="noopener noreferrer"
              >
                https://www.dsb.gv.at
              </a>
            </p>
          </section>
        </CardContent>
      </Card>
    </div>
  );
};

export default Privacy;
