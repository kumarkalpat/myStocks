export interface Purchase {
  shares: number;
  purchasePrice: number;
}

export interface Holding {
  ticker: string;
  companyName: string;
  purchases: Purchase[];
}

export interface NewHolding {
  ticker: string;
  shares: number;
  purchasePrice: number;
}

export interface StockAnalysis {
  ticker: string;
  summary: string;
  buy_sell_hold_signal: 'BUY' | 'SELL' | 'HOLD';
  confidence_score: number;
  target_price: number;
  reasoning: string;
}

export interface StockNews {
  summary: string;
  articles: {
    title: string;
    url: string;
    source: string;
  }[];
}

export interface StockRecommendation {
  ticker: string;
  company_name: string;
  reason: string;
}

export enum AnalysisType {
  ANALYSIS = 'ANALYSIS',
  NEWS = 'NEWS',
  RECOMMENDATIONS = 'RECOMMENDATIONS'
}

export interface ChartDataPoint {
  date: string;
  shortDate: string;
  price: number;
}

export interface StockQuote {
  currentPrice: number;
  change: number;
  percentChange: number;
  previousClose: number;
}