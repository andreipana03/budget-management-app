import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import api from '../services/api.ts';
import { useAuth } from './AuthContext.tsx';

// rates[from][to] = multiplier
type RateMap = Record<string, Record<string, number>>;

interface PreferencesContextValue {
  currency: string;
  savedCurrency: string;
  setCurrency: (c: string) => void;
  convert: (amount: number, fromCurrency: string) => number;
  fmt: (amount: number, fromCurrency?: string) => string;
  savingsGoal: number | null;
  setSavingsGoal: (goal: number | null) => Promise<void>;
}

const PreferencesContext = createContext<PreferencesContextValue>({
  currency: 'USD',
  savedCurrency: 'USD',
  setCurrency: () => {},
  convert: (n) => n,
  fmt: (n) => `${n.toFixed(2)} USD`,
  savingsGoal: null,
  setSavingsGoal: async () => {},
});

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [currency, setCurrencyState] = useState('USD');
  const [savedCurrency, setSavedCurrency] = useState('USD');
  const [rates, setRates] = useState<RateMap>({});
  const [savingsGoal, setSavingsGoalState] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      api.get('/preferences'),
      api.get('/exchange-rates'),
    ]).then(([prefRes, ratesRes]) => {
      if (prefRes.data?.default_currency) {
        setCurrencyState(prefRes.data.default_currency);
        setSavedCurrency(prefRes.data.default_currency);
      }
      if (prefRes.data?.savings_goal != null) {
        setSavingsGoalState(prefRes.data.savings_goal);
      }
      if (ratesRes.data) setRates(ratesRes.data);
    }).catch(() => {});
  }, [user]);

  const setSavingsGoal = useCallback(async (goal: number | null) => {
    setSavingsGoalState(goal);
    await api.put('/preferences', { savings_goal: goal });
  }, []);

  const setCurrency = useCallback((c: string) => {
    setCurrencyState(c);
  }, []);

  const convert = useCallback((amount: number, fromCurrency: string): number => {
    if (fromCurrency === currency) return amount;
    const rate = rates[fromCurrency]?.[currency];
    if (rate == null) return amount; // fallback: no rate available
    return amount * rate;
  }, [currency, rates]);

  const fmt = useCallback((amount: number, fromCurrency?: string): string => {
    const value = fromCurrency ? convert(amount, fromCurrency) : amount;
    return `${value.toFixed(2)} ${currency}`;
  }, [convert, currency]);

  return (
    <PreferencesContext.Provider value={{ currency, savedCurrency, setCurrency, convert, fmt, savingsGoal, setSavingsGoal }}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  return useContext(PreferencesContext);
}
