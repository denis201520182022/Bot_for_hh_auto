import React from 'react';
import LoadingSpinner from './LoadingSpinner';

const BotWorking: React.FC = () => {
    return (
        <div className="text-center p-8 flex flex-col items-center justify-center h-full bg-slate-900/50 rounded-lg min-h-[300px]">
            <LoadingSpinner size="lg"/>
            <h2 className="text-2xl font-bold mt-4 text-cyan-400">Бот в работе</h2>
            <p className="text-slate-300 mt-2">
                Следите за процессом в окне логов ниже.
            </p>
            <p className="text-slate-500 mt-1 text-sm">
                Интерфейс заблокирован до завершения или остановки бота.
            </p>
        </div>
    );
};

export default BotWorking;