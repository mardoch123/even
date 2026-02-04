import { ServiceProvider } from '../types';

export type IndicativePriceRange = {
  min: number;
  max: number;
  suffix?: string;
};

const roundMoney = (n: number) => Math.round(n * 100) / 100;

const getCategoryDefaults = (category: string): IndicativePriceRange | null => {
  const c = (category || '').toLowerCase();
  if (c.includes('dj')) return { min: 700, max: 1500 };
  if (c.includes('maqu')) return { min: 120, max: 250 };
  if (c.includes('pât') || c.includes('patiss') || c.includes('patis')) return { min: 80, max: 200, suffix: 'par gâteau' };
  return null;
};

export const getIndicativePriceRange = (provider: ServiceProvider): IndicativePriceRange | null => {
  const details = (provider.details || {}) as any;

  const min = details.priceMin ?? details.minPrice ?? details.pricingMin;
  const max = details.priceMax ?? details.maxPrice ?? details.pricingMax;
  const suffix = details.priceSuffix as string | undefined;

  if (typeof min === 'number' && typeof max === 'number') {
    return { min: roundMoney(min), max: roundMoney(max), suffix };
  }

  const byCategory = getCategoryDefaults(provider.category);
  if (byCategory) return byCategory;

  const base = provider.priceValue || 0;
  if (!base) return null;

  const minAuto = roundMoney(base * 0.8);
  const maxAuto = roundMoney(base * 1.5);

  const suffixAuto = provider.priceUnit === 'item'
    ? '/pers'
    : provider.priceUnit === 'hour'
      ? '/h'
      : "/événement";

  return { min: minAuto, max: maxAuto, suffix: suffixAuto };
};
