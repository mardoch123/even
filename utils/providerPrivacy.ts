import { User } from '../types';

export type ProviderPrivacyField =
  | 'full_name'
  | 'company_name'
  | 'email'
  | 'phone'
  | 'external_links'
  | 'social_links'
  | 'qr_codes';

export const isProviderIdentityUnlockedByPlan = (plan?: string | null) => {
  const normalized = (plan || 'free').toString();
  return normalized !== 'free';
};

export const isProviderIdentityUnlocked = (providerUser?: Pick<User, 'role' | 'subscriptionPlan'> | null) => {
  if (!providerUser) return false;
  return isProviderIdentityUnlockedByPlan(providerUser.subscriptionPlan);
};

export const getBlockedProviderFields = (providerUser?: Pick<User, 'role' | 'subscriptionPlan'> | null): ProviderPrivacyField[] => {
  if (isProviderIdentityUnlocked(providerUser)) return [];
  return ['full_name', 'company_name', 'email', 'phone', 'external_links', 'social_links', 'qr_codes'];
};

export const shouldShowProviderIdentityField = (
  providerUser: Pick<User, 'role' | 'subscriptionPlan'> | null | undefined,
  _field: ProviderPrivacyField
) => {
  return isProviderIdentityUnlocked(providerUser);
};

export const sanitizeProviderText = (text: string, unlocked: boolean) => {
  if (unlocked) return text;

  // Block obvious contact info patterns
  const emailRegex = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
  const phoneRegex = /(\+?\d{1,3}[\s.-]?)?(\(?\d{2,3}\)?[\s.-]?)?\d{2}[\s.-]?\d{2}[\s.-]?\d{2}[\s.-]?\d{2}/g;
  const urlRegex = /(https?:\/\/\S+)|(www\.\S+)/gi;

  return text
    .replace(emailRegex, '[info bloquée]')
    .replace(urlRegex, '[lien bloqué]')
    .replace(phoneRegex, '[numéro bloqué]');
};

export const maskProviderDisplayName = (name: string) => {
  const n = (name || '').trim();
  if (!n) return 'Prestataire';

  const words = n.split(/\s+/).filter(Boolean);
  if (words.length === 1) return words[0];

  const first = words[0];
  const second = words[1];

  if (/^dj$/i.test(first) && second) return `DJ ${second}`;

  const initial = second?.charAt(0)?.toUpperCase();
  if (!initial) return first;
  return `${first} ${initial}.`;
};

export const extractCityFromLocation = (location: string) => {
  const loc = (location || '').trim();
  if (!loc) return '';

  const firstPart = loc.split(',')[0].trim();
  if (!firstPart) return '';

  if (/\d/.test(firstPart) && firstPart.length > 10) {
    const afterComma = loc.split(',')[1]?.trim();
    if (!afterComma) return '';
    const m = afterComma.match(/^\d{4,5}\s+(.+)$/);
    return (m?.[1] || afterComma).trim();
  }

  return firstPart;
};

export const extractRadiusKm = (serviceArea?: string) => {
  const s = (serviceArea || '').toLowerCase();
  const m = s.match(/(\d{1,3})\s*km/);
  if (!m) return null;
  return Number(m[1]);
};

export const formatCityAndRadius = (location: string, serviceArea?: string) => {
  const city = extractCityFromLocation(location);
  const radius = extractRadiusKm(serviceArea);
  if (city && radius) return `${city} • ${radius} km`;
  if (city) return city;
  if (radius) return `${radius} km`;
  return 'Zone non affichée';
};
