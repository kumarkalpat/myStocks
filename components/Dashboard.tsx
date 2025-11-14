import React, { useCallback, useEffect, useState } from 'react';
import { Holding, StockAnalysis, StockNews, StockRecommendation, AnalysisType, ChartDataPoint, StockFundamentals } from '../types';
import { getStockAnalysis, getStockNews, getRecommendations, getFundamentalAnalysis } from '../services/geminiService';
import { getHistoricalData } from '../services/marketDataService';
import StockChart from './StockChart';
import AnalysisResult from './AnalysisResult';
import { BrainIcon } from './icons/BrainIcon';
import { NewspaperIcon } from './icons/NewspaperIcon';
import { StarIcon } from './icons/StarIcon';
import { ClipboardDocumentListIcon } from './icons/ClipboardDocumentListIcon';

export type ChartRange = '5Y' | '1Y' | 'YTD';

interface DashboardProps {
  portfolio: Holding[];
  selectedTicker: string;
  analysis: StockAnalysis | StockNews | StockRecommendation[] | StockFundamentals | null;
  analysisType: AnalysisType | null;
  isLoading: boolean;
  error: string | null;
  setAnalysis: React.Dispatch<React.SetStateAction<StockAnalysis | StockNews | StockRecommendation[] | StockFundamentals | null>>;
  setAnalysisType: React.Dispatch<React.SetStateAction<AnalysisType | null>>;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
}

const Dashboard: React.FC<DashboardProps> = ({
  portfolio,
  selectedTicker,
  analysis,
  analysisType,
  isLoading,
  error,
  setAnalysis,
  setAnalysisType,
  setIsLoading,
  setError,
}) => {
  const [chartRange, setChartRange] = useState<ChartRange>('1Y');
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [isChartLoading, setIsChartLoading] = useState<boolean>(true);
  const [chartError, setChartError] = useState<string | null>(null);

  const handleFetchAnalysis = useCallback(async (type: AnalysisType) => {
    setIsLoading(true);
    setError(null);
    setAnalysis(null);
    setAnalysisType(type);

    try {
      let result;
      if (type === AnalysisType.ANALYSIS) {
        result = await getStockAnalysis(selectedTicker, portfolio);
      } else if (type === AnalysisType.NEWS) {
        result = await getStockNews(selectedTicker);
      } else if (type === AnalysisType.RECOMMENDATIONS) {
        result = await getRecommendations(portfolio);
      } else if (type === AnalysisType.FUNDAMENTALS) {
        result = await getFundamentalAnalysis(selectedTicker);
      }
      setAnalysis(result || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedTicker, portfolio, setIsLoading, setError, setAnalysis, setAnalysisType]);
  
  // Fetch chart data
  useEffect(() => {
    const fetchChartData = async () => {
      if (!selectedTicker) return;
      setIsChartLoading(true);
      setChartError(null);
      try {
        const data = await getHistoricalData(selectedTicker, chartRange);
        setChartData(data);
      } catch (err) {
        setChartError(err instanceof Error ? err.message : 'Failed to load chart data.');
        setChartData([]); // Clear data on error
      } finally {
        setIsChartLoading(false);
      }
    };
    fetchChartData();
  }, [selectedTicker, chartRange]);

  // Auto-fetch analysis when ticker changes
  useEffect(() => {
    if (selectedTicker) {
        handleFetchAnalysis(AnalysisType.ANALYSIS);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTicker]);

  const chartRanges: ChartRange[] = ['5Y', '1Y', 'YTD'];

  return (
    <div className="bg-brand-secondary rounded-lg border border-brand-border shadow-lg p-4 md:p-6 h-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
        <h2 className="text-3xl font-bold text-brand-text mb-2 sm:mb-0">
          Analysis for <span className="text-brand-accent">{selectedTicker}</span>
        </h2>
        <div className="flex items-center bg-brand-primary border border-brand-border rounded-full p-1">
          {chartRanges.map((range) => (
            <button
              key={range}
              onClick={() => setChartRange(range)}
              className={`px-3 py-1 text-sm font-semibold rounded-full transition-colors ${chartRange === range ? 'bg-brand-accent text-white' : 'text-brand-subtle hover:text-brand-text'}`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>
      <div className="mb-6">
        <StockChart 
          data={chartData} 
          isLoading={isChartLoading}
          error={chartError}
        />
      </div>

      <div className="mb-6">
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => handleFetchAnalysis(AnalysisType.ANALYSIS)}
              disabled={isLoading}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${analysisType === AnalysisType.ANALYSIS ? 'bg-brand-accent text-white' : 'bg-brand-border text-brand-subtle hover:bg-brand-border/70'}`}
            >
              <BrainIcon className="w-5 h-5" /> AI Analysis
            </button>
            <button
              onClick={() => handleFetchAnalysis(AnalysisType.FUNDAMENTALS)}
              disabled={isLoading}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${analysisType === AnalysisType.FUNDAMENTALS ? 'bg-brand-accent text-white' : 'bg-brand-border text-brand-subtle hover:bg-brand-border/70'}`}
            >
              <ClipboardDocumentListIcon className="w-5 h-5" /> Fundamentals
            </button>
            <button
              onClick={() => handleFetchAnalysis(AnalysisType.NEWS)}
              disabled={isLoading}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${analysisType === AnalysisType.NEWS ? 'bg-brand-accent text-white' : 'bg-brand-border text-brand-subtle hover:bg-brand-border/70'}`}
            >
              <NewspaperIcon className="w-5 h-5" /> Recent News
            </button>
            <button
              onClick={() => handleFetchAnalysis(AnalysisType.RECOMMENDATIONS)}
              disabled={isLoading}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${analysisType === AnalysisType.RECOMMENDATIONS ? 'bg-brand-accent text-white' : 'bg-brand-border text-brand-subtle hover:bg-brand-border/70'}`}
            >
              <StarIcon className="w-5 h-5" /> Recommend Stocks
            </button>
          </div>
        </div>

      <div>
        <AnalysisResult 
          analysis={analysis}
          analysisType={analysisType}
          isLoading={isLoading}
          error={error}
        />
      </div>
    </div>
  );
};

export default Dashboard;