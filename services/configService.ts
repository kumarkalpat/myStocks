export const GEMINI_API_KEY_LS_KEY = 'geminiApiKey';
export const FINNHUB_API_KEY_LS_KEY = 'finnhubApiKey';

export const getGeminiApiKey = (): string | null => {
  try {
    return localStorage.getItem(GEMINI_API_KEY_LS_KEY);
  } catch (e) {
    console.error("Could not access localStorage", e);
    return null;
  }
};

export const getFinnhubApiKey = (): string | null => {
  try {
    return localStorage.getItem(FINNHUB_API_KEY_LS_KEY);
  } catch (e) {
    console.error("Could not access localStorage", e);
    return null;
  }
};

export const saveApiKeys = (geminiKey: string, finnhubKey: string): void => {
  try {
    localStorage.setItem(GEMINI_API_KEY_LS_KEY, geminiKey);
    localStorage.setItem(FINNHUB_API_KEY_LS_KEY, finnhubKey);
  } catch (e) {
    console.error("Could not save to localStorage", e);
  }
};
