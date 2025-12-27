import { useState } from "react";
import { Hero } from "@/components/Hero";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Phone, Instagram, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import contactsData from "../../data/contacts.json";
import padelHero from "@/assets/contact_title.png";

type FormState = "idle" | "sending" | "success" | "error";

const Contacts = () => {
  const [state, setState] = useState<FormState>("idle");
  const [errorMsg, setErrorMsg] = useState<string>("");

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
    company: "", // honeypot (should stay empty)
  });

  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    // Honeypot spam check
    if (form.company.trim().length > 0) {
      // Pretend success to avoid tipping off bots
      setState("success");
      return;
    }

    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      setState("error");
      setErrorMsg("Please fill in at least Name, Email, and Message.");
      return;
    }

    setState("sending");

    try {
      const res = await fetch("/.netlify/functions/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          subject: form.subject.trim(),
          message: form.message.trim(),
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setState("error");
        setErrorMsg(data?.error || "Something went wrong. Please try again.");
        return;
      }

      setState("success");
      setForm({
        name: "",
        email: "",
        phone: "",
        subject: "",
        message: "",
        company: "",
      });
    } catch (err) {
      setState("error");
      setErrorMsg("Network error. Please try again.");
    }
  };

  return (
    <div className="min-h-screen">
      <Hero title="Get in Touch" subtitle="We'd love to hear from you" backgroundImage={padelHero} compact />

      <section className="container mx-auto px-4 py-12">
        {/* Contact Info */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          <Card>
            <CardHeader>
              <Mail className="text-primary mb-2" size={32} />
              <CardTitle className="text-lg">Email</CardTitle>
            </CardHeader>
            <CardContent>
              <a href={`mailto:${contactsData.email}`} className="text-sm text-primary hover:underline">
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

        {/* Contact Form */}
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-8">Send Us a Message</h2>

          <Card className="shadow-card">
            <CardContent className="p-6">
              {state === "success" ? (
                <div className="text-center space-y-2">
                  <p className="text-lg font-semibold">Message sent.</p>
                  <p className="text-muted-foreground">
                    Thanks — we’ll get back to you as soon as possible.
                  </p>
                  <Button onClick={() => setState("idle")} className="mt-4">
                    Send another message
                  </Button>
                </div>
              ) : (
                <form onSubmit={onSubmit} className="space-y-4">
                  {/* Honeypot (hidden field) */}
                  <input
                    type="text"
                    name="company"
                    value={form.company}
                    onChange={onChange}
                    className="hidden"
                    tabIndex={-1}
                    autoComplete="off"
                  />

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Name *</label>
                      <input
                        name="name"
                        value={form.name}
                        onChange={onChange}
                        className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                        placeholder="Your name"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Email *</label>
                      <input
                        type="email"
                        name="email"
                        value={form.email}
                        onChange={onChange}
                        className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                        placeholder="you@example.com"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Phone (optional)</label>
                      <input
                        name="phone"
                        value={form.phone}
                        onChange={onChange}
                        className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                        placeholder="+43 ..."
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Subject (optional)</label>
                      <input
                        name="subject"
                        value={form.subject}
                        onChange={onChange}
                        className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                        placeholder="Corporate event / Membership / Other"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Message *</label>
                    <textarea
                      name="message"
                      value={form.message}
                      onChange={onChange}
                      className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                      placeholder="Tell us what you need (date, group size, level, etc.)"
                      rows={6}
                      required
                    />
                  </div>

                  {state === "error" && (
                    <p className="text-sm text-destructive">{errorMsg}</p>
                  )}

                  <Button type="submit" className="w-full" size="lg" disabled={state === "sending"}>
                    {state === "sending" ? "Sending..." : "Send message"}
                  </Button>

                  <p className="text-xs text-muted-foreground">
                    By submitting, you agree that we process your data to respond to your request.
                  </p>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
};

export default Contacts;
