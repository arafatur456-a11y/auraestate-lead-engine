import type { Property, PropertyType } from "./data";

export interface SearchFilters {
  location: string; // "" = any
  type: PropertyType | ""; // "" = any
  maxPrice: number; // slider max, Infinity = any
  minBeds: number; // 0 = any
}

export const DEFAULT_FILTERS: SearchFilters = {
  location: "",
  type: "",
  maxPrice: Infinity,
  minBeds: 0,
};

export const SLIDER_MAX = 20_000_000;

export function applyFilters(list: Property[], f: SearchFilters) {
  return list.filter(
    (p) =>
      (!f.location || p.location === f.location) &&
      (!f.type || p.type === f.type) &&
      p.price <= f.maxPrice &&
      p.beds >= f.minBeds,
  );
}

export const isFiltered = (f: SearchFilters) =>
  !!f.location || !!f.type || f.maxPrice !== Infinity || f.minBeds !== 0;
