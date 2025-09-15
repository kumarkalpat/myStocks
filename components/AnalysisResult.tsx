import React from 'react';
import { StockAnalysis, StockNews, StockRecommendation, AnalysisType } from '../types';
import { ExternalLinkIcon } from './icons/ExternalLinkIcon';
import { StarIcon } from './icons/StarIcon';
import { TrendingUpIcon } from './icons/TrendingUpIcon';
import { TrendingDownIcon } from './icons/TrendingDownIcon';

interface AnalysisResultProps {
  analysis: StockAnalysis | StockNews | StockRecommendation[] | null;
  analysisType: AnalysisType | null;
  isLoading: boolean;
  error: string | null;
}

const LoadingSpinner: React.FC = () => (
    <div className="flex flex-col items-center justify-center p-8 space-y-4">
      <div className="w-12 h-12 border-4 border-brand-accent border-t-transparent rounded-full animate-spin"></div>
      <p className="text-brand-subtle">Gemini is analyzing...</p>
    </div>
);

const ErrorDisplay: React.FC<{ message: string }> = ({ message }) => (
    <div className="bg-brand-danger/10 border border-brand-danger/30 rounded-lg p-4 text-center">
      <h3 className="font-bold text-brand-danger mb-2">Analysis Failed</h3>
      <p className="text-brand-subtle text-sm">{message}</p>
      <p className="text-brand-subtle text-sm mt-1">Please ensure your Gemini API key is configured correctly.</p>
    </div>
);

const AnalysisContent: React.FC<{ analysis: StockAnalysis }> = ({ analysis }) => {
    const signalColor = analysis.buy_sell_hold_signal === 'BUY' ? 'text-brand-success' : analysis.buy_sell_hold_signal === 'SELL' ? 'text-brand-danger' : 'text-yellow-400';
    const confidenceWidth = `${analysis.confidence_score * 100}%`;

    return (
        <div className="space-y-4 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                <div className="bg-brand-primary p-4 rounded-lg">
                    <p className="text-sm text-brand-subtle mb-1">Signal</p>
                    <p className={`text-2xl font-bold ${signalColor}`}>{analysis.buy_sell_hold_signal}</p>
                </div>
                <div className="bg-brand-primary p-4 rounded-lg">
                    <p className="text-sm text-brand-subtle mb-1">Price Target</p>
                    <p className="text-2xl font-bold text-brand-text">${analysis.target_price.toFixed(2)}</p>
                </div>
                <div className="bg-brand-primary p-4 rounded-lg">
                    <p className="text-sm text-brand-subtle mb-1">Confidence</p>
                    <div className="w-full bg-brand-border rounded-full h-2.5 mt-2">
                        <div className="bg-brand-accent h-2.5 rounded-full" style={{ width: confidenceWidth }}></div>
                    </div>
                    <p className="text-lg font-bold text-brand-text mt-1">{(analysis.confidence_score * 100).toFixed(0)}%</p>
                </div>
            </div>
            <div>
                <h4 className="font-bold text-brand-text text-lg mb-2">Summary</h4>
                <p className="text-brand-subtle">{analysis.summary}</p>
            </div>
            <div>
                <h4 className="font-bold text-brand-text text-lg mb-2">Reasoning</h4>
                <p className="text-brand-subtle whitespace-pre-wrap">{analysis.reasoning}</p>
            </div>
        </div>
    );
};

const NewsContent: React.FC<{ news: StockNews }> = ({ news }) => (
    <div className="space-y-6 animate-fade-in">
        <div>
            <h4 className="font-bold text-brand-text text-lg mb-2">News Summary</h4>
            <p className="text-brand-subtle whitespace-pre-wrap">{news.summary}</p>
        </div>

        {news.articles && news.articles.length > 0 && (
            <div>
                <h4 className="font-bold text-brand-text text-lg mb-3">Sources</h4>
                <div className="space-y-3">
                    {news.articles.map((article, index) => (
                        <div key={index} className="bg-brand-primary p-3 rounded-lg border border-brand-border">
                            <a href={article.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between group">
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-brand-text group-hover:text-brand-accent transition-colors truncate">{article.title}</p>
                                    <p className="text-sm text-brand-subtle">{article.source}</p>
                                </div>
                                <ExternalLinkIcon className="w-5 h-5 text-brand-subtle group-hover:text-brand-accent transition-colors ml-4 flex-shrink-0" />
                            </a>
                        </div>
                    ))}
                </div>
            </div>
        )}
    </div>
);

const RecommendationsContent: React.FC<{ recommendations: StockRecommendation[] }> = ({ recommendations }) => (
    <div className="space-y-4 animate-fade-in">
        {recommendations.map((rec, index) => (
            <div key={index} className="bg-brand-primary p-4 rounded-lg">
                <div className="flex items-center gap-3 mb-2">
                    <div className="bg-brand-accent/20 p-2 rounded-full">
                        <StarIcon className="w-5 h-5 text-brand-accent" />
                    </div>
                    <div>
                        <h4 className="font-bold text-brand-text text-lg">{rec.ticker}</h4>
                        <p className="text-sm text-brand-subtle">{rec.company_name}</p>
                    </div>
                </div>
                <p className="text-brand-subtle">{rec.reason}</p>
            </div>
        ))}
    </div>
);


const AnalysisResult: React.FC<AnalysisResultProps> = ({ analysis, analysisType, isLoading, error }) => {
  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorDisplay message={error} />;
  if (!analysis || !analysisType) return (
    <div className="text-center p-8">
      <p className="text-brand-subtle">Select an analysis option above to get started.</p>
    </div>
  );

  return (
    <div className="min-h-[200px]">
      {analysisType === AnalysisType.ANALYSIS && <AnalysisContent analysis={analysis as StockAnalysis} />}
      {analysisType === AnalysisType.NEWS && <NewsContent news={analysis as StockNews} />}
      {analysisType === AnalysisType.RECOMMENDATIONS && <RecommendationsContent recommendations={analysis as StockRecommendation[]} />}
    </div>
  );
};

export default AnalysisResult;