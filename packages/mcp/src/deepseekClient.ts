import { AIClient, Message } from '../../core/dist';

const DEEPSEEK_BASE_URL = 'https://api.deepseek.com/v1';
const DEEPSEEK_MODEL = 'deepseek-chat';

interface ChatCompletionRequest {
    model: string;
    messages: { role: string; content: string }[];
}

interface ChatCompletionResponse {
    choices: { message: { content: string } }[];
}

export class DeepSeekAIClient implements AIClient {
    constructor(private readonly apiKey: string) {}

    async complete(messages: Message[]): Promise<string> {
        const body: ChatCompletionRequest = {
            model: DEEPSEEK_MODEL,
            messages: messages.map(m => ({ role: m.role, content: m.content })),
        };

        const response = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`,
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const text = await response.text();
            throw new Error(`DeepSeek API error ${response.status}: ${text}`);
        }

        const data = await response.json() as ChatCompletionResponse;
        const content = data.choices?.[0]?.message?.content;
        if (!content) throw new Error('DeepSeek returned empty response');
        return content;
    }
}

export function makeAiClient(): AIClient {
    const apiKey = process.env['DEEPSEEK_API_KEY'];
    if (apiKey) return new DeepSeekAIClient(apiKey);
    return {
        complete: async () =>
            'TODO: Add implementation notes.\n\n(Set DEEPSEEK_API_KEY env var to enable AI generation.)',
    };
}
