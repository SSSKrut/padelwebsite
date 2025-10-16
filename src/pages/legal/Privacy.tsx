import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const Privacy = () => {
  return (
    <div className="container mx-auto px-4 py-16 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl">Privacy Policy</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none space-y-4">
          <section>
            <h2 className="text-xl font-semibold mb-2">Data Protection</h2>
            <p className="text-muted-foreground">
              We take the protection of your personal data very seriously. We treat your personal
              data confidentially and in accordance with statutory data protection regulations and
              this privacy policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">Collection of Data</h2>
            <p className="text-muted-foreground">
              When you register for our events or contact us via forms, we collect personal data
              such as name, email address, and contact details. This data is used solely for the
              purpose of organizing events and communicating with you.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">Cookies</h2>
            <p className="text-muted-foreground">
              Our website may use cookies to improve user experience. You can disable cookies in
              your browser settings.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">Your Rights</h2>
            <p className="text-muted-foreground">
              You have the right to access, correct, or delete your personal data. Please contact
              us at hello@sunsetpadel.at for any data protection inquiries.
            </p>
          </section>
        </CardContent>
      </Card>
    </div>
  );
};

export default Privacy;
