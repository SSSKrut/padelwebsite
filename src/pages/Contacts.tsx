import { Hero } from "@/components/Hero";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Phone, Instagram, Send, MapPin } from "lucide-react";
import contactsData from "../../data/contacts.json";
import padelHero from "@/assets/padel-hero.jpg";

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
                @sunsetpadel
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

        {/* Maps */}
        <h2 className="text-3xl font-bold text-center mb-12">Our Venues</h2>
        <div className="grid md:grid-cols-2 gap-8 mb-16">
          {contactsData.maps.map((location, index) => (
            <Card key={index}>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <MapPin className="text-primary" size={24} />
                  <CardTitle>{location.name}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="aspect-video rounded-lg overflow-hidden">
                  <iframe
                    src={location.embed}
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Contact Form */}
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-8">Send Us a Message</h2>
          <div className="bg-card rounded-lg p-4 shadow-card">
            <iframe
              src={contactsData.contactFormEmbedUrl}
              width="100%"
              height="800"
              frameBorder="0"
              marginHeight={0}
              marginWidth={0}
              className="rounded"
            >
              Loading…
            </iframe>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Contacts;
