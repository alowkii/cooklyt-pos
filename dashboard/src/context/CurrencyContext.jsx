import { createContext, useContext, useState, useCallback } from 'react';
import CURRENCIES from '../data/currencies.json';

const CurrencyContext = createContext(null);

export function CurrencyProvider({ children }) {
  const [code, setCode] = useState(
    () => localStorage.getItem('pos_currency') || 'USD',
  );

  const currency = CURRENCIES[code] || CURRENCIES.USD;

  // Amounts are stored in USD. Multiply by rate to display in the selected currency.
  const format = useCallback(
    (amount) => {
      const value = parseFloat(amount || 0) * currency.rate;
      return `${currency.symbol}${value.toFixed(currency.decimals)}`;
    },
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
