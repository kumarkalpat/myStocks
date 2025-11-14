import React, { useState } from 'react';
import { saveApiKeys } from '../services/configService';

const ApiConfiguration: React.FC = () => {
    const [geminiKey, setGeminiKey] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = () => {
        if (!geminiKey.trim()) {
            alert('Please provide the Gemini API key.');
            return;
        }
        setIsSaving(true);
        saveApiKeys(geminiKey);
        // Reload to apply keys and re-validate
        window.location.reload();
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-brand-primary">
            <div className="w-full max-w-lg p-8 space-y-6 bg-brand-secondary rounded-lg border border-brand-border shadow-2xl">
                <div>
                    <h2 className="text-3xl font-bold text-center text-brand-text">API Key Configuration</h2>
                    <p className="mt-2 text-center text-sm text-brand-subtle">
                        Your Gemini API key is required to fetch market data and perform analysis.
                        It is stored securely in your browser's local storage.
                    </p>
                </div>
                <div className="space-y-4">
                    <div>
                        <label htmlFor="gemini-key" className="block text-sm font-medium text-brand-subtle">
                            Google Gemini API Key
                        </label>
                        <input
                            id="gemini-key"
                            type="password"
                            value={geminiKey}
                            onChange={(e) => setGeminiKey(e.target.value)}
                            placeholder="Enter your Gemini API Key"
                            className="mt-1 block w-full bg-brand-primary border border-brand-border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-accent"
                        />
                         <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-xs text-brand-accent hover:underline mt-1 inline-block">Get a Gemini API Key</a>
                    </div>
                </div>
                <div>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-accent hover:bg-opacity-80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-accent disabled:bg-brand-subtle disabled:cursor-wait"
                    >
                        {isSaving ? 'Saving...' : 'Save and Continue'}
                    </button>
                </div>
                 <p className="text-xs text-center text-brand-subtle">
                    This app uses a client-side key for seamless deployment on static platforms.
                </p>
            </div>
        </div>
    );
};

export default ApiConfiguration;