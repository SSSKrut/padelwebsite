import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const Impressum = () => {
  return (
    <div className="container mx-auto px-4 py-16 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl">Impressum</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none space-y-4">
          <section>
            <h2 className="text-xl font-semibold mb-2">Information according to § 5 TMG</h2>
            <p>Sun Set Padel</p>
            <p>Vienna, Austria</p>
            <p>Email: hello@sunsetpadel.at</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">Responsible for content</h2>
            <p>Sun Set Padel Team</p>
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
