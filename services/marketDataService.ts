import { ChartDataPoint, StockQuote } from '../types';
import { ChartRange } from '../components/Dashboard';

// --- API Keys ---
// Sourced from environment variables, assumed to be pre-configured.
const GEMINI_API_KEY = process.env.API_KEY;
const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY;

// --- Error Handling ---
const handleApiError = (error: unknown, context: string, ticker: string): Error => {
    console.error(`Error fetching ${context} for ${ticker}:`, error);
    if (error instanceof Error) {
        if (error.message.includes('API key') || error.message.includes('400') || error.message.includes('Forbidden') || error.message.includes('API Key not found')) {
            return new Error(`An API key is invalid or missing. Please ensure both GEMINI_API_KEY and ALPHA_VANTAGE_API_KEY are configured correctly in the environment variables.`);
        }
        if (error.message.toLowerCase().includes('json') || error.message.toLowerCase().includes('unexpected token')) {
            return new Error(`Received an invalid format for ${ticker}. The stock ticker might be incorrect or delisted.`);
        }
         if (error.message.includes('limit')) {
            return new Error(`API limit reached for ${context}. Please try again later.`);
        }
    }
    return new Error(`Failed to get ${context} for ${ticker}.`);
};

// --- Helper to clean and parse Gemini's JSON response ---
const cleanAndParseJson = (text: string): any => {
    let jsonText = text.trim();
    if (jsonText.startsWith('```json')) {
        jsonText = jsonText.substring(7, jsonText.length - 3).trim();
    } else if (jsonText.startsWith('```')) {
        jsonText = jsonText.substring(3, jsonText.length - 3).trim();
    }
    return JSON.parse(jsonText);
}

// --- Data Fetching Functions ---

export const getQuote = async (ticker: string): Promise<StockQuote> => {
    if (!ALPHA_VANTAGE_API_KEY) {
        throw new Error("Alpha Vantage API key is not configured.");
    }
    const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${ticker}&apikey=${ALPHA_VANTAGE_API_KEY}`;
    
    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data['Note'] || !data['Global Quote'] || Object.keys(data['Global Quote']).length === 0) {
            throw new Error(data['Note'] || `No quote data found for ${ticker}. It may be an invalid symbol.`);
        }

        const quoteData = data['Global Quote'];
        return {
            currentPrice: parseFloat(quoteData['05. price']),
            change: parseFloat(quoteData['09. change']),
            percentChange: parseFloat(quoteData['10. change percent'].replace('%', '')),
            previousClose: parseFloat(quoteData['08. previous close']),
        };
    } catch (error) {
        throw handleApiError(error, "quote", ticker);
    }
};

// This function remains with Gemini as it's a flexible text-based query.
export const getCompanyProfile = async (ticker: string): Promise<{ name: string }> => {
    if (!GEMINI_API_KEY) {
        throw new Error("Gemini API key is not configured.");
    }
    const { GoogleGenAI } = await import('@google/genai');
    const client = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    
    try {
        const prompt = `Using Google Search, what is the full company name for the stock ticker symbol "${ticker}"?
        Return ONLY a valid JSON object with a single key "name" and the company name as its string value.
        Do not include any other text or markdown formatting.`;

        const response = await client.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }],
            }
        });

        const data = cleanAndParseJson(response.text);
        
        if (!data.name || typeof data.name !== 'string' || data.name.trim() === '') {
             throw new Error(`No company name found for ticker: ${ticker}. Please check the symbol.`);
        }
        
        return data;

    } catch (error) {
        throw handleApiError(error, "company profile", ticker);
    }
};

const transformAndSortData = (apiData: Record<string, any>, key: '5. adjusted close' | '4. close'): ChartDataPoint[] => {
    if (!apiData || Object.keys(apiData).length === 0) {
        return [];
    }

    return Object.entries(apiData)
        .map(([dateStr, values]) => {
            const d = new Date(`${dateStr}T00:00:00Z`);
            return {
                date: d.toISOString(),
                shortDate: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }),
                price: parseFloat(values[key]),
            };
        })
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
};


export const getHistoricalData = async (ticker: string, range: ChartRange): Promise<ChartDataPoint[]> => {
    if (!ALPHA_VANTAGE_API_KEY) {
        throw new Error("Alpha Vantage API key is not configured.");
    }

    let apiFunction: string;
    let dataKey: string;
    let priceKey: '5. adjusted close' | '4. close';

    switch (range) {
        case '5Y':
            apiFunction = 'TIME_SERIES_WEEKLY_ADJUSTED';
            dataKey = 'Weekly Adjusted Time Series';
            priceKey = '5. adjusted close';
            break;
        case '1Y':
        case 'YTD':
        default:
            apiFunction = 'TIME_SERIES_DAILY_ADJUSTED';
            dataKey = 'Time Series (Daily)';
            priceKey = '5. adjusted close';
            break;
    }
    
    const url = `https://www.alphavantage.co/query?function=${apiFunction}&symbol=${ticker}&outputsize=full&apikey=${ALPHA_VANTAGE_API_KEY}`;
    
    try {
        const response = await fetch(url);
        const data = await response.json();
        
        if (data['Note'] || !data[dataKey]) {
            throw new Error(data['Note'] || `No historical data found for ${ticker}.`);
        }

        let transformedData = transformAndSortData(data[dataKey], priceKey);

        if (range === '1Y') {
            const oneYearAgo = new Date();
            oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
            transformedData = transformedData.filter(dp => new Date(dp.date) >= oneYearAgo);
        } else if (range === 'YTD') {
            const startOfYear = new Date(new Date().getFullYear(), 0, 1);
            transformedData = transformedData.filter(dp => new Date(dp.date) >= startOfYear);
        }
        
        return transformedData;

    } catch (error) {
        throw handleApiError(error, "historical data", ticker);
    }
};
