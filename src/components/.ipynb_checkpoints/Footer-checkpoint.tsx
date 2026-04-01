import { Link } from "react-router-dom";
import { Instagram, Send } from "lucide-react";
import siteData from "../../data/site.json";
import partnersData from "../../data/partners.json";

export const Footer = () => {
  const goldenSponsors = partnersData.filter((partner) => partner.category === "golden");
  const informationalPartners = partnersData.filter(
    (partner) => partner.category === "informational",
  );

  return (
    <footer className="bg-card border-t mt-16">
      <div className="container mx-auto px-4 py-12">
        {/* Partners Section */}
        <div className="mb-8 pb-8 border-b">
          <h3 className="text-sm font-semibold text-muted-foreground mb-3 text-center">
            GOLDEN SPONSORS
          </h3>
          <div className="flex flex-wrap items-center justify-center gap-8 mb-6">
            {goldenSponsors.map((partner) => (
              <a
                key={partner.name}
                href={partner.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                {partner.name}
              </a>
            ))}
          </div>

          <h3 className="text-sm font-semibold text-muted-foreground mb-3 text-center">
            INFORMATIONAL PARTNERS
          </h3>
          <div className="flex flex-wrap items-center justify-center gap-8">
            {informationalPartners.map((partner) => (
              <a
                key={partner.name}
                href={partner.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                {partner.name}
              </a>
            ))}
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Brand */}
          <div>
            <h3 className="text-lg font-bold text-primary mb-2">{siteData.brand}</h3>
            <p className="text-sm text-muted-foreground">{siteData.address}</p>
            <p className="text-sm text-muted-foreground mt-2">{siteData.email}</p>
          </div>

          {/* Social */}
          <div>
            <h4 className="font-semibold mb-3">Follow Us</h4>
            <div className="flex gap-4">
              <a
                href={siteData.social.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary transition-colors"
                aria-label="Instagram"
              >
                <Instagram size={24} />
              </a>
              <a
                href={siteData.social.telegram}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary transition-colors"
                aria-label="Telegram"
              >
                <Send size={24} />
              </a>
            </div>
          </div>

          {/* Legal Links */}
          <div>
            <h4 className="font-semibold mb-3">Legal</h4>
            <div className="flex flex-col gap-2 text-sm">
              <Link to="/legal/impressum" className="text-muted-foreground hover:text-foreground">
                Impressum
              </Link>
              <Link to="/legal/privacy" className="text-muted-foreground hover:text-foreground">
                Privacy Policy
              </Link>
              <Link to="/legal/terms" className="text-muted-foreground hover:text-foreground">
                Terms & Conditions
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} {siteData.brand}. All rights reserved.
        </div>
      </div>
    </footer>
  );
};