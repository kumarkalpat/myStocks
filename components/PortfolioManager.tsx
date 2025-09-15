import React, { useState } from 'react';
import { Holding, NewHolding, StockQuote } from '../types';
import { PlusIcon } from './icons/PlusIcon';
import { TrashIcon } from './icons/TrashIcon';
import { ChevronDownIcon } from './icons/ChevronDownIcon';

interface PortfolioManagerProps {
  portfolio: Holding[];
  marketData: Record<string, StockQuote>;
  isMarketDataLoading: boolean;
  portfolioValue: number;
  portfolioCost: number;
  netGain: number;
  netGainPercent: number;
  onAddHolding: (holding: NewHolding) => void;
  onRemoveHolding: (ticker: string) => void;
  onSelectTicker: (ticker: string) => void;
  selectedTicker: string;
  appIsLoading: boolean;
}

const formatCurrency = (value: number, sign: boolean = false) => {
    const options = { style: 'currency', currency: 'USD', signDisplay: sign ? 'exceptZero' : 'auto' } as const;
    return new Intl.NumberFormat('en-US', options).format(value);
};

const PortfolioManager: React.FC<PortfolioManagerProps> = ({ 
  portfolio, marketData, isMarketDataLoading,
  portfolioValue, netGain, netGainPercent,
  onAddHolding, onRemoveHolding, onSelectTicker, selectedTicker, appIsLoading 
}) => {
  const [ticker, setTicker] = useState('');
  const [shares, setShares] = useState('');
  const [price, setPrice] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [expandedTicker, setExpandedTicker] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (ticker && shares) {
      onAddHolding({
        ticker: ticker.toUpperCase(),
        shares: parseFloat(shares),
        purchasePrice: parseFloat(price) || 0,
      });
      setTicker('');
      setShares('');
      setPrice('');
      setIsAdding(false);
    }
  };
  
  const gainLossColor = netGain >= 0 ? 'text-brand-success' : 'text-brand-danger';

  return (
    <div className="bg-brand-secondary rounded-lg border border-brand-border shadow-lg p-4 h-full flex flex-col">
      <h2 className="text-2xl font-bold mb-1 text-brand-text">My Portfolio</h2>
      <div className="flex items-baseline gap-4 mb-4">
        <p className="text-brand-subtle">Value: <span className="text-brand-accent font-semibold">{formatCurrency(portfolioValue)}</span></p>
        <p className={`text-sm ${gainLossColor}`}>
            <span className="font-semibold">{formatCurrency(netGain, true)} ({netGainPercent.toFixed(2)}%)</span>
        </p>
      </div>
      
      <div className="flex-grow overflow-y-auto pr-2 -mr-2">
        {portfolio.length === 0 && !isAdding ? (
            <div className="h-full flex items-center justify-center text-center text-brand-subtle">
                <p>Your portfolio is empty.<br/>Add a holding to get started.</p>
            </div>
        ) : (
            <ul className="space-y-3">
              {portfolio.map(holding => {
                const quote = marketData[holding.ticker];
                const totalShares = holding.purchases.reduce((sum, p) => sum + p.shares, 0);
                const totalCost = holding.purchases.reduce((sum, p) => sum + p.shares * p.purchasePrice, 0);
                const avgPrice = totalShares > 0 ? totalCost / totalShares : 0;
                
                const currentValue = quote ? totalShares * quote.currentPrice : 0;
                const gainLoss = currentValue - totalCost;
                const gainLossColor = gainLoss >= 0 ? 'text-brand-success' : 'text-brand-danger';
                const dayChangeColor = quote && quote.change >= 0 ? 'text-brand-success' : 'text-brand-danger';

                const isExpanded = expandedTicker === holding.ticker;

                return (
                  <li key={holding.ticker}>
                    <div 
                      onClick={() => onSelectTicker(holding.ticker)}
                      className={`flex items-center justify-between p-3 rounded-t-md cursor-pointer transition-all duration-200 ${selectedTicker === holding.ticker ? 'bg-brand-accent/20 border-brand-accent' : 'bg-brand-primary hover:bg-brand-border/50 border-brand-border'} border-l border-r border-t ${isExpanded ? 'rounded-b-none' : 'rounded-b-md'}`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2">
                          <p className="font-bold text-lg text-brand-text">{holding.ticker}</p>
                          <p className="text-sm text-brand-subtle truncate" title={holding.companyName}>{holding.companyName}</p>
                        </div>
                        <p className="text-sm text-brand-subtle">{totalShares.toFixed(2)} shares @ avg {formatCurrency(avgPrice)}</p>
                      </div>
                      <div className="text-right ml-2 flex-shrink-0">
                          {isMarketDataLoading || !quote ? (
                            <div className="h-4 w-16 bg-brand-primary animate-pulse rounded-md my-1"></div>
                          ) : (
                            <>
                              <p className="font-bold text-brand-text">{formatCurrency(quote.currentPrice)}</p>
                              <p className={`text-sm ${dayChangeColor}`}>{formatCurrency(quote.change, true)} ({quote.percentChange.toFixed(2)}%)</p>
                            </>
                          )}
                           <p className={`text-sm font-semibold ${gainLossColor}`}>{formatCurrency(gainLoss, true)}</p>
                      </div>
                      <div className="flex flex-col items-center ml-2">
                        <button onClick={(e) => { e.stopPropagation(); setExpandedTicker(isExpanded ? null : holding.ticker); }} className="p-1 rounded-full hover:bg-brand-border/80 text-brand-subtle hover:text-brand-text transition-colors">
                          <ChevronDownIcon className={`w-5 h-5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); onRemoveHolding(holding.ticker); }} className="p-1 rounded-full hover:bg-brand-danger/20 text-brand-subtle hover:text-brand-danger transition-colors mt-1">
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="bg-brand-primary border-l border-r border-b border-brand-border rounded-b-md p-3 animate-fade-in">
                          <h4 className="text-sm font-semibold text-brand-subtle mb-2">Purchase Lots</h4>
                          <ul className="space-y-1 text-sm text-brand-subtle">
                              {holding.purchases.map((p, index) => (
                                  <li key={index} className="flex justify-between">
                                      <span>{p.shares} shares</span>
                                      <span>@ {formatCurrency(p.purchasePrice)}</span>
                                  </li>
                              ))}
                          </ul>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-brand-border">
        {isAdding ? (
          <form onSubmit={handleSubmit} className="space-y-3">
            <input type="text" value={ticker} onChange={e => setTicker(e.target.value)} placeholder="Ticker (e.g., AAPL)" className="w-full bg-brand-primary border border-brand-border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-accent" required />
            <div className="grid grid-cols-2 gap-3">
              <input type="number" value={shares} onChange={e => setShares(e.target.value)} placeholder="Shares" className="w-full bg-brand-primary border border-brand-border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-accent" required />
              <input type="number" step="0.01" value={price} onChange={e => setPrice(e.target.value)} placeholder="Purchase Price" className="w-full bg-brand-primary border border-brand-border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-accent" required />
            </div>
            <div className="flex items-center gap-3">
              <button type="submit" disabled={appIsLoading} className="flex-1 bg-brand-accent text-white font-bold py-2 px-4 rounded-md hover:bg-opacity-80 transition-colors disabled:bg-brand-subtle disabled:cursor-not-allowed">
                {appIsLoading ? 'Adding...' : 'Add Holding'}
              </button>
              <button type="button" onClick={() => setIsAdding(false)} className="bg-brand-border text-brand-text font-bold py-2 px-4 rounded-md hover:bg-opacity-80 transition-colors">Cancel</button>
            </div>
          </form>
        ) : (
          <button onClick={() => setIsAdding(true)} className="w-full flex items-center justify-center gap-2 bg-brand-accent/20 text-brand-accent font-bold py-2 px-4 rounded-md hover:bg-brand-accent/30 transition-colors">
            <PlusIcon className="w-5 h-5" />
            <span>Add New Holding</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default PortfolioManager;