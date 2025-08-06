import { VacanciesApiResponse, ResumesApiResponse, HhApiError, Vacancy } from '../types';

const API_BASE_URL = 'https://api.hh.ru';
const USER_AGENT = 'AIJobSearchAssistant/6.0 (contact@example.com)';

export class CaptchaRequiredError extends Error {
    public captchaUrl: string | undefined;
    constructor(message: string, captchaUrl?: string) {
        super(message);
        this.name = 'CaptchaRequiredError';
        this.captchaUrl = captchaUrl;
    }
}

interface FetchPrioritizedVacanciesParams {
  query: string;
  page: number;
  perPage?: number;
  accessToken: string;
}

export const fetchPrioritizedVacancies = async ({
  query,
  page,
  perPage = 20,
  accessToken,
}: FetchPrioritizedVacanciesParams): Promise<{ items: Vacancy[], pages: number }> => {
  const headers: HeadersInit = {
    'User-Agent': USER_AGENT,
    'Authorization': `Bearer ${accessToken}`,
  };

  const STAVROPOL_AREA_ID = '84';

  const createUrl = (params: Record<string, string>) => {
    const url = new URL(`${API_BASE_URL}/vacancies`);
    url.searchParams.append('text', query);
    url.searchParams.append('page', String(page));
    url.searchParams.append('per_page', String(perPage));
    for (const key in params) {
      url.searchParams.append(key, params[key]);
    }
    return url.toString();
  };

  const stavropolUrl = createUrl({ area: STAVROPOL_AREA_ID });
  const remoteUrl = createUrl({ schedule: 'remote' });

  try {
    const [stavropolResult, remoteResult] = await Promise.allSettled([
      fetch(stavropolUrl, { headers }),
      fetch(remoteUrl, { headers }),
    ]);

    let stavropolVacancies: Vacancy[] = [];
    let remoteVacancies: Vacancy[] = [];
    let totalPages = 0;

    if (stavropolResult.status === 'fulfilled' && stavropolResult.value.ok) {
      const data: VacanciesApiResponse = await stavropolResult.value.json();
      stavropolVacancies = data.items;
      totalPages = Math.max(totalPages, data.pages);
    }
    
    if (remoteResult.status === 'fulfilled' && remoteResult.value.ok) {
      const data: VacanciesApiResponse = await remoteResult.value.json();
      remoteVacancies = data.items;
      totalPages = Math.max(totalPages, data.pages);
    }

    const seenIds = new Set<string>();
    const combined = [...stavropolVacancies, ...remoteVacancies];
    const uniqueVacancies = combined.filter(vacancy => {
      if (seenIds.has(vacancy.id)) return false;
      seenIds.add(vacancy.id);
      return true;
    });

    return { items: uniqueVacancies, pages: totalPages };
  } catch (error) {
    console.error('Failed to fetch prioritized vacancies:', error);
    throw new Error('Не удалось выполнить приоритетный поиск.');
  }
};

export const fetchMultipleVacancyDetails = async (vacancyIds: string[], accessToken: string): Promise<Vacancy[]> => {
    if (vacancyIds.length === 0) return [];
    const headers: HeadersInit = {
        'User-Agent': USER_AGENT,
        'Authorization': `Bearer ${accessToken}`,
    };
    
    const requests = vacancyIds.map(id => fetch(`${API_BASE_URL}/vacancies/${id}`, { headers }).then(res => res.ok ? res.json() : null));
    const results = await Promise.allSettled(requests);

    return results
        .filter((result): result is PromiseFulfilledResult<Vacancy> => result.status === 'fulfilled' && result.value !== null)
        .map(result => result.value);
}


export const fetchResumes = async (accessToken: string): Promise<ResumesApiResponse> => {
    const response = await fetch(`${API_BASE_URL}/resumes/mine`, {
        method: 'GET',
        headers: { 'User-Agent': USER_AGENT, 'Authorization': `Bearer ${accessToken}` },
    });
    if (!response.ok) {
        const errorData: HhApiError = await response.json();
        throw new Error(errorData.description || 'Не удалось загрузить резюме. Проверьте токен доступа.');
    }
    return response.json();
};

interface ApplyToVacancyParams {
    vacancyId: string;
    resumeId: string;
    message: string;
    accessToken: string;
}

export const applyToVacancy = async ({ vacancyId, resumeId, message, accessToken }: ApplyToVacancyParams): Promise<void> => {
    const url = new URL(`${API_BASE_URL}/negotiations`);
    url.searchParams.append('vacancy_id', vacancyId);
    url.searchParams.append('resume_id', resumeId);
    url.searchParams.append('message', message);

    const response = await fetch(url.toString(), {
        method: 'POST',
        headers: { 'User-Agent': USER_AGENT, 'Authorization': `Bearer ${accessToken}` },
    });

    if (response.ok) {
        return;
    }

    const errorData: HhApiError = await response.json();
    
    const captchaError = errorData.errors?.find(e => e.type === 'captcha_required');
    if (captchaError) {
        throw new CaptchaRequiredError(
            captchaError.value || 'Требуется CAPTCHA!',
            captchaError.captcha_url
        );
    }

    if (response.status === 400 && errorData.errors?.some(e => e.value === 'negotiation.exists')) {
      throw new Error('Вы уже откликались на эту вакансию.');
    }
    
    throw new Error(errorData.description || `Ошибка отклика: ${response.statusText}`);
};