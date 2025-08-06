import React, { useState } from 'react';
import { Resume } from '../types';

interface SettingsProps {
    accessToken: string;
    setAccessToken: (token: string) => void;
    groqApiKey: string;
    setGroqApiKey: (key: string) => void;
    resumeId: string;
    setResumeId: (id: string) => void;
    userName: string;
    setUserName: (name: string) => void;
    userInfo: string;
    setUserInfo: (info: string) => void;
    resumes: Resume[];
    onFetchResumes: () => void;
    isLoadingResumes: boolean;
    error: string | null;
    disabled: boolean;
}

const Settings: React.FC<SettingsProps> = ({
    accessToken, setAccessToken, groqApiKey, setGroqApiKey, resumeId, setResumeId, userName, setUserName, userInfo, setUserInfo, resumes, onFetchResumes, isLoadingResumes, error, disabled
}) => {
    const [isOpen, setIsOpen] = useState(() => !localStorage.getItem('hh_access_token') || !localStorage.getItem('groq_api_key'));

    return (
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-1 transition-opacity duration-300" style={{ opacity: disabled ? 0.6 : 1 }}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full p-4 text-left text-lg font-bold flex justify-between items-center"
                aria-expanded={isOpen}
                disabled={disabled}
            >
                Настройки AI-ассистента
                <svg className={`w-5 h-5 transform transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </button>
            {isOpen && (
                <div className="p-4 space-y-6 border-t border-slate-700">
                     {error && <div className="text-red-400 p-3 bg-red-900/20 rounded-lg">{error}</div>}
                     <div className="space-y-2">
                        <label htmlFor="groqApiKey" className="block text-sm font-medium text-slate-300">
                            Ключ API Groq (<a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">как получить?</a>)
                        </label>
                        <input
                            type="password"
                            id="groqApiKey"
                            value={groqApiKey}
                            onChange={(e) => setGroqApiKey(e.target.value)}
                            className="w-full bg-slate-700 text-white placeholder-slate-400 border border-slate-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-cyan-500 focus:outline-none transition duration-200 disabled:bg-slate-800"
                            placeholder="Вставьте ваш ключ API Groq"
                            disabled={disabled}
                        />
                    </div>
                    <div className="space-y-2">
                        <label htmlFor="accessToken" className="block text-sm font-medium text-slate-300">
                            Токен доступа hh.ru (<a href="https://dev.hh.ru/" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">как получить?</a>)
                        </label>
                        <div className="flex gap-2">
                            <input
                                type="password"
                                id="accessToken"
                                value={accessToken}
                                onChange={(e) => setAccessToken(e.target.value)}
                                className="flex-grow bg-slate-700 text-white placeholder-slate-400 border border-slate-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-cyan-500 focus:outline-none transition duration-200 disabled:bg-slate-800"
                                placeholder="Вставьте ваш токен hh.ru"
                                disabled={disabled}
                            />
                            <button
                                onClick={onFetchResumes}
                                disabled={isLoadingResumes || !accessToken || disabled}
                                className="bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-500 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded-lg transition duration-200 flex items-center"
                            >
                                {isLoadingResumes ? (
                                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                                    </svg>
                                ) : "Загрузить резюме"}
                            </button>
                        </div>
                    </div>
                    {resumes.length > 0 && (
                         <div className="space-y-2">
                            <label htmlFor="resumeId" className="block text-sm font-medium text-slate-300">Резюме для откликов</label>
                            <select
                                id="resumeId"
                                value={resumeId}
                                onChange={(e) => setResumeId(e.target.value)}
                                className="w-full bg-slate-700 text-white border border-slate-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-cyan-500 focus:outline-none transition duration-200 disabled:bg-slate-800"
                                disabled={disabled}
                            >
                                {resumes.map(r => <option key={r.id} value={r.id}>{r.title}</option>)}
                            </select>
                        </div>
                    )}
                     <div className="space-y-2">
                        <label htmlFor="userName" className="block text-sm font-medium text-slate-300">Ваше имя (для подписи)</label>
                        <input
                            type="text"
                            id="userName"
                            value={userName}
                            onChange={(e) => setUserName(e.target.value)}
                            className="w-full bg-slate-700 text-white placeholder-slate-400 border border-slate-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-cyan-500 focus:outline-none transition duration-200 disabled:bg-slate-800"
                            placeholder="Например, Денис"
                            disabled={disabled}
                        />
                    </div>
                     <div className="space-y-2">
                        <label htmlFor="userInfo" className="block text-sm font-medium text-slate-300">Информация о вас для сопроводительных писем</label>
                        <textarea
                            id="userInfo"
                            rows={4}
                            value={userInfo}
                            onChange={(e) => setUserInfo(e.target.value)}
                            className="w-full bg-slate-700 text-white placeholder-slate-400 border border-slate-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-cyan-500 focus:outline-none transition duration-200 disabled:bg-slate-800"
                            placeholder="Расскажите о своих ключевых навыках, опыте и целях..."
                            disabled={disabled}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default Settings;
