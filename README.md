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

## AI concierge: Elena

The chat widget is **Elena, Senior Client Advisor**. She answers questions about the actual listings (prices, specs, features, payments), books tours, values homes for sellers, and gathers the visitor's details for Alex as the conversation goes. Every detail she learns updates a lead in the Broker CRM in real time, with a lead score.

- **Live AI mode:** add one key in Vercel (**Settings → Environment Variables**) and redeploy. The `/api/chat` route uses the first key it finds:
  - `ANTHROPIC_API_KEY` (optional `ANTHROPIC_MODEL`, default `claude-sonnet-5-5`)
  - `OPENAI_API_KEY` (optional `OPENAI_MODEL`, default `gpt-4.1-mini`)
  - `OPENROUTER_API_KEY` (optional `OPENROUTER_MODEL`, default `openrouter/auto`)

  Each request includes the full listings, mortgage maths, brokerage facts and what's known about the visitor so far. Elena is told to quote only real listings, keep replies to 1–3 sentences and say she's an AI if asked. The route is rate-limited per IP and has a 15 s timeout. See `.env.example`.
- **No key (default demo):** a built-in conversation engine (`lib/concierge/engine.ts`) works out what the visitor wants (buy, sell, tour, budget, location, beds, timeline, contact details), searches the listings, works out payments and valuations, and writes varied replies. It never repeats a sentence within a conversation. If the AI provider fails or times out, the chat switches to this engine without showing an error.

Code: `lib/concierge/` (`extract.ts` works out intent and details, `engine.ts` writes the built-in replies, `knowledge.ts` holds the listing data and the AI instructions, `score.ts` scores leads and maps them to the CRM) and `app/api/chat/route.ts`.

## Demo script (for broker presentations)

1. **Search:** set Location / Type / Max price / Bedrooms in the hero. The listings filter live.
2. **Listing:** click **View Details** to see the gallery, specs, highlights and an instant inquiry form. Submitting it creates a lead (a "Tour Requested" lead if the tour box is ticked).
3. **AI concierge:** click the green bubble and chat naturally, for example "Anything in Miami under $7M?", "Does it have a pool?", "What's the monthly payment with 25% down?", then give a name and email. Elena answers from the real listings, shows property cards that open the detail view, and the lead appears and updates in the CRM as you go.
4. **CRM:** a toast appears ("New lead captured") and the navbar badge counts up. Open **🔑 Live Broker CRM Dashboard** to see the new lead highlighted at the top with KPIs, a pipeline strip, search, **Filter by Status**, inline status editing and a working **Export to CSV**.
5. **Mortgage calculator:** drag the price, down payment and rate sliders or switch between 15 and 30 years. The monthly payment and its breakdown (principal & interest, taxes, insurance, plus PMI under 20% down) update live.
6. **Seller valuation:** enter an address in "Sell Your Home" and click **Get Valuation**. An instant estimate appears and a **New Seller Lead** lands in the CRM. Filling in the optional report form adds the seller's name, email and phone to that lead.
7. The **Reset** icon in the CRM restores the seed data. Leads are kept in `localStorage`, so the demo survives a page refresh.

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
  MortgageCalculator.tsx # live monthly-payment estimator with breakdown donut
  SellerValuation.tsx # instant AI home valuation lead magnet → CRM
  WhyChooseUs.tsx     # value props, testimonial, broker pitch CTA
  AIChatbot.tsx       # Elena chat widget: AI or built-in mode, typing pacing, property cards, live CRM sync
  CRMDashboard.tsx    # broker CRM: KPIs, filters, table/mobile cards, CSV export
  LeadToast.tsx       # real-time "new lead" notification
  MobileFAB.tsx       # mobile Call + WhatsApp floating buttons
  Modal.tsx / SmartImage.tsx / Footer.tsx
context/CRMContext.tsx  # leads store, lead scoring, chat/CRM open state
lib/data.ts             # listings, locations, agent details
lib/filters.ts          # search filter logic
lib/mortgage.ts         # payment math + tax/insurance/PMI rates
lib/valuation.ts        # demo home-valuation model (Sell section + Elena)
lib/concierge/          # Elena: extraction, built-in engine, knowledge base, lead scoring
app/api/chat/route.ts   # LLM route (Anthropic / OpenAI / OpenRouter) with fallback signal
```

## Customising for a client

- **Branding / agent:** edit `AGENT` in `lib/data.ts` (name, phone, WhatsApp link, email) and the `Logo` in `Navbar.tsx`.
- **Listings:** edit `PROPERTIES` in `lib/data.ts`. Images come from `images.unsplash.com`; to use another host, add it to `next.config.ts`.
- **Accent colour:** swap the `emerald-*` utility classes for another palette, such as `indigo-*`.
- **Real backend:** replace `addLead` in `context/CRMContext.tsx` with a POST to your CRM (Follow Up Boss, HubSpot, a webhook, etc.).

All listings, people and contact details are fictional.
