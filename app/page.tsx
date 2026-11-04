"use client";

import { useMemo, useState } from "react";
import { CRMProvider } from "@/context/CRMContext";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Listings from "@/components/Listings";
import PropertyModal from "@/components/PropertyModal";
import WhyChooseUs from "@/components/WhyChooseUs";
import AIChatbot from "@/components/AIChatbot";
import CRMDashboard from "@/components/CRMDashboard";
import MobileFAB from "@/components/MobileFAB";
import LeadToast from "@/components/LeadToast";
import Footer from "@/components/Footer";
import { PROPERTIES, type Property } from "@/lib/data";
import { DEFAULT_FILTERS, applyFilters, isFiltered, type SearchFilters } from "@/lib/filters";

export default function HomePage() {
  const [filters, setFilters] = useState<SearchFilters>(DEFAULT_FILTERS);
  const [selected, setSelected] = useState<Property | null>(null);
  const results = useMemo(() => applyFilters(PROPERTIES, filters), [filters]);

  return (
    <CRMProvider>
      <Navbar />
      <main>
        <Hero
          filters={filters}
          onChange={setFilters}
          resultCount={results.length}
          onSearch={() => document.getElementById("listings")?.scrollIntoView({ behavior: "smooth" })}
        />
        <Listings properties={results} filtered={isFiltered(filters)} onReset={() => setFilters(DEFAULT_FILTERS)} onView={setSelected} />
        <WhyChooseUs />
      </main>
      <Footer />

      <PropertyModal property={selected} onClose={() => setSelected(null)} />
      <CRMDashboard />
      <AIChatbot />
      <MobileFAB />
      <LeadToast />
    </CRMProvider>
  );
}
