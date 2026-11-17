export const PROPERTY_TAX_RATE = 0.011; // 1.1% of home price per year (US average-ish)
export const INSURANCE_RATE = 0.0035; // 0.35% of home price per year
export const PMI_RATE = 0.006; // 0.6% of loan per year when down payment < 20%

export interface MortgageInput {
  price: number;
  downPct: number; // 0–100
  rate: number; // annual %, e.g. 6.5
  years: 15 | 30;
}

export interface MortgageResult {
  loan: number;
  down: number;
  principalInterest: number;
  taxes: number;
  insurance: number;
  pmi: number;
  total: number;
  totalInterest: number;
}

export function calcMortgage({ price, downPct, rate, years }: MortgageInput): MortgageResult {
  const down = price * (downPct / 100);
  const loan = Math.max(0, price - down);
  const n = years * 12;
  const r = rate / 100 / 12;
  const principalInterest = loan === 0 ? 0 : r === 0 ? loan / n : (loan * r * (1 + r) ** n) / ((1 + r) ** n - 1);
  const taxes = (price * PROPERTY_TAX_RATE) / 12;
  const insurance = (price * INSURANCE_RATE) / 12;
  const pmi = downPct < 20 ? (loan * PMI_RATE) / 12 : 0;
  return {
    loan,
    down,
    principalInterest,
    taxes,
    insurance,
    pmi,
    total: principalInterest + taxes + insurance + pmi,
    totalInterest: principalInterest * n - loan,
  };
}

export const usd = (n: number, digits = 0) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: digits, minimumFractionDigits: digits });
