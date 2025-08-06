import React, { useEffect, useRef } from 'react';
import { BotLogEntry, LogType } from '../types';

interface BotLogProps {
    logEntries: BotLogEntry[];
}

const getLogColor = (type: LogType): string => {
    switch (type) {
        case 'success': return 'text-green-400';
        case 'error': return 'text-red-400 font-bold';
        case 'pause': return 'text-yellow-400';
        case 'special': return 'text-cyan-400 font-bold';
        default: return 'text-slate-400';
    }
}

const BotLog: React.FC<BotLogProps> = ({ logEntries }) => {
    const scrollableContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollableContainerRef.current) {
            scrollableContainerRef.current.scrollTop = scrollableContainerRef.current.scrollHeight;
        }
    }, [logEntries]);

    return (
        <div className="bg-black border border-slate-700 rounded-lg p-4 h-64 font-mono text-sm space-y-2 flex flex-col">
            <h3 className="text-white font-bold mb-2 flex-shrink-0">Лог работы бота</h3>
            <div ref={scrollableContainerRef} className="flex-grow overflow-y-auto pr-2">
                 {logEntries.map(entry => (
                    <div key={entry.id} className="flex gap-2 items-start">
                        <span className="text-slate-500 flex-shrink-0">[{entry.timestamp}]</span>
                        <p className={`${getLogColor(entry.type)} whitespace-pre-wrap break-words`}>
                           {entry.message}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default BotLog;