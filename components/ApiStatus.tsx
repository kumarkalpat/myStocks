import React from 'react';

export type ApiStatusType = 'checking' | 'valid' | 'invalid' | 'missing';

interface ApiStatusProps {
  serviceName: string;
  status: ApiStatusType;
}

const statusConfig: Record<ApiStatusType, { color: string; tooltip: string; animate?: boolean }> = {
  checking: {
    color: 'bg-yellow-500',
    tooltip: 'Verifying API key...',
    animate: true,
  },
  valid: {
    color: 'bg-brand-success',
    tooltip: 'API key is valid and connected.',
  },
  invalid: {
    color: 'bg-brand-danger',
    tooltip: 'API key is invalid or has been rejected.',
  },
  missing: {
    color: 'bg-brand-danger',
    tooltip: 'API key environment variable is missing.',
  },
};

const ApiStatus: React.FC<ApiStatusProps> = ({ serviceName, status }) => {
  const { color, tooltip, animate } = statusConfig[status];

  return (
    <div className="group relative flex items-center space-x-2">
      <span className="text-sm text-brand-subtle">{serviceName}</span>
      <div className={`w-2.5 h-2.5 rounded-full ${color} ${animate ? 'animate-pulse' : ''}`}></div>
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max px-2 py-1 bg-brand-primary text-brand-text text-xs rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-20">
        {tooltip}
      </div>
    </div>
  );
};

export default ApiStatus;