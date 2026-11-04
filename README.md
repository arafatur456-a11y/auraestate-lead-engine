# AuraEstate Premier Properties: Real Estate Lead Engine

A sales-demo template for independent brokers and agency owners. It combines a luxury listings site, a 24/7 AI lead-qualification chatbot and a built-in broker CRM that fills up in real time.

**Stack:** Next.js 15 (App Router) · React 19 · Tailwind CSS v4 · Framer Motion · Lucide icons · Geist font (bundled, no external font fetch)

## Quick start

```bash
npm install
npm run dev        # http://localhost:3000
npm run build && npm start
```

### Deploy to Vercel

Push the folder to GitHub and import it at vercel.com/new. You don't need any environment variables. Or run:

```bash
npx vercel
```

## Demo script (for broker presentations)

1. **Search:** set Location / Type / Max price / Bedrooms in the hero. The listings filter live.
2. **Listing:** click **View Details** to see the gallery, specs, highlights and an instant inquiry form. Submitting it creates a lead (a "Tour Requested" lead if the tour box is ticked).
3. **AI chatbot:** click the green bubble at the bottom right. Pick an intent (Buy, Sell or Book a Tour), then location, budget, timeline, name, email and phone. The lead is scored and pushed into the CRM.
4. **CRM:** a toast appears ("New lead captured") and the navbar badge counts up. Open **🔑 Live Broker CRM Dashboard** to see the new lead highlighted at the top with KPIs, a pipeline strip, search, **Filter by Status**, inline status editing and a working **Export to CSV**.
5. The **Reset** icon in the CRM restores the seed data. Leads are kept in `localStorage`, so the demo survives a page refresh.

## Structure

```
app/
  layout.tsx          # fonts, metadata
  page.tsx            # page composition + search filter state
  globals.css         # Tailwind v4 theme tokens, range slider styles
components/
  Navbar.tsx          # sticky glass navbar, mobile menu, CRM button w/ unseen badge
  Hero.tsx            # full-bleed hero + interactive search bar
  Listings.tsx        # animated property grid + cards
  PropertyModal.tsx   # gallery, specs, inquiry form → CRM
  WhyChooseUs.tsx     # value props, testimonial, broker pitch CTA
  AIChatbot.tsx       # floating lead-qualification chatbot (state machine)
  CRMDashboard.tsx    # broker CRM: KPIs, filters, table/mobile cards, CSV export
  LeadToast.tsx       # real-time "new lead" notification
  MobileFAB.tsx       # mobile Call + WhatsApp floating buttons
  Modal.tsx / SmartImage.tsx / Footer.tsx
context/CRMContext.tsx  # leads store, lead scoring, chat/CRM open state
lib/data.ts             # listings, locations, agent details
lib/filters.ts          # search filter logic
```

## Customising for a client

- **Branding / agent:** edit `AGENT` in `lib/data.ts` (name, phone, WhatsApp link, email) and the `Logo` in `Navbar.tsx`.
- **Listings:** edit `PROPERTIES` in `lib/data.ts`. Images come from `images.unsplash.com`; to use another host, add it to `next.config.ts`.
- **Accent colour:** swap the `emerald-*` utility classes for another palette, such as `indigo-*`.
- **Real backend:** replace `addLead` in `context/CRMContext.tsx` with a POST to your CRM (Follow Up Boss, HubSpot, a webhook, etc.).

All listings, people and contact details are fictional.
