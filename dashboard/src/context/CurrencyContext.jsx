import { createContext, useContext, useState, useCallback } from 'react';
import settingsOptions from '@shared/settings-options.json';

const CURRENCIES = Object.fromEntries(settingsOptions.currencies.map((c) => [c.code, c]));

const CurrencyContext = createContext(null);

export function CurrencyProvider({ children }) {
  const [code, setCode] = useState(
    () => localStorage.getItem('pos_currency') || 'USD',
  );

  const currency = CURRENCIES[code] || CURRENCIES.USD;

  const format = useCallback(
    (amount) => `${currency.symbol}${parseFloat(amount || 0).toFixed(currency.decimals)}`,
    [currency],
  );

  const setCurrency = useCallback((newCode) => {
    localStorage.setItem('pos_currency', newCode);
    setCode(newCode);
  }, []);

  return (
    <CurrencyContext.Provider
      value={{ code, currency, format, setCurrency, currencies: CURRENCIES }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  return useContext(CurrencyContext);
}
