import { GoogleGenAI } from "@google/genai";
import { ChartDataPoint, StockQuote } from '../types';
import { ChartRange } from '../components/Dashboard';
import { getGeminiApiKey } from './configService';

// --- Gemini Client Setup ---

const getGenAIClient = (): GoogleGenAI => {
    // Prioritize environment variable, fall back to localStorage.
    const apiKey = process.env.API_KEY || getGeminiApiKey();
    if (!apiKey) {
        throw new Error("API Key not found. Please configure it.");
    }
    return new GoogleGenAI({ apiKey });
};

const handleApiError = (error: unknown, context: string, ticker: string): Error => {
    console.error(`Error fetching ${context} for ${ticker}:`, error);
    if (error instanceof Error) {
        if (error.message.includes('API key') || error.message.includes('400') || error.message.includes('Forbidden') || error.message.includes('API Key not found')) {
            return new Error("The Gemini API key is invalid or missing. If you've set it in the environment, please verify it. Otherwise, please re-configure it through the app.");
        }
        if (error.message.toLowerCase().includes('json')) {
            return new Error(`Gemini returned an invalid format for ${ticker}. The stock ticker might be incorrect or delisted.`);
        }
    }
    return new Error(`Failed to get ${context} for ${ticker} from Gemini API.`);
};

// --- Helper to clean and parse Gemini's response ---

const cleanAndParseJson = (text: string): any => {
    let jsonText = text.trim();
    if (jsonText.startsWith('```json')) {
        jsonText = jsonText.substring(7, jsonText.length - 3).trim();
    } else if (jsonText.startsWith('```')) {
        jsonText = jsonText.substring(3, jsonText.length - 3).trim();
    }
    return JSON.parse(jsonText);
}


// --- New Data Fetching Functions using Gemini ---

export const getQuote = async (ticker: string): Promise<StockQuote> => {
    try {
        const client = getGenAIClient();
        const prompt = `Using Google Search, get the latest stock quote for ticker symbol "${ticker}".
        Return ONLY a valid JSON object with the following keys and number values:
        - "currentPrice": The latest trading price.
        - "change": The change in price for the day (e.g., -1.25).
        - "percentChange": The percentage change for the day (e.g., -0.5).
        - "previousClose": The previous trading day's closing price.
        Do not include any other text or markdown formatting.`;
        
        const response = await client.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }],
            }
        });
        
        const data = cleanAndParseJson(response.text);
        
        if (typeof data.currentPrice !== 'number') {
            throw new Error(`Invalid data format received for ${ticker}.`);
        }

        return data as StockQuote;

    } catch (error) {
        throw handleApiError(error, "quote", ticker);
    }
};

export const getCompanyProfile = async (ticker: string): Promise<{ name: string }> => {
    try {
        const client = getGenAIClient();
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

const transformAndSortData = (apiData: {date: string, price: number}[]): ChartDataPoint[] => {
    if (!apiData || apiData.length === 0) {
        return [];
    }

    const chartPoints: ChartDataPoint[] = apiData
        .map(point => {
            // The date from Gemini might not have a time, so specify UTC to avoid timezone issues.
            const d = new Date(`${point.date}T00:00:00Z`);
            return {
                date: d.toISOString(),
                shortDate: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }),
                price: point.price,
            };
        })
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()); // Ensure data is chronological

    return chartPoints;
};

export const getHistoricalData = async (ticker: string, range: ChartRange): Promise<ChartDataPoint[]> => {
    try {
        const client = getGenAIClient();
        
        let rangeDescription = '';
        let frequency = 'daily';
        switch (range) {
            case '5Y':
                rangeDescription = 'the last 5 years';
                frequency = 'weekly';
                break;
            case '1Y':
                rangeDescription = 'the last 1 year';
                break;
            case 'YTD':
                rangeDescription = 'this year to date';
                break;
        }

        const prompt = `
            Using Google Search, provide historical closing prices for the stock with ticker symbol "${ticker}" for ${rangeDescription}.
            The data should be ${frequency}.
            Return ONLY a valid JSON array of objects, where each object contains a 'date' (in YYYY-MM-DD format) and the 'price' (closing price as a number).
            Ensure the data is sorted chronologically from oldest to newest.
            Do not include any other text or markdown formatting.
        `;

        const response = await client.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }],
            }
        });

        const data = cleanAndParseJson(response.text);
        return transformAndSortData(data);

    } catch (error) {
        throw handleApiError(error, "historical data", ticker);
    }
};