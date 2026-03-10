import axios from 'axios';
import { supabase } from './supabase';

const API_KEY = process.env.EXCHANGE_RATE_API_KEY;
const BASE_URL = 'https://v6.exchangerate-api.com/v6';

export const fetchExchangeRates = async (baseCurrency: string = 'USD') => {
  try {
    if (!API_KEY) {
      console.warn('Exchange rate API key not configured');
      return null;
    }

    const response = await axios.get(`${BASE_URL}/${API_KEY}/latest/${baseCurrency}`);
    
    if (response.data.result === 'success') {
      return response.data.conversion_rates;
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching exchange rates:', error);
    return null;
  }
};

export const updateExchangeRates = async () => {
  try {
    const currencies = ['USD', 'EUR', 'RON'];
    
    for (const baseCurrency of currencies) {
      const rates = await fetchExchangeRates(baseCurrency);
      
      if (rates) {
        for (const [targetCurrency, rate] of Object.entries(rates)) {
          if (currencies.includes(targetCurrency)) {
            await supabase
              .from('exchange_rates')
              .upsert({
                base_currency: baseCurrency,
                target_currency: targetCurrency,
                rate: rate,
                last_updated: new Date().toISOString(),
              }, {
                onConflict: 'base_currency,target_currency'
              });
          }
        }
      }
    }
    
    console.log('✅ Exchange rates updated successfully');
  } catch (error) {
    console.error('Error updating exchange rates:', error);
  }
};

export const getExchangeRate = async (from: string, to: string): Promise<number> => {
  try {
    if (from === to) return 1;

    const { data, error } = await supabase
      .from('exchange_rates')
      .select('rate')
      .eq('base_currency', from)
      .eq('target_currency', to)
      .single();

    if (error || !data) {
      console.warn(`Exchange rate not found for ${from} to ${to}, using 1`);
      return 1;
    }

    return parseFloat(data.rate);
  } catch (error) {
    console.error('Error getting exchange rate:', error);
    return 1;
  }
};
