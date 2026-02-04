
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

type Currency = 'CAD' | 'EUR' | 'USD';

interface CurrencyContextType {
  currency: Currency;
  setCurrency: (c: Currency) => void;
  formatPrice: (amount: number) => string;
  convertPrice: (amount: number) => number;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
};

const RATES = {
  CAD: 1,
  EUR: 0.68,
  USD: 0.74
};

const SYMBOLS = {
  CAD: 'CA$',
  EUR: '€',
  USD: '$'
};

export const CurrencyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currency, setCurrency] = useState<Currency>('CAD');

  const convertPrice = (amountInCad: number): number => {
    // Assume base prices in DB are CAD since platform is Canadian
    return amountInCad * RATES[currency];
  };

  const formatPrice = (amountInCad: number): string => {
    const converted = convertPrice(amountInCad);
    return new Intl.NumberFormat('fr-CA', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(converted);
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, formatPrice, convertPrice }}>
      {children}
    </CurrencyContext.Provider>
  );
};
