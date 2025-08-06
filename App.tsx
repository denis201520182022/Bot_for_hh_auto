import React, { useState, useEffect, useCallback, useRef } from 'react';
import { fetchPrioritizedVacancies, fetchResumes, applyToVacancy, CaptchaRequiredError, fetchMultipleVacancyDetails } from './services/hhService';
import { generateCoverLetter, expandSearchQuery, filterVacanciesByRelevance } from './services/geminiService';
import { Vacancy, Resume, BotLogEntry, LogType, ApplyStatus } from './types';
import SearchBar from './components/SearchBar';
import VacancyCard from './components/VacancyCard';
import LoadingSpinner from './components/LoadingSpinner';
import Pagination from './components/Pagination';
import Settings from './components/Settings';
import AutoApplyControl from './components/AutoApplyControl';
import BotLog from './components/BotLog';
import BotWorking from './components/BotWorking';

const App: React.FC = () => {
    // Core State
    const [vacancies, setVacancies] = useState<Vacancy[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [statusMessage, setStatusMessage] = useState<string>('');

    // Search & Pagination State
    const [userQuery, setUserQuery] = useState<string>('');
    const [currentPage, setCurrentPage] = useState<number>(0);
    const [totalPages, setTotalPages] = useState<number>(0);
    const [hasSearched, setHasSearched] = useState<boolean>(false);

    // Settings & Auth State
    const [accessToken, setAccessToken] = useState<string>(() => localStorage.getItem('hh_access_token') || '');
    const [groqApiKey, setGroqApiKey] = useState<string>(() => localStorage.getItem('groq_api_key') || '');
    const [resumeId, setResumeId] = useState<string>(() => localStorage.getItem('hh_resume_id') || '');
    const [userName, setUserName] = useState<string>(() => localStorage.getItem('user_name') || '');
    const [userInfo, setUserInfo] = useState<string>(() => localStorage.getItem('hh_user_info') || 'Я - активный и мотивированный кандидат с опытом в [ваша область]. Ищу новые вызовы и возможности для роста.');
    const [resumes, setResumes] = useState<Resume[]>([]);
    const [isLoadingResumes, setIsLoadingResumes] = useState<boolean>(false);
    const [settingsError, setSettingsError] = useState<string | null>(null);
    
    // Bot State
    const [isBotRunning, setIsBotRunning] = useState<boolean>(false);
    const [botLog, setBotLog] = useState<BotLogEntry[]>([]);
    const [applicationsSent, setApplicationsSent] = useState<number>(0);
    const abortControllerRef = useRef<AbortController | null>(null);

    // Manual Apply State
    const [applyingStatusMap, setApplyingStatusMap] = useState<Record<string, ApplyStatus>>({});

    useEffect(() => { localStorage.setItem('hh_access_token', accessToken); }, [accessToken]);
    useEffect(() => { localStorage.setItem('groq_api_key', groqApiKey); }, [groqApiKey]);
    useEffect(() => { localStorage.setItem('hh_resume_id', resumeId); }, [resumeId]);
    useEffect(() => { localStorage.setItem('user_name', userName); }, [userName]);
    useEffect(() => { localStorage.setItem('hh_user_info', userInfo); }, [userInfo]);

    const addLog = (message: string, type: LogType = 'info') => {
        const newEntry: BotLogEntry = {
            id: Date.now() + Math.random(),
            message,
            type,
            timestamp: new Date().toLocaleTimeString('ru-RU'),
        };
        setBotLog(prev => [...prev, newEntry]);
    };
    
    const sleep = (ms: number, signal?: AbortSignal) => new Promise((resolve, reject) => {
        const timeout = setTimeout(resolve, ms);
        if (signal) {
            signal.addEventListener('abort', () => {
                clearTimeout(timeout);
                reject(new DOMException('Aborted', 'AbortError'));
            });
        }
    });
    
    const searchPipeline = useCallback(async (query: string, page: number, logger: (msg: string) => void) => {
        // Step 1: Expand query
        logger('Магия AI: расширяем ваш запрос...');
        const expandedQuery = await expandSearchQuery(query, groqApiKey);

        // Step 2: Prioritized fetch
        logger(`Ищем вакансии (Ставрополь + Удаленка) по запросу: ${expandedQuery}`);
        const data = await fetchPrioritizedVacancies({ query: expandedQuery, page, accessToken });
        
        // Step 3: CRITICAL FIX - Filter out already applied
        logger(`Найдено ${data.items.length} вакансий. Фильтруем те, на которые вы уже откликались...`);
        const unappliedVacancies = data.items.filter(v => v.has_negotiations !== true);
        if(unappliedVacancies.length === 0) {
            logger('Не найдено новых вакансий, на которые вы еще не откликались.');
            return { vacancies: [], pages: data.pages };
        }
        logger(`Осталось ${unappliedVacancies.length} уникальных вакансий.`);

        // Step 4: AI Relevance Filter
        logger('Анализ AI: фильтруем релевантные вакансии по названию...');
        const relevantIds = await filterVacanciesByRelevance(unappliedVacancies, query, groqApiKey);
        const relevantVacancies = unappliedVacancies.filter(v => relevantIds.includes(v.id));
        if(relevantVacancies.length === 0) {
            logger('После AI-фильтрации релевантных вакансий не осталось.');
            return { vacancies: [], pages: data.pages };
        }
        logger(`Осталось ${relevantVacancies.length} релевантных вакансий после AI-фильтрации.`);

        // Step 5: Fetch details for sorting
        logger('Получаем детали для сортировки по популярности...');
        const detailedVacancies = await fetchMultipleVacancyDetails(relevantVacancies.map(v => v.id), accessToken);

        // Step 6: Sort by responses
        logger('Сортируем по количеству откликов...');
        const sortedVacancies = detailedVacancies.sort((a,b) => (a.counters?.responses ?? Infinity) - (b.counters?.responses ?? Infinity));

        return { vacancies: sortedVacancies, pages: data.pages };
    }, [accessToken, groqApiKey]);


    const performSearch = useCallback(async (query: string, page: number) => {
        if (!groqApiKey || !accessToken) {
            setError("Для поиска необходимо указать ключи API Groq и HH.ru в настройках.");
            return;
        }
        setIsLoading(true);
        setError(null);
        setVacancies([]);
        setHasSearched(true);

        try {
            const { vacancies, pages } = await searchPipeline(query, page, (msg) => setStatusMessage(msg));
            setVacancies(vacancies);
            setTotalPages(pages);

        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
            setStatusMessage('');
        }
    }, [searchPipeline]);

    const runAutoApplyBot = useCallback(async (maxApplications: number | null) => {
        let page = 0;
        let localApplicationsSent = 0;
        const abortSignal = abortControllerRef.current?.signal;
        
        mainLoop: while (true) {
            if (abortSignal?.aborted) break;
            if (maxApplications !== null && localApplicationsSent >= maxApplications) break;

            try {
                addLog(`Начинаю новый цикл поиска (Страница ${page + 1})`);
                
                const { vacancies: vacanciesToProcess, pages: totalBotPages } = await searchPipeline(userQuery, page, (msg) => addLog(msg));
                
                if (vacanciesToProcess.length > 0) {
                    for (const vacancy of vacanciesToProcess) {
                         if (abortSignal?.aborted) break mainLoop;
                         if (maxApplications !== null && localApplicationsSent >= maxApplications) break mainLoop;

                         try {
                            addLog(`Генерирую сопроводительное письмо для "${vacancy.name}" (Откликов: ${vacancy.counters?.responses ?? 'N/A'})...`);
                            const coverLetter = await generateCoverLetter(vacancy, userInfo, groqApiKey, userName);
                            
                            addLog(`Отправляю отклик на "${vacancy.name}"...`);
                            await applyToVacancy({ vacancyId: vacancy.id, resumeId, message: coverLetter, accessToken });
                            
                            localApplicationsSent++;
                            setApplicationsSent(s => s + 1);
                            addLog(`Отклик успешно отправлен! (${localApplicationsSent}/${maxApplications || '∞'})`, 'success');
                            
                            const delay = Math.floor(Math.random() * (45000 - 10000 + 1)) + 10000;
                            addLog(`Пауза ${Math.round(delay/1000)} секунд...`, 'pause');
                            await sleep(delay, abortSignal);

                         } catch (err: any) {
                            if (err instanceof CaptchaRequiredError) {
                                addLog(`ТРЕБУЕТСЯ CAPTCHA! БОТ АВАРИЙНО ОСТАНОВЛЕН.`, 'error');
                                break mainLoop;
                            }
                             if (err.name === 'AbortError') break mainLoop;
                            addLog(`Ошибка отклика на "${vacancy.name}": ${err.message}`, 'error');
                            await sleep(5000, abortSignal);
                         }
                    }
                }
                
                if (page < totalBotPages - 1) {
                    page++;
                } else {
                    addLog('Новых вакансий по всему поиску не найдено. Пауза 5 минут перед новым глобальным поиском.', 'pause');
                    await sleep(300000, abortSignal);
                    page = 0;
                }

            } catch (err: any) {
                 if (err.name === 'AbortError') break mainLoop;
                 addLog(`Критическая ошибка в цикле бота: ${err.message}`, 'error');
                 addLog('Пауза 1 минута перед повторной попыткой.', 'pause');
                 await sleep(60000, abortSignal);
            }
        }
        
        if (abortSignal?.aborted) {
            addLog('Бот остановлен по команде.', 'special');
        } else if (maxApplications !== null && localApplicationsSent >= maxApplications) {
            addLog(`Цель в ${maxApplications} откликов достигнута.`, 'special');
        }
        
        addLog('Бот завершил свою работу.', 'special');
        setIsBotRunning(false);
    }, [accessToken, resumeId, userInfo, groqApiKey, userQuery, searchPipeline, userName]);
    
    const handleManualApply = async (vacancyId: string) => {
        const vacancy = vacancies.find(v => v.id === vacancyId);
        if(!vacancy || !accessToken || !resumeId || !groqApiKey || !userName) {
            setError("Невозможно откликнуться. Проверьте все ключи, имя и резюме в настройках.");
            return;
        }

        try {
            setApplyingStatusMap(prev => ({ ...prev, [vacancyId]: 'generating' }));
            const coverLetter = await generateCoverLetter(vacancy, userInfo, groqApiKey, userName);
            
            setApplyingStatusMap(prev => ({ ...prev, [vacancyId]: 'applying' }));
            await applyToVacancy({ vacancyId, resumeId, message: coverLetter, accessToken });

            setApplyingStatusMap(prev => ({ ...prev, [vacancyId]: 'success' }));
            await sleep(1500);
            setVacancies(prev => prev.filter(v => v.id !== vacancyId));

        } catch (err: any) {
            setApplyingStatusMap(prev => ({ ...prev, [vacancyId]: 'error' }));
            setError(err.message);
            await sleep(3000);
            setApplyingStatusMap(prev => {
                const newMap = {...prev};
                delete newMap[vacancyId];
                return newMap;
            })
        }
    };

    const handleStartBot = (maxApplies: number | null) => {
        if (!userQuery || !accessToken || !resumeId || !groqApiKey || !userName) {
            setError("Для запуска бота необходимо выполнить поиск и указать все ключи/токены, имя и резюме в настройках.");
            return;
        }
        setError(null);
        setBotLog([]);
        setApplicationsSent(0);
        abortControllerRef.current = new AbortController();
        setIsBotRunning(true);
        addLog(`Бот запущен. Цель: ${maxApplies || 'бесконечно'} откликов.`, 'special');
        runAutoApplyBot(maxApplies);
    };

    const handleStopBot = () => {
        if(isBotRunning){
            addLog('Получена команда на остановку. Завершаю текущую операцию...', 'special');
            abortControllerRef.current?.abort();
        }
    };

    const handleSearch = (newQuery: string) => {
        setUserQuery(newQuery);
        setCurrentPage(0);
        performSearch(newQuery, 0);
    };

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
        performSearch(userQuery, page);
        window.scrollTo(0, 0);
    };
    
    const handleFetchResumes = useCallback(async () => {
        if (!accessToken) {
            setSettingsError('Необходимо ввести токен доступа hh.ru');
            return;
        }
        setIsLoadingResumes(true);
        setSettingsError(null);
        try {
            const data = await fetchResumes(accessToken);
            setResumes(data.items);
            if (data.items.length > 0 && !resumeId) setResumeId(data.items[0].id);
        } catch (err: any) {
            setSettingsError(err.message);
            setResumes([]);
        } finally {
            setIsLoadingResumes(false);
        }
    }, [accessToken, resumeId]);
    
    const isUIBlocked = isBotRunning || isLoading;
    const isApplyDisabled = isUIBlocked || Object.values(applyingStatusMap).some(s => s !== 'idle' && s !== 'success' && s !== 'error');
    const isBotStartDisabled = !userQuery || !accessToken || !resumeId || !groqApiKey || !userName;

    const renderContent = () => {
        if (isBotRunning) return <BotWorking />;
        if (isLoading) return <div className="text-center"><LoadingSpinner size="lg" /><p className="text-slate-400 mt-2">{statusMessage}</p></div>;
        if (error && !vacancies.length) return <div className="text-center text-red-400 p-8 bg-red-900/20 rounded-lg">{error}</div>;
        if (!hasSearched) return <div className="text-center text-slate-400 p-8"><h2 className="text-2xl font-bold mb-2 text-white">Начните поиск работы</h2><p>Введите ключевые слова, чтобы найти вакансии для ручного или автоматического отклика.</p></div>;
        if (vacancies.length === 0) return <div className="text-center text-slate-400 p-8">По вашему запросу ничего не найдено. Попробуйте изменить запрос.</div>;
        return <div className="grid grid-cols-1 gap-6">{vacancies.map(v => <VacancyCard key={v.id} vacancy={v} onApply={handleManualApply} applyStatus={applyingStatusMap[v.id] || 'idle'} disabled={isApplyDisabled || !groqApiKey || !accessToken || !resumeId || !userName} />)}</div>;
    };

    return (
        <div className="flex flex-col h-full bg-slate-900 text-white">
            <div className="flex-grow overflow-y-auto">
                 <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
                    <header className="flex flex-col items-center mb-8">
                        <div className="flex items-center gap-4 mb-4">
                            <img src="https://hh.ru/employer-logo/3343362.png" alt="HH.ru Logo" className="h-12 w-12 rounded-full"/>
                            <h1 className="text-4xl font-extrabold tracking-tight text-white">AI-ассистент HH.ru</h1>
                        </div>
                        <p className="text-slate-400 mb-6 text-center">Умный бот для поиска, сортировки и отклика на вакансии HeadHunter с помощью Groq (Llama 3)</p>
                    </header>

                    <section className="mb-8"><Settings accessToken={accessToken} setAccessToken={setAccessToken} groqApiKey={groqApiKey} setGroqApiKey={setGroqApiKey} resumeId={resumeId} setResumeId={setResumeId} userName={userName} setUserName={setUserName} userInfo={userInfo} setUserInfo={setUserInfo} resumes={resumes} onFetchResumes={handleFetchResumes} isLoadingResumes={isLoadingResumes} error={settingsError} disabled={isBotRunning} /></section>
                    
                    <section className="mb-8"><AutoApplyControl onStart={handleStartBot} onStop={handleStopBot} isBotRunning={isBotRunning} disabled={isBotStartDisabled} applicationsSent={applicationsSent} /></section>
                    
                    <section className="mb-8"><SearchBar onSearch={handleSearch} disabled={isUIBlocked} /></section>

                    <main>{renderContent()}</main>

                    <footer className="mt-8">{!isBotRunning && hasSearched && vacancies.length > 0 && <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} disabled={isUIBlocked} />}</footer>
                </div>
            </div>
            {botLog.length > 0 && (
                <div className="flex-shrink-0 w-full p-4 pt-0 bg-slate-900/80 backdrop-blur-sm border-t border-slate-700">
                    <div className="max-w-4xl mx-auto">
                       <BotLog logEntries={botLog} />
                    </div>
                </div>
            )}
        </div>
    );
};

export default App;
