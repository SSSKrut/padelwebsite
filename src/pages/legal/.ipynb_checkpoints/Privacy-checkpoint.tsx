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

            <h3 className="text-lg font-semibold mt-4 mb-2">2.4 Photos &am
