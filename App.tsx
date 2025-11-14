import React, { useState, useMemo, useEffect } from 'react';
import { Holding, StockAnalysis, StockNews, StockRecommendation, AnalysisType, NewHolding, StockQuote, StockFundamentals } from './types';
import PortfolioManager from './components/PortfolioManager';
import Dashboard from './components/Dashboard';
import Header from './components/Header';
import Footer from './components/Footer';
import { getCompanyProfile, getQuote } from './services/marketDataService';

const getInitialPortfolio = (): Holding[] => {
  try {
    const savedPortfolio = localStorage.getItem('stockPortfolio');
    if (savedPortfolio) {
      return JSON.parse(savedPortfolio);
    }
  } catch (error) {
    console.error("Failed to parse portfolio from localStorage", error);
    localStorage.removeItem('stockPortfolio'); // Clear potentially corrupted data
  }
  // If nothing in localStorage, return sample data
  return [
    { ticker: 'GOOGL', companyName: 'Alphabet Inc.', purchases: [{ shares: 10, purchasePrice: 150.75 }] },
    { ticker: 'AAPL', companyName: 'Apple Inc.', purchases: [{ shares: 25, purchasePrice: 170.25 }, { shares: 10, purchasePrice: 165.50 }] },
    { ticker: 'TSLA', companyName: 'Tesla, Inc.', purchases: [{ shares: 15, purchasePrice: 220.50 }] },
  ];
};

const App: React.FC = () => {
  const [portfolio, setPortfolio] = useState<Holding[]>(getInitialPortfolio);
  const [marketData, setMarketData] = useState<Record<string, StockQuote>>({});
  const [isMarketDataLoading, setIsMarketDataLoading] = useState<boolean>(true);
  const [selectedTicker, setSelectedTicker] = useState<string>('GOOGL');
  const [analysis, setAnalysis] = useState<StockAnalysis | StockNews | StockRecommendation[] | StockFundamentals | null>(null);
  const [analysisType, setAnalysisType] = useState<AnalysisType | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Persist portfolio to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem('stockPortfolio', JSON.stringify(portfolio));
    } catch (error) {
      console.error("Failed to save portfolio to localStorage", error);
    }
  }, [portfolio]);

  // Fetch live market data for portfolio holdings
  useEffect(() => {
    const fetchMarketData = async () => {
      if (portfolio.length === 0) {
        setMarketData({});
        setIsMarketDataLoading(false);
        return;
      }
      setIsMarketDataLoading(true);
      try {
        const quotes = await Promise.all(
          portfolio.map(holding => getQuote(holding.ticker))
        );
        const marketDataMap = portfolio.reduce((acc, holding, index) => {
          acc[holding.ticker] = quotes[index];
          return acc;
        }, {} as Record<string, StockQuote>);
        setMarketData(marketDataMap);
      } catch (err) {
        // Set a general error, specific errors are handled in the service
        setError(err instanceof Error ? err.message : 'Could not fetch market data.');
      } finally {
        setIsMarketDataLoading(false);
      }
    };
    
    fetchMarketData();
  }, [portfolio]);

  const { portfolioCost, portfolioCurrentValue, netGain, netGainPercent } = useMemo(() => {
    const cost = portfolio.reduce((acc, holding) => {
      const holdingCost = holding.purchases.reduce((pAcc, p) => pAcc + (p.shares * p.purchasePrice), 0);
      return acc + holdingCost;
    }, 0);

    const currentValue = portfolio.reduce((acc, holding) => {
      const quote = marketData[holding.ticker];
      const totalShares = holding.purchases.reduce((pAcc, p) => pAcc + p.shares, 0);
      if (quote) {
        return acc + (totalShares * quote.currentPrice);
      }
      return acc;
    }, 0);

    const gain = currentValue - cost;
    const gainPercent = cost > 0 ? (gain / cost) * 100 : 0;

    return {
      portfolioCost: cost,
      portfolioCurrentValue: currentValue,
      netGain: gain,
      netGainPercent: gainPercent
    };
  }, [portfolio, marketData]);

  const handleAddHolding = async (newPurchase: NewHolding) => {
    const tickerUpper = newPurchase.ticker.toUpperCase();
    const existingHoldingIndex = portfolio.findIndex(h => h.ticker === tickerUpper);
    setError(null); // Clear previous errors

    if (existingHoldingIndex > -1) {
      // Ticker already exists, add new purchase to it
      const updatedPortfolio = [...portfolio];
      updatedPortfolio[existingHoldingIndex].purchases.push({ 
        shares: newPurchase.shares, 
        purchasePrice: newPurchase.purchasePrice 
      });
      setPortfolio(updatedPortfolio);
    } else {
      // New ticker, fetch company name and create new holding
      setIsLoading(true); // Use main loader for this async op
      try {
          const profile = await getCompanyProfile(tickerUpper);
          const newHolding: Holding = {
              ticker: tickerUpper,
              companyName: profile.name || tickerUpper, // Fallback to ticker if name not found
              purchases: [{ shares: newPurchase.shares, purchasePrice: newPurchase.purchasePrice }],
          };
          setPortfolio(prev => [...prev, newHolding]);
          if (!selectedTicker) setSelectedTicker(tickerUpper);
      } catch (err) {
          setError(err instanceof Error ? err.message : `Could not find company data for ${tickerUpper}.`);
      } finally {
          setIsLoading(false);
      }
    }
  };

  const handleRemoveHolding = (ticker: string) => {
    setPortfolio(prev => {
        const newPortfolio = prev.filter(h => h.ticker !== ticker);
        // If the removed ticker was the selected one, select the first one in the new list or null
        if (selectedTicker === ticker) {
            setSelectedTicker(newPortfolio.length > 0 ? newPortfolio[0].ticker : '');
        }
        return newPortfolio;
    });
  };

  return (
    <div className="min-h-screen bg-brand-primary font-sans">
      <Header />
      <main className="container mx-auto p-4 md:p-6 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          <div className="lg:col-span-1">
            <PortfolioManager 
              portfolio={portfolio} 
              marketData={marketData}
              isMarketDataLoading={isMarketDataLoading}
              portfolioValue={portfolioCurrentValue}
              portfolioCost={portfolioCost}
              netGain={netGain}
              netGainPercent={netGainPercent}
              onAddHolding={handleAddHolding}
              onRemoveHolding={handleRemoveHolding}
              onSelectTicker={setSelectedTicker}
              selectedTicker={selectedTicker}
              appIsLoading={isLoading}
            />
          </div>
          <div className="lg:col-span-2">
            <Dashboard
              portfolio={portfolio}
              selectedTicker={selectedTicker}
              analysis={analysis}
              analysisType={analysisType}
              isLoading={isLoading}
              error={error}
              setAnalysis={setAnalysis}
              setAnalysisType={setAnalysisType}
              setIsLoading={setIsLoading}
              setError={setError}
            />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default App;
