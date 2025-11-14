import React from 'react';
import { ChartBarIcon } from './icons/ChartBarIcon';

const Header: React.FC = () => {
  return (
    <header className="bg-brand-secondary/50 backdrop-blur-sm border-b border-brand-border sticky top-0 z-10">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-3">
            <ChartBarIcon className="h-8 w-8 text-brand-accent" />
            <h1 className="text-xl font-bold text-brand-text">
              Stock Portfolio Analyst
            </h1>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
