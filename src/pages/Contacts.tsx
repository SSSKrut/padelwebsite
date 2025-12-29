import { Hero } from "@/components/Hero";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Phone, Instagram, Send } from "lucide-react";
import contactsData from "../../data/contacts.json";
import padelHero from "@/assets/contact_title.png";

const Contacts = () => {
  return (
    <div className="min-h-screen">
      <Hero
        title="Get in Touch"
        subtitle="We'd love to hear from you"
        backgroundImage={padelHero}
        compact
      />

      <section className="container mx-auto px-4 py-12">
        {/* Contact Info */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          <Card>
            <CardHeader>
              <Mail className="text-primary mb-2" size={32} />
              <CardTitle className="text-lg">Email</CardTitle>
            </CardHeader>
            <CardContent>
              <a
                href={`mailto:${contactsData.email}`}
                className="text-sm text-primary hover:underline"
              >
                {contactsData.email}
              </a>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Phone className="text-primary mb-2" size={32} />
              <CardTitle className="text-lg">WhatsApp</CardTitle>
            </CardHeader>
            <CardContent>
              <a
                href={contactsData.whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline"
              >
                Message us
              </a>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Instagram className="text-primary mb-2" size={32} />
              <CardTitle className="text-lg">Instagram</CardTitle>
            </CardHeader>
            <CardContent>
              <a
                href={contactsData.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline"
              >
                @sunset_padel_vienna
              </a>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Send className="text-primary mb-2" size={32} />
              <CardTitle className="text-lg">Telegram</CardTitle>
            </CardHeader>
            <CardContent>
              <a
                href={contactsData.telegram}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline"
              >
                Join group
              </a>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
};

export default Contacts;
