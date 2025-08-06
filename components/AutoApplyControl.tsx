import React, { useState } from 'react';

interface AutoApplyControlProps {
    onStart: (maxApplies: number | null) => void;
    onStop: () => void;
    isBotRunning: boolean;
    disabled: boolean;
    applicationsSent: number;
}

const AutoApplyControl: React.FC<AutoApplyControlProps> = ({ onStart, onStop, isBotRunning, disabled, applicationsSent }) => {
    const [maxApplies, setMaxApplies] = useState<string>('');

    const handleStartClick = () => {
        const num = maxApplies.trim() === '' ? null : parseInt(maxApplies, 10);
        if (!isNaN(num as any) && (num === null || num > 0)) {
            onStart(num);
        } else if (num !== null) {
             setMaxApplies(''); // Reset if invalid number
        }
    };
    
    const isStartDisabled = disabled || isBotRunning;

    return (
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 space-y-4">
            <h3 className="text-lg font-bold text-white">Управление ботом авто-отклика</h3>
            <div className="flex flex-col sm:flex-row items-center gap-4">
                 <div className="flex-grow w-full sm:w-auto">
                    <label htmlFor="maxApplies" className="block text-sm font-medium text-slate-300 mb-1">
                        Количество откликов (пусто = бесконечно)
                    </label>
                    <input
                        type="number"
                        id="maxApplies"
                        min="1"
                        value={maxApplies}
                        onChange={(e) => setMaxApplies(e.target.value)}
                        placeholder="Например, 10"
                        className="w-full bg-slate-700 text-white placeholder-slate-400 border border-slate-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-cyan-500 focus:outline-none transition duration-200 disabled:bg-slate-800 disabled:cursor-not-allowed"
                        disabled={isBotRunning}
                    />
                </div>
                {!isBotRunning ? (
                     <button
                        onClick={handleStartClick}
                        disabled={isStartDisabled}
                        title={disabled ? "Сначала выполните поиск и настройте ассистента" : "Запустить бота"}
                        className="w-full sm:w-auto h-10 px-6 font-semibold rounded-md bg-green-600 hover:bg-green-500 text-white transition-all duration-200 disabled:bg-slate-500 disabled:cursor-not-allowed flex items-center justify-center self-end"
                     >
                        Запустить бота
                    </button>
                ) : (
                    <button
                        onClick={onStop}
                        className="w-full sm:w-auto h-10 px-6 font-semibold rounded-md bg-red-600 hover:bg-red-500 text-white transition-all duration-200 flex items-center justify-center self-end"
                    >
                        Остановить бота
                    </button>
                )}
            </div>
            {isBotRunning && (
                <div className="text-center text-cyan-400 font-mono pt-2">
                    Отправлено откликов: {applicationsSent}
                </div>
            )}
        </div>
    );
};

export default AutoApplyControl;
