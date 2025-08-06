import React from 'react';
import { Vacancy, ApplyStatus } from '../types';
import LoadingSpinner from './LoadingSpinner';

interface VacancyCardProps {
  vacancy: Vacancy;
  onApply: (vacancyId: string) => void;
  applyStatus: ApplyStatus;
  disabled: boolean;
}

const formatSalary = (salary: Vacancy['salary']): string => {
  if (!salary) return 'з/п не указана';
  const { from, to, currency } = salary;
  const currencySymbol = currency?.toUpperCase() === 'RUR' ? '₽' : currency;
  if (from && to) return `${from.toLocaleString('ru-RU')} - ${to.toLocaleString('ru-RU')} ${currencySymbol}`;
  if (from) return `от ${from.toLocaleString('ru-RU')} ${currencySymbol}`;
  if (to) return `до ${to.toLocaleString('ru-RU')} ${currencySymbol}`;
  return 'з/п не указана';
};

const ApplyButton: React.FC<{ status: ApplyStatus, onClick: () => void, disabled: boolean }> = ({ status, onClick, disabled }) => {
    const baseClasses = "w-full sm:w-auto px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 flex items-center justify-center disabled:cursor-not-allowed";

    const statusConfig = {
        idle: { text: "Откликнуться с AI", icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>, classes: "bg-cyan-600 hover:bg-cyan-500 text-white disabled:bg-slate-500" },
        generating: { text: "Магия AI...", icon: <LoadingSpinner size="sm" />, classes: "bg-yellow-600 text-white cursor-wait" },
        applying: { text: "Отправка...", icon: <LoadingSpinner size="sm" />, classes: "bg-blue-600 text-white cursor-wait" },
        success: { text: "Отклик отправлен!", icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>, classes: "bg-green-600 text-white" },
        error: { text: "Ошибка", icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>, classes: "bg-red-600 text-white" },
    };

    const current = statusConfig[status];

    return (
        <button
            onClick={onClick}
            disabled={disabled || status !== 'idle'}
            className={`${baseClasses} ${current.classes}`}
        >
             <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">{current.icon}</svg>
            {current.text}
        </button>
    );
};

const VacancyCard: React.FC<VacancyCardProps> = ({ vacancy, onApply, applyStatus, disabled }) => {
  const isRemote = vacancy.schedule.id === 'remote';

  return (
    <div className={`bg-slate-800 p-6 rounded-lg border border-slate-700 transition-all duration-300 shadow-lg ${applyStatus === 'success' ? 'opacity-30' : 'hover:border-cyan-500 hover:shadow-cyan-500/10'}`}>
      <div className="flex flex-col sm:flex-row items-start gap-4">
        {vacancy.employer.logo_urls?.['90'] && (
            <a href={vacancy.alternate_url} target="_blank" rel="noopener noreferrer" className="flex-shrink-0">
                <img 
                    src={vacancy.employer.logo_urls['90']} 
                    alt={`${vacancy.employer.name} logo`} 
                    className="w-16 h-16 rounded-md bg-white object-contain p-1"
                />
            </a>
        )}
        <div className="flex-grow">
          <h3 className="text-xl font-bold text-cyan-400 flex items-center gap-2">
            <a href={vacancy.alternate_url} target="_blank" rel="noopener noreferrer">{vacancy.name}</a>
            {isRemote && <span className="text-xs font-medium bg-cyan-800 text-cyan-200 px-2 py-1 rounded-full">Удаленно</span>}
          </h3>
          <p className="text-slate-300 mt-1">{vacancy.employer.name}</p>
          <p className="text-slate-400 text-sm mt-1">{vacancy.area.name}</p>
          <p className="text-lg font-semibold text-white mt-2">{formatSalary(vacancy.salary)}</p>
           {vacancy.counters?.responses !== null && vacancy.counters?.responses !== undefined && (
             <p className="text-xs text-slate-500 mt-1">Откликов: {vacancy.counters.responses}</p>
           )}
        </div>
      </div>
      {(vacancy.snippet?.requirement || vacancy.snippet?.responsibility) && (
        <div className="text-slate-400 mt-4 text-sm space-y-2 border-t border-slate-700 pt-4">
            {vacancy.snippet?.requirement && <p dangerouslySetInnerHTML={{ __html: `<strong>Требования:</strong> ${vacancy.snippet.requirement}` }} />}
            {vacancy.snippet?.responsibility && <p dangerouslySetInnerHTML={{ __html: `<strong>Обязанности:</strong> ${vacancy.snippet.responsibility}` }} />}
        </div>
      )}
      <div className="mt-6 text-right">
        <ApplyButton 
            status={applyStatus}
            onClick={() => onApply(vacancy.id)}
            disabled={disabled}
        />
      </div>
    </div>
  );
};

export default VacancyCard;