import fetch from 'node-fetch';

export interface HuggingFaceRequest {
  model: string;
  prompt: string;
  apiKey: string;
  options?: {
    temperature?: number;
    max_new_tokens?: number;
    top_p?: number;
    do_sample?: boolean;
    return_full_text?: boolean;
  };
}

export interface HuggingFaceResponse {
  content: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  model: string;
}

export class HuggingFaceService {
  async generateText(request: HuggingFaceRequest): Promise<string> {
    try {
      console.log(`🤖 Calling HuggingFace API with model: ${request.model}`);
      console.log(`📝 Prompt length: ${request.prompt.length} characters`);

      const response = await fetch(`https://api-inference.huggingface.co/models/${request.model}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${request.apiKey}`
        },
        body: JSON.stringify({
          inputs: request.prompt,
          parameters: {
            temperature: request.options?.temperature || 0.7,
            max_new_tokens: request.options?.max_new_tokens || 512,
            top_p: request.options?.top_p || 0.9,
            do_sample: request.options?.do_sample !== false,
            return_full_text: request.options?.return_full_text || false
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        let userMessage = `HuggingFace API error: ${response.status} ${response.statusText}`;
        if (response.status === 401) userMessage += ' - Invalid or missing API key.';
        if (response.status === 402) userMessage += ' - Out of credit or payment required.';
        if (response.status === 403) userMessage += ' - Access forbidden, possibly gated model.';
        if (response.status === 404) userMessage += ' - Model not found or not available for inference.';
        throw new Error(userMessage + ' - ' + errorText);
      }

      const result = await response.json() as any;
      
      // Handle different response formats from HuggingFace
      let content = '';
      if (Array.isArray(result)) {
        // Some models return an array
        content = result[0]?.generated_text || result[0]?.text || '';
      } else if (typeof result === 'object') {
        // Some models return an object
        content = result.generated_text || result.text || '';
      } else if (typeof result === 'string') {
        // Some models return just the text
        content = result;
      }

      console.log(`✅ HuggingFace API response received (${content.length} characters)`);

      return content;

    } catch (error) {
      console.error(`❌ HuggingFace API error:`, error);
      throw error; // Forward error up to workflow engine
    }
  }

  async isModelAvailable(modelName: string, apiKey: string): Promise<boolean> {
    try {
      const response = await fetch(`https://api-inference.huggingface.co/models/${modelName}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      });
      
      return response.ok;
    } catch (error) {
      console.error(`❌ Error checking HuggingFace model availability for ${modelName}:`, error);
      return false;
    }
  }

  async listAvailableModels(apiKey: string): Promise<string[]> {
    try {
      const response = await fetch('https://huggingface.co/api/models', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to list models: ${response.status}`);
      }
      
      const result = await response.json() as any;
      return result.map((model: any) => model.modelId || model.id).filter(Boolean);
    } catch (error) {
      console.error('❌ Failed to list HuggingFace models:', error);
      return [];
    }
  }
} 