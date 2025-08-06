import Groq from "groq-sdk";
import { Vacancy } from "../types";

const MODEL = 'llama3-70b-8192';

const getGroqClient = (apiKey: string) => {
    if (!apiKey) {
        throw new Error("Ключ API Groq не предоставлен. Пожалуйста, укажите его в настройках.");
    }
    return new Groq({
        apiKey,
        dangerouslyAllowBrowser: true
    });
};

export const expandSearchQuery = async (query: string, groqApiKey: string): Promise<string> => {
    if (!query.trim()) return "";
    const groq = getGroqClient(groqApiKey);

    const systemPrompt = `You are a smart job search assistant. Your task is to expand the user's search query with synonyms, related technologies, and alternative job titles. Your response must be a single string where each term is enclosed in double quotes and separated by " OR ".`;
    
    try {
        const chatCompletion = await groq.chat.completions.create({
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: `Expand this query: "${query}"` }
            ],
            model: MODEL,
            temperature: 0.3,
            max_tokens: 1024,
        });
        const expandedQuery = chatCompletion.choices[0]?.message?.content?.trim() || `"${query}"`;
        return (expandedQuery.includes(" OR ") && expandedQuery.startsWith('"')) ? expandedQuery : `"${query}"`;
    } catch (error) {
        console.error('Error expanding search query with Groq:', error);
        throw new Error("Ошибка AI при расширении запроса. Проверьте ключ API Groq.");
    }
};

export const filterVacanciesByRelevance = async (vacancies: Vacancy[], originalQuery: string, groqApiKey: string): Promise<string[]> => {
    if (vacancies.length === 0) return [];
    const groq = getGroqClient(groqApiKey);
    
    const vacancyListText = vacancies.map(v => `ID: ${v.id}, Title: "${v.name}"`).join('\n');
    const systemPrompt = `You are an expert IT recruiter. Your task is to filter a list of vacancies to keep only those that strictly match the user's original query. Ignore vacancies where the keyword is only mentioned in the description, but the job TITLE is irrelevant. You MUST return a JSON object with a single key "relevantVacancyIds", which contains an array of the relevant vacancy IDs as strings. Do not return anything else, just the JSON object.`;

    try {
        const chatCompletion = await groq.chat.completions.create({
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: `Original user query: "${originalQuery}"\n\nVacancy list:\n${vacancyListText}` }
            ],
            model: MODEL,
            response_format: { type: "json_object" },
            temperature: 0.1,
        });

        const responseContent = chatCompletion.choices[0]?.message?.content;
        if (!responseContent) {
            console.warn("Groq returned an empty response for filtering. Returning all IDs as a fallback.");
            return vacancies.map(v => v.id);
        }
        
        const result = JSON.parse(responseContent);
        if (result && Array.isArray(result.relevantVacancyIds)) {
            return result.relevantVacancyIds;
        }
        
        console.warn("Groq response for filtering was malformed. Returning all IDs as a fallback.");
        return vacancies.map(v => v.id);

    } catch (error) {
        console.error('Error filtering vacancies by relevance with Groq:', error);
        // On JSON parse error or other issues, return all IDs to not block the user.
        return vacancies.map(v => v.id);
    }
};

export const generateCoverLetter = async (vacancy: Vacancy, userInfo: string, groqApiKey: string, userName: string): Promise<string> => {
    const groq = getGroqClient(groqApiKey);
    const requirementText = vacancy.snippet?.requirement 
        ? `Key requirements: ${vacancy.snippet.requirement.replace(/<highlighttext>/g, '').replace(/<\/highlighttext>/g, '')}` 
        : 'No specific requirements listed.';
    
    const systemPrompt = `You are a professional career assistant. Your task is to write a personalized, concise, energetic, and highly professional cover letter in Russian based on the vacancy details.

CRITICAL INSTRUCTIONS:
- Your response MUST contain ONLY the cover letter text itself. Do not add any introductory phrases, explanations, conversational filler, or concluding remarks. Your entire output must be the letter itself, ready to be sent.
- The letter must be written exclusively in correct Russian. Do not include any foreign characters, hieroglyphs, or technical artifacts.
- The candidate is NOT willing to relocate or go on business trips. Under no circumstances should you mention relocation or business travel as possibilities.

KEY RULES:
- Style: Concise, to the point, no fluff.
- Opening: Get straight to the point. Do not use phrases like "пишу вам, чтобы" or "увидел вашу вакансию". Start with the main thing. For example: "Добрый день! Меня заинтересовала ваша вакансия...".
- Body: Based on the provided vacancy description and candidate info, very briefly (1-2 sentences) connect the candidate's experience with the key requirements of the vacancy.
- Length: Maximum 2-3 short paragraphs.
- Closing: You MUST end the letter with a polite closing followed by the User's Name. The User's Name will be provided in the user prompt. For example: "С уважением, Денис".
- Tone: Confident and professional.`;
    
    const userPrompt = `
        User's Name to sign the letter: ${userName}
        Candidate's info: "${userInfo}"
        
        Vacancy Details:
        - Title: "${vacancy.name}"
        - Company: "${vacancy.employer.name}"
        - Requirements: ${requirementText}
        
        Generate the cover letter.
    `;
    
    try {
        const chatCompletion = await groq.chat.completions.create({
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ],
            model: MODEL,
            temperature: 0.5,
            max_tokens: 1500,
        });

        const coverLetter = chatCompletion.choices[0]?.message?.content?.trim();
        if (!coverLetter) {
            throw new Error("Groq returned an empty cover letter.");
        }
        return coverLetter;
    } catch (error) {
        console.error('Error generating cover letter with Groq:', error);
        throw new Error('Не удалось сгенерировать сопроводительное письмо. Проверьте ключ API Groq.');
    }
};