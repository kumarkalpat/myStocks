import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ChartDataPoint } from '../types';

interface StockChartProps {
  data: ChartDataPoint[];
  isLoading: boolean;
  error: string | null;
}

const CustomTooltip: React.FC<any> = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        const fullDate = new Date(label).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
        return (
            <div style={{
              backgroundColor: '#161B22',
              border: '1px solid #30363D',
              borderRadius: '0.5rem',
              padding: '0.5rem 1rem',
              color: '#C9D1D9',
              boxShadow: '0 4px 6px rgba(0,0,0,0.2)'
            }}>
                <p style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>{fullDate}</p>
                <p>{`Price: $${payload[0].value.toFixed(2)}`}</p>
            </div>
        );
    }
    return null;
};

const ChartMessage: React.FC<{ message: string, isError?: boolean }> = ({ message, isError = false }) => (
    <div className={`h-full w-full flex items-center justify-center p-4 rounded-lg ${isError ? 'bg-brand-danger/10 text-brand-danger' : 'bg-brand-primary text-brand-subtle'}`}>
      <p>{message}</p>
    </div>
);

const ChartSpinner: React.FC = () => (
    <div className="h-full w-full flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-brand-accent border-t-transparent rounded-full animate-spin"></div>
    </div>
);


const StockChart: React.FC<StockChartProps> = ({ data, isLoading, error }) => {
  const chartWrapper = (content: React.ReactNode) => (
    <div className="h-64 w-full">{content}</div>
  );

  if (isLoading) {
    return chartWrapper(<ChartSpinner />);
  }

  if (error) {
    return chartWrapper(<ChartMessage message={error} isError />);
  }

  if (!data || data.length === 0) {
    return chartWrapper(<ChartMessage message="No data available for this stock." />);
  }
  
  const gradientId = `colorPrice-${data[0]?.date || 'id'}`;
  const latestPrice = data[data.length - 1]?.price || 0;
  const firstPrice = data[0]?.price || 0;
  const isUp = latestPrice >= firstPrice;
  const strokeColor = isUp ? '#238636' : '#DA3633';
  const gradientColor = isUp ? '#238636' : '#DA3633';

  return chartWrapper(
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={gradientColor} stopOpacity={0.4}/>
              <stop offset="95%" stopColor={gradientColor} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#30363D" />
          <XAxis 
            dataKey="shortDate" 
            stroke="#8B949E" 
            fontSize={12} 
            tickLine={false} 
            axisLine={false} 
            interval={Math.floor(data.length / 6)}
          />
          <YAxis 
            stroke="#8B949E" 
            fontSize={12} 
            tickLine={false} 
            axisLine={false} 
            tickFormatter={(value) => `$${Math.round(value)}`} 
            domain={['dataMin - (dataMin * 0.05)', 'dataMax + (dataMax * 0.05)']}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area type="monotone" dataKey="price" stroke={strokeColor} strokeWidth={2} fillOpacity={1} fill={`url(#${gradientId})`} dot={false} />
        </AreaChart>
      </ResponsiveContainer>
  );
};

export default StockChart;