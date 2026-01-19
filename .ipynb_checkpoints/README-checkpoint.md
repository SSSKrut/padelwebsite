# Sun Set Padel Vienna - Website

A no-code friendly website for Sun Set Padel community in Vienna.

## How to Edit Content

All website content is managed through JSON files in the `/data` folder. **No coding required!**

### Content Files

#### `/data/site.json`
- **Brand name** and tagline
- **Primary CTA** button text and link
- **Contact** email and social media links
- **Address**

#### `/data/events.json`
Array of upcoming events with:
- Event title, date, time
- Venue and skill level
- Price and registration link
- Description

#### `/data/products.json`
Memberships and add-on products:
- Product name and type (membership/addon)
- Price and description
- External buy link (Stripe/Mollie)

#### `/data/merch.json`
Merchandise items:
- Product name and price
- Available sizes
- Image path and buy link
- Description

#### `/data/gallery.json`
Photo gallery content:
- Google Photos album links
- Individual images with captions

#### `/data/partners.json`
Partner organizations:
- Partner name and website
- Logo image path

#### `/data/corporate.json`
Corporate tournament packages:
- Hero text
- Package details (name and features)
- Google Form embed URL for inquiries

#### `/data/contacts.json`
Contact information:
- Email, WhatsApp, Instagram, Telegram
- Google Maps embeds for venues
- Contact form embed URL

#### `/data/players.json`
Player celebration board:
- Ranking position and player name
- Weekly achievements list
- Rating points and weekly rating change

### Updating Player Rankings from Excel

The simplest workflow is to export your Excel sheet to CSV and run the helper script:

1. In Excel, save your sheet as **CSV (Comma delimited)**. The converter looks for:
   - **Name** (required)
   - **Total points** (required; used for rating points)
   - **Latest change** (required; weekly rating delta)
   - **Rank** (optional; if missing, rank is calculated from total points)
   - **Achievements** (optional; semicolon-separated)
2. Keep any other columns you need (e.g., `ID`, `ELO_coeff`, weekly date columns). They are ignored by the converter.
3. Save the file as `data/players.csv` (or any filename you prefer).
4. Run the conversion script:

```bash
python scripts/players_from_csv.py data/players.csv data/players.json
```

You can use `data/players.csv` as a template for the correct format (including extra weekly columns).

#### Adding Achievements Manually

If you want to keep achievements separate from the CSV, add them to `data/players_achievements.json`.
Keys can be **player ID** (recommended) or **player name**, and values are arrays of achievements:

```json
{
  "101": ["Club champion 2024", "Most aces in April"],
  "Sofia Lind": ["Mixed league MVP"]
}
```

These achievements are merged with any achievements found in the CSV.

### How to Update External Links

**Payment Links (Stripe/Mollie):**
1. Create payment links in your Stripe/Mollie dashboard
2. Copy the link URL
3. Update the `buyLink` field in `/data/products.json` or `/data/merch.json`

**Google Forms:**
1. Create a form in Google Forms
2. Click "Send" → "Embed" → Copy the iframe URL
3. Update `briefFormEmbedUrl` in `/data/corporate.json` or `contactFormEmbedUrl` in `/data/contacts.json`

**Google Photos Albums:**
1. Create a shared album in Google Photos
2. Copy the share link
3. Update `embedUrl` in `/data/gallery.json`

**Google Maps:**
1. Search for your location on Google Maps
2. Click "Share" → "Embed a map" → Copy the iframe URL
3. Update `embed` field in `/data/contacts.json`

### Adding Images

**Merch/Product Images:**
- Place images in `/public/images/merch/`
- Reference as `/images/merch/filename.jpg`

**Gallery Images:**
- Place images in `/public/images/gallery/`
- Reference as `/images/gallery/filename.jpg`

**Partner Logos:**
- Place logos in `/public/images/partners/`
- Reference as `/images/partners/filename.png`

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Deployment

This project is ready to deploy to Vercel, Netlify, or any static hosting service.

**Quick Deploy to Vercel:**
1. Push code to GitHub
2. Connect repository to Vercel
3. Deploy (automatic)

## Tech Stack

- React + Vite
- TypeScript
- Tailwind CSS
- React Router
- Shadcn UI Components

## Project Structure

```
/data                 # All editable content (JSON files)
/public
  /images            # Static images
/src
  /components        # Reusable UI components
  /pages            # Page components
  /lib              # Utilities
```

## Support

For questions or issues, contact: hello@sunsetpadel.at
