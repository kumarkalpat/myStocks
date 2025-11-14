import { GoogleGenAI, Type } from "@google/genai";
import { Holding, StockAnalysis, StockNews, StockRecommendation, StockFundamentals } from '../types';

// FIX: Use process.env.API_KEY as per the coding guidelines, which resolves the error.
const getGenAIClient = (): GoogleGenAI => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
        throw new Error("API Key not found. Please set the `API_KEY` environment variable.");
    }
    return new GoogleGenAI({ apiKey });
};

const formatPortfolioForPrompt = (portfolio: Holding[]): string => {
  if (portfolio.length === 0) return "The user has an empty portfolio.";

  const portfolioString = portfolio.map(h => {
    const totalShares = h.purchases.reduce((sum, p) => sum + p.shares, 0);
    const totalCost = h.purchases.reduce((sum, p) => sum + p.shares * p.purchasePrice, 0);
    const avgPrice = totalShares > 0 ? totalCost / totalShares : 0;
    return `${h.ticker} (${h.companyName}): ${totalShares.toFixed(2)} shares @ avg $${avgPrice.toFixed(2)}`;
  }).join(', ');

  return `The user's current portfolio is: ${portfolioString}.`;
};


const handleApiError = (error: unknown, context: string): Error => {
    console.error(`Error fetching ${context}:`, error);
    if (error instanceof Error) {
        if (error.message.includes('API key') || error.message.includes('400') || error.message.includes('Forbidden') || error.message.includes('API Key not found')) {
             // FIX: Updated error message to reference the correct environment variable.
             return new Error("The Gemini API key is invalid or missing. Please ensure your API_KEY environment variable is set correctly.");
        }
    }
    return new Error(`Failed to get ${context} from Gemini API.`);
};

// Helper to clean and parse Gemini's response when not using a strict JSON schema
const cleanAndParseJson = (text: string): any => {
    let jsonText = text.trim();
    if (jsonText.startsWith('```json')) {
        jsonText = jsonText.substring(7, jsonText.length - 3).trim();
    } else if (jsonText.startsWith('```')) {
        jsonText = jsonText.substring(3, jsonText.length - 3).trim();
    }
    return JSON.parse(jsonText);
}


export const getStockAnalysis = async (ticker: string, portfolio: Holding[]): Promise<StockAnalysis> => {
  try {
    const client = getGenAIClient();
    const prompt = `
      Analyze the stock with ticker symbol "${ticker}". 
      Consider its recent performance, market sentiment, and its position relative to the user's current portfolio.
      ${formatPortfolioForPrompt(portfolio)}
      Provide a buy, sell, or hold signal, a confidence score (0-1), a potential price target, and a brief reasoning.
    `;

    const response = await client.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            ticker: { type: Type.STRING },
            summary: { type: Type.STRING, description: "A brief one-sentence summary of the stock's outlook." },
            buy_sell_hold_signal: { type: Type.STRING, enum: ['BUY', 'SELL', 'HOLD'] },
            confidence_score: { type: Type.NUMBER, description: "A score from 0.0 to 1.0 indicating confidence in the signal." },
            target_price: { type: Type.NUMBER, description: "A plausible future price target." },
            reasoning: { type: Type.STRING, description: "Detailed reasoning for the analysis and signal provided." },
          },
          required: ["ticker", "summary", "buy_sell_hold_signal", "confidence_score", "target_price", "reasoning"]
        }
      }
    });

    const jsonText = response.text.trim();
    return JSON.parse(jsonText) as StockAnalysis;
  } catch (error) {
    throw handleApiError(error, "stock analysis");
  }
};

export const getStockNews = async (ticker: string): Promise<StockNews> => {
  try {
    const client = getGenAIClient();
    const prompt = `Summarize the latest news for the company with stock ticker "${ticker}". Provide a concise summary of the top 3-5 recent developments based on search results.`;

    const response = await client.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;

    // Handle cases where Gemini returns no text and no sources.
    if (!response.text && (!groundingChunks || groundingChunks.length === 0)) {
        return { 
            summary: "Could not find recent news for this ticker.",
            articles: [] 
        };
    }
    
    const articles = groundingChunks?.map((chunk: any) => ({
      title: chunk.web?.title || "Untitled",
      url: chunk.web?.uri || "#",
      source: new URL(chunk.web?.uri || 'https://google.com').hostname,
    })) || [];

    return { 
        summary: response.text?.trim() || "A summary could not be generated, but sources were found.", 
        articles: articles.slice(0, 5) 
    };
  } catch (error) {
    throw handleApiError(error, "stock news");
  }
};

export const getRecommendations = async (portfolio: Holding[]): Promise<StockRecommendation[]> => {
  try {
    const client = getGenAIClient();
    const prompt = `
      Based on the user's current portfolio, recommend 3 new stocks to consider buying for diversification and growth.
      ${formatPortfolioForPrompt(portfolio)}
      For each recommendation, provide the ticker, company name, and a strong, concise reason why it's a good fit for this specific portfolio.
    `;
    
    const response = await client.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              ticker: { type: Type.STRING },
              company_name: { type: Type.STRING },
              reason: { type: Type.STRING },
            },
            required: ["ticker", "company_name", "reason"]
          }
        }
      }
    });

    const jsonText = response.text.trim();
    return JSON.parse(jsonText) as StockRecommendation[];
  } catch (error) {
    throw handleApiError(error, "recommendations");
  }
};

export const getFundamentalAnalysis = async (ticker: string): Promise<StockFundamentals> => {
  try {
    const client = getGenAIClient();
    const prompt = `
      Using Google Search, perform a fundamental analysis for the stock with ticker symbol "${ticker}".
      Provide the latest available values for the following Key Performance Indicators (KPIs).
      
      Return ONLY a valid JSON object with the following structure and keys. All values should be numbers.
      If a value is not available, use null.

      {
        "ticker": "${ticker}",
        "summary": "A brief, one to two-sentence summary of the company's fundamental health based on these metrics.",
        "profitability": {
          "eps": "Earnings Per Share (TTM)",
          "netProfitMargin": "Net Profit Margin (TTM) as a percentage",
          "ebitdaMargin": "EBITDA Margin (TTM) as a percentage"
        },
        "valuation": {
          "peRatio": "Price-to-Earnings Ratio (TTM)",
          "pegRatio": "PEG Ratio (TTM)",
          "pbRatio": "Price-to-Book Ratio (latest quarter)"
        },
        "financialHealth": {
          "debtToEquityRatio": "Total Debt to Equity Ratio (latest quarter)",
          "currentRatio": "Current Ratio (latest quarter)"
        }
      }

      Do not include any other text, explanations, or markdown formatting.
    `;

    const response = await client.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      }
    });
    
    const data = cleanAndParseJson(response.text);
    return data as StockFundamentals;
  } catch (error) {
    throw handleApiError(error, "fundamental analysis");
  }
};