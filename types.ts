export interface Salary {
  from: number | null;
  to: number | null;
  currency: string;
  gross: boolean;
}

export interface Employer {
  name: string;
  url: string;
  logo_urls: {
    '90': string;
    '240':string;
    original: string;
  } | null;
}

export interface Snippet {
  requirement: string | null;
  responsibility: string | null;
}

export interface Vacancy {
  id: string;
  name:string;
  salary: Salary | null;
  employer: Employer;
  alternate_url: string;
  snippet: Snippet | null;
  area: {
    name: string;
  };
  schedule: {
    id: string;
    name: string;
  };
  has_negotiations: boolean;
  counters?: {
    responses: number | null;
  }
}

export interface VacanciesApiResponse {
  items: Vacancy[];
  found: number;
  pages: number;
  per_page: number;
  page: number;
}

export interface Resume {
  id: string;
  title: string;
}

export interface ResumesApiResponse {
  items: Resume[];
}

export interface HhApiError {
  description?: string;
  errors?: { type: string; value: string; captcha_url?: string }[];
  request_id?: string;
}

export type LogType = 'info' | 'success' | 'error' | 'pause' | 'special';

export interface BotLogEntry {
  id: number;
  message: string;
  type: LogType;
  timestamp: string;
}

export type ApplyStatus = 'idle' | 'generating' | 'applying' | 'success' | 'error';