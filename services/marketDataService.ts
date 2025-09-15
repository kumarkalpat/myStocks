import { ChartDataPoint, StockQuote } from '../types';
import { ChartRange } from '../components/Dashboard';
import { ApiStatusType } from '../components/ApiStatus';
import { getFinnhubApiKey } from './configService';

const BASE_URL = 'https://finnhub.io/api/v1';

const handleApiError = (response: Response, ticker: string): Error => {
    if (response.status === 401) {
        return new Error("The Finnhub API key is invalid. The API rejected the key. Please double-check the value in the configuration screen.");
    }
     if (response.status === 429) {
        return new Error("Finnhub API rate limit exceeded. Please wait and try again later.");
    }
    return new Error(`API request for ${ticker} failed with status ${response.status}.`);
}

export const validateFinnhubApiKey = async (): Promise<ApiStatusType> => {
    const apiKey = getFinnhubApiKey();
    if (!apiKey) {
        return 'missing';
    }
    try {
        // Use a common, stable ticker like AAPL for a lightweight check.
        const url = `${BASE_URL}/quote?symbol=AAPL&token=${apiKey}`;
        const response = await fetch(url);
        if (response.status === 401) {
            return 'invalid';
        }
        if (!response.ok) {
            console.error(`Finnhub validation failed with status: ${response.status}`);
            return 'invalid';
        }
        return 'valid';
    } catch (error) {
        console.error("Finnhub API Key validation failed:", error);
        return 'invalid';
    }
};

export const getQuote = async (ticker: string): Promise<StockQuote> => {
    const apiKey = getFinnhubApiKey();
    if (!apiKey) {
        throw new Error("Finnhub API key not configured. Please set it in the configuration screen.");
    }
    try {
        const url = `${BASE_URL}/quote?symbol=${ticker}&token=${apiKey}`;
        const response = await fetch(url);

        if (!response.ok) {
            throw handleApiError(response, ticker);
        }

        const data = await response.json();
        if (data.c === 0 && data.pc === 0) { // Finnhub can return 0s for invalid tickers
            throw new Error(`No quote data found for ticker: ${ticker}. Please check the symbol.`);
        }

        return {
            currentPrice: data.c,
            change: data.d,
            percentChange: data.dp,
            previousClose: data.pc,
        };
    } catch (error) {
        console.error(`Error fetching quote for ${ticker}:`, error);
        throw error;
    }
};

export const getCompanyProfile = async (ticker: string): Promise<{ name: string }> => {
    const apiKey = getFinnhubApiKey();
    if (!apiKey) {
        throw new Error("Finnhub API key not configured. Please set it in the configuration screen.");
    }
    try {
        const url = `${BASE_URL}/stock/profile2?symbol=${ticker}&token=${apiKey}`;
        const response = await fetch(url);

        if (!response.ok) {
            throw handleApiError(response, ticker);
        }

        const data = await response.json();
        // If the API returns an empty object, the ticker is likely invalid
        if (Object.keys(data).length === 0) {
            throw new Error(`No company profile found for ticker: ${ticker}. Please check the symbol.`);
        }
        return data;
    } catch (error) {
        console.error(`Error fetching company profile for ${ticker}:`, error);
        throw error; // Re-throw to be caught by the component
    }
};


const transformData = (apiData: any): ChartDataPoint[] => {
    // Finnhub signals no data with s: "no_data" or if the timestamp array 't' is missing/empty.
    if (apiData.s === 'no_data' || !apiData.t || apiData.t.length === 0) {
        return [];
    }

    const chartPoints: ChartDataPoint[] = [];
    for (let i = 0; i < apiData.t.length; i++) {
        const timestamp = apiData.t[i] * 1000; // Finnhub provides UNIX timestamps in seconds
        const price = apiData.c[i];
        const d = new Date(timestamp);
        
        chartPoints.push({
            date: d.toISOString(),
            shortDate: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            price,
        });
    }

    return chartPoints;
};


export const getHistoricalData = async (ticker: string, range: ChartRange): Promise<ChartDataPoint[]> => {
    const apiKey = getFinnhubApiKey();
    if (!apiKey) {
        throw new Error("Finnhub API key not configured. Please set it in the configuration screen.");
    }
    
    try {
        const now = new Date();
        const to = Math.floor(now.getTime() / 1000);
        let from: number;
        let resolution: string;

        switch (range) {
            case '5Y':
                from = Math.floor(new Date(now.getFullYear() - 5, now.getMonth(), now.getDate()).getTime() / 1000);
                resolution = 'W'; // Weekly for 5-year view
                break;
            case '1Y':
                from = Math.floor(new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()).getTime() / 1000);
                resolution = 'D'; // Daily for 1-year view
                break;
            case 'YTD':
                from = Math.floor(new Date(now.getFullYear(), 0, 1).getTime() / 1000);
                resolution = 'D'; // Daily for YTD view
                break;
            default: // Default to 1Y
                from = Math.floor(new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()).getTime() / 1000);
                resolution = 'D';
                break;
        }
        
        const url = `${BASE_URL}/stock/candle?symbol=${ticker}&resolution=${resolution}&from=${from}&to=${to}&token=${apiKey}`;
        
        const response = await fetch(url);

        if (!response.ok) {
            throw handleApiError(response, ticker);
        }
        
        const data = await response.json();
        return transformData(data);

    } catch (error) {
        console.error("Error fetching historical data from Finnhub:", error);
        throw error; // Re-throw to be caught by the component
    }
};