import { GoogleGenAI, Type } from "@google/genai";
import { Holding, StockAnalysis, StockNews, StockRecommendation } from '../types';
import { ApiStatusType } from "../components/ApiStatus";

// The API key is expected to be set in the environment variables.
// The new UI in the Header will provide feedback on its status.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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
    if (error instanceof Error && (error.message.includes('API key') || error.message.includes('400'))) {
        return new Error("The Gemini API key is invalid. Although the API_KEY environment variable may be set, the API rejected the key. Please verify the key is correct and has the necessary permissions in your Google AI Studio project.");
    }
    return new Error(`Failed to get ${context} from Gemini API.`);
};

export const validateGeminiApiKey = async (): Promise<ApiStatusType> => {
    if (!process.env.API_KEY) {
        return 'missing';
    }
    try {
        // Perform a lightweight, non-streaming call to check the key.
        // A simple prompt is enough to validate authentication.
        await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: "test",
            config: {
                maxOutputTokens: 5, 
                thinkingConfig: { thinkingBudget: 0 }
            }
        });
        return 'valid';
    } catch (error) {
        console.error("Gemini API Key validation failed:", error);
        return 'invalid';
    }
};


export const getStockAnalysis = async (ticker: string, portfolio: Holding[]): Promise<StockAnalysis> => {
  try {
    if (!process.env.API_KEY) {
      throw new Error("Gemini API key not configured. The API_KEY environment variable is missing.");
    }
    const prompt = `
      Analyze the stock with ticker symbol "${ticker}". 
      Consider its recent performance, market sentiment, and its position relative to the user's current portfolio.
      ${formatPortfolioForPrompt(portfolio)}
      Provide a buy, sell, or hold signal, a confidence score (0-1), a potential price target, and a brief reasoning.
    `;

    const response = await ai.models.generateContent({
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
    if (!process.env.API_KEY) {
      throw new Error("Gemini API key not configured. The API_KEY environment variable is missing.");
    }
    const prompt = `Summarize the latest news for the company with stock ticker "${ticker}". Provide a concise summary of the top 3-5 recent developments based on search results.`;

    const response = await ai.models.generateContent({
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
    if (!process.env.API_KEY) {
      throw new Error("Gemini API key not configured. The API_KEY environment variable is missing.");
    }
    const prompt = `
      Based on the user's current portfolio, recommend 3 new stocks to consider buying for diversification and growth.
      ${formatPortfolioForPrompt(portfolio)}
      For each recommendation, provide the ticker, company name, and a strong, concise reason why it's a good fit for this specific portfolio.
    `;
    
    const response = await ai.models.generateContent({
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