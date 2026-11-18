export type PropertyType = "Villa" | "Apartment" | "Penthouse";

export interface Property {
  id: string;
  title: string;
  price: number;
  location: string;
  address: string;
  type: PropertyType;
  beds: number;
  baths: number;
  sqft: number;
  yearBuilt: number;
  tag?: string;
  images: string[];
  description: string;
  features: string[];
}

const u = (id: string, w = 1600) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`;

export const unsplash = u;

export const HERO_IMAGE = u("1613490493576-7fde63acd811", 2400);

export const LOCATIONS = [
  "Beverly Hills, CA",
  "Miami Beach, FL",
  "Austin, TX",
  "Manhattan, NY",
  "Dallas, TX",
  "Malibu, CA",
] as const;

export const PROPERTY_TYPES: PropertyType[] = ["Villa", "Apartment", "Penthouse"];

export const PRICE_RANGES = [
  { label: "Any price", min: 0, max: Infinity },
  { label: "Under $2M", min: 0, max: 2_000_000 },
  { label: "$2M – $5M", min: 2_000_000, max: 5_000_000 },
  { label: "$5M – $10M", min: 5_000_000, max: 10_000_000 },
  { label: "$10M+", min: 10_000_000, max: Infinity },
];

export const BEDROOM_OPTIONS = [0, 2, 3, 4, 5];

export const PROPERTIES: Property[] = [
  {
    id: "bh-01",
    title: "The Summit Glass Estate",
    price: 12_450_000,
    location: "Beverly Hills, CA",
    address: "1180 Summitridge Dr, Beverly Hills, CA 90210",
    type: "Villa",
    beds: 6,
    baths: 8,
    sqft: 9_850,
    yearBuilt: 2021,
    tag: "Exclusive",
    images: [
      u("1613490493576-7fde63acd811"),
      u("1600596542815-ffad4c1539a9"),
      u("1600607687939-ce8a6c25118c"),
      u("1600566753190-17f0baa2a6c3"),
    ],
    description:
      "Perched above the Platinum Triangle, this architectural masterpiece frames 270° city-to-ocean views through floor-to-ceiling glass. A 75-ft infinity pool, chef's kitchen with Gaggenau appliances, private wellness wing and a 12-car gallery garage make it one of the most complete estates in 90210.",
    features: ["Infinity pool", "Home cinema", "Wine cellar", "Smart home", "Gated & guarded", "Guest house"],
  },
  {
    id: "mi-02",
    title: "Oceanfront Sky Residence",
    price: 6_890_000,
    location: "Miami Beach, FL",
    address: "3651 Collins Ave, PH-41, Miami Beach, FL 33140",
    type: "Penthouse",
    beds: 4,
    baths: 5,
    sqft: 4_620,
    yearBuilt: 2022,
    tag: "New Listing",
    images: [
      u("1600585154340-be6161a56a0c"),
      u("1600210492486-724fe5c67fb0"),
      u("1600573472550-8090b5e0745e"),
      u("1600047509807-ba8f99d2cdde"),
    ],
    description:
      "A full-floor penthouse with private elevator entry and wraparound terraces overlooking the Atlantic. Italian marble throughout, a rooftop plunge pool, and white-glove building services including valet, spa and beach club access.",
    features: ["Private elevator", "Rooftop plunge pool", "Ocean views", "Concierge 24/7", "Beach club", "2 parking bays"],
  },
  {
    id: "au-03",
    title: "Lakeview Modern Retreat",
    price: 3_275_000,
    location: "Austin, TX",
    address: "4210 Westlake Dr, Austin, TX 78746",
    type: "Villa",
    beds: 5,
    baths: 4,
    sqft: 5_140,
    yearBuilt: 2019,
    tag: "Price Drop",
    images: [
      u("1512917774080-9991f1c4c750"),
      u("1600585154526-990dced4db0d"),
      u("1600607687644-c7171b42498f"),
      u("1600566753086-00f18fb6b3ea"),
    ],
    description:
      "Hill Country modernism on a wooded acre in Westlake. Open-plan living flows onto a limestone terrace with outdoor kitchen and saltwater pool. Top-rated Eanes ISD schools and minutes to downtown Austin.",
    features: ["Saltwater pool", "Outdoor kitchen", "Home office", "EV charging", "Solar panels", "Top schools"],
  },
  {
    id: "ny-04",
    title: "Tribeca Loft Penthouse",
    price: 8_950_000,
    location: "Manhattan, NY",
    address: "56 Leonard St, PH-52, New York, NY 10013",
    type: "Penthouse",
    beds: 3,
    baths: 4,
    sqft: 3_880,
    yearBuilt: 2017,
    images: [
      u("1545324418-cc1a3fa10c00"),
      u("1560448204-e02f11c3d0e2"),
      u("1600210491892-03d54c0aaf87"),
      u("1586023492125-27b2c045efd7"),
    ],
    description:
      "Sculptural cantilevered penthouse in one of Manhattan's most iconic towers. 14-ft ceilings, a Bulthaup kitchen and a private terrace with Hudson River and skyline views. Full-service building with 75-ft lap pool and screening room.",
    features: ["14-ft ceilings", "Private terrace", "Doorman", "Lap pool", "Fitness center", "Skyline views"],
  },
  {
    id: "dal-05",
    title: "Highland Park Modern Villa",
    price: 1_850_000,
    location: "Dallas, TX",
    address: "4512 Lakeside Dr, Dallas, TX 75205",
    type: "Villa",
    beds: 2,
    baths: 2,
    sqft: 1_420,
    yearBuilt: 2019,
    tag: "Off-Market",
    images: [
      u("1502672260266-1c1ef2d93688"),
      u("1522708323590-d24dbb6b0267"),
      u("1600121848594-d8644e57abab"),
      u("1505843513577-22bb7d21e455"),
    ],
    description:
      "A sleek, light-filled modern villa on a tree-lined street in coveted Highland Park. Wide-plank oak floors, a chef's kitchen with Sub-Zero and Wolf appliances, and a private courtyard garden — minutes from Highland Park Village and top-rated HPISD schools.",
    features: ["Private courtyard", "Chef's kitchen", "Smart home", "Attached garage", "Top-rated schools", "Near Highland Park Village"],
  },
  {
    id: "mb-06",
    title: "Malibu Cliffside Villa",
    price: 15_900_000,
    location: "Malibu, CA",
    address: "27400 Pacific Coast Hwy, Malibu, CA 90265",
    type: "Villa",
    beds: 5,
    baths: 6,
    sqft: 7_300,
    yearBuilt: 2020,
    tag: "Featured",
    images: [
      u("1580587771525-78b9dba3b914"),
      u("1564013799919-ab600027ffc6"),
      u("1600563438938-a9a27216b4f5"),
      u("1613977257363-707ba9348227"),
    ],
    description:
      "A dramatic cliff-top sanctuary with unobstructed Pacific views from every room. Disappearing glass walls open to a cantilevered pool deck, with private beach access via a gated stairway. Designed for indoor-outdoor California living.",
    features: ["Private beach access", "Cantilevered pool", "Gym & sauna", "Fire pits", "Gated", "Ocean views"],
  },
];

export const formatPrice = (n: number) =>
  n >= 1_000_000
    ? `$${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 2).replace(/\.?0+$/, "")}M`
    : `$${n.toLocaleString("en-US")}`;

export const formatFullPrice = (n: number) => `$${n.toLocaleString("en-US")}`;

export const AGENT = {
  name: "Alex Morgan",
  title: "Principal Broker",
  phone: "+1 (310) 555-0142",
  phoneHref: "tel:+13105550142",
  whatsappHref: "https://wa.me/13105550142?text=Hi%20Alex%2C%20I%27m%20interested%20in%20a%20property",
  email: "alex@auraestate.com",
  avatar: unsplash("1560250097-0b93528c311a", 200),
};
