import fetch from 'node-fetch';

export interface ApiRequest {
  provider: string;
  model: string;
  prompt: string;
  apiKey: string;
  options?: {
    temperature?: number;
    max_tokens?: number;
    top_p?: number;
    frequency_penalty?: number;
    presence_penalty?: number;
  };
}

export interface ApiResponse {
  content: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  model: string;
}

export class ApiService {
  private async callOpenAI(request: ApiRequest): Promise<ApiResponse> {
    const { model, prompt, apiKey, options } = request;
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: options?.temperature || 0.7,
        max_tokens: options?.max_tokens || 4000,
        top_p: options?.top_p || 1,
        frequency_penalty: options?.frequency_penalty || 0,
        presence_penalty: options?.presence_penalty || 0
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      let userMessage = `OpenAI API error: ${response.status} ${response.statusText}`;
      if (response.status === 401) userMessage += ' - Invalid or missing API key.';
      if (response.status === 402) userMessage += ' - Out of credit or payment required.';
      if (response.status === 403) userMessage += ' - Access forbidden, possibly gated model.';
      if (response.status === 404) userMessage += ' - Model not found or not available for inference.';
      throw new Error(userMessage + ' - ' + errorText);
    }

    const result = await response.json() as any;
    
    return {
      content: result.choices[0]?.message?.content || '',
      usage: result.usage,
      model: result.model
    };
  }

  private async callAnthropic(request: ApiRequest): Promise<ApiResponse> {
    const { model, prompt, apiKey, options } = request;
    
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: model,
        max_tokens: options?.max_tokens || 4000,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: options?.temperature || 0.7,
        top_p: options?.top_p || 1
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      let userMessage = `Anthropic API error: ${response.status} ${response.statusText}`;
      if (response.status === 401) userMessage += ' - Invalid or missing API key.';
      if (response.status === 402) userMessage += ' - Out of credit or payment required.';
      if (response.status === 403) userMessage += ' - Access forbidden, possibly gated model.';
      if (response.status === 404) userMessage += ' - Model not found or not available for inference.';
      throw new Error(userMessage + ' - ' + errorText);
    }

    const result = await response.json() as any;
    
    return {
      content: result.content[0]?.text || '',
      usage: result.usage,
      model: result.model
    };
  }

  private async callGoogle(request: ApiRequest): Promise<ApiResponse> {
    const { model, prompt, apiKey, options } = request;
    
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt
              }
            ]
          }
        ],
        generationConfig: {
          temperature: options?.temperature || 0.7,
          topP: options?.top_p || 1,
          maxOutputTokens: options?.max_tokens || 4000
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      let userMessage = `Google API error: ${response.status} ${response.statusText}`;
      if (response.status === 401) userMessage += ' - Invalid or missing API key.';
      if (response.status === 402) userMessage += ' - Out of credit or payment required.';
      if (response.status === 403) userMessage += ' - Access forbidden, possibly gated model.';
      if (response.status === 404) userMessage += ' - Model not found or not available for inference.';
      throw new Error(userMessage + ' - ' + errorText);
    }

    const result = await response.json() as any;
    
    return {
      content: result.candidates[0]?.content?.parts[0]?.text || '',
      usage: result.usageMetadata,
      model: result.model
    };
  }

  async generateText(request: ApiRequest): Promise<string> {
    try {
      console.log(`🤖 Calling ${request.provider} API with model: ${request.model}`);
      console.log(`📝 Prompt length: ${request.prompt.length} characters`);

      let response: ApiResponse;

      switch (request.provider) {
        case 'openai':
          response = await this.callOpenAI(request);
          break;
        case 'anthropic':
          response = await this.callAnthropic(request);
          break;
        case 'google':
          response = await this.callGoogle(request);
          break;
        default:
          throw new Error(`Unsupported API provider: ${request.provider}`);
      }

      console.log(`✅ ${request.provider} API response received (${response.content.length} characters)`);
      if (response.usage) {
        console.log(`📊 Token usage: ${response.usage.total_tokens || 'N/A'}`);
      }

      return response.content;

    } catch (error) {
      console.error(`❌ ${request.provider} API error:`, error);
      throw new Error(`Failed to call ${request.provider} model ${request.model}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  getProviderFromModel(modelValue: string): string {
    if (modelValue.startsWith('openai:')) return 'openai';
    if (modelValue.startsWith('anthropic:')) return 'anthropic';
    if (modelValue.startsWith('google:')) return 'google';
    if (modelValue.startsWith('grok:')) return 'grok';
    if (modelValue.startsWith('perplexity:')) return 'perplexity';
    if (modelValue.startsWith('qwen:')) return 'qwen';
    if (modelValue.startsWith('deepseek:')) return 'deepseek';
    return 'unknown';
  }

  getModelName(modelValue: string): string {
    const parts = modelValue.split(':');
    return parts.length > 1 ? parts[1] : modelValue;
  }
} 