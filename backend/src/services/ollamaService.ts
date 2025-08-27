import fetch from 'node-fetch';

export interface OllamaRequest {
  model: string;
  prompt: string;
  stream?: boolean;
  options?: {
    temperature?: number;
    top_p?: number;
    top_k?: number;
    num_predict?: number;
  };
}

export interface OllamaResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  context?: number[];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_duration?: number;
  eval_duration?: number;
}

export class OllamaService {
  private baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:11434') {
    this.baseUrl = baseUrl;
  }

  async generateText(request: OllamaRequest): Promise<string> {
    try {
      console.log(`🤖 Calling Ollama model: ${request.model}`);
      console.log(`📝 Prompt: ${request.prompt.substring(0, 100)}...`);

      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: request.model,
          prompt: request.prompt,
          stream: false,
          options: request.options || {}
        })
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json() as OllamaResponse;
      
      console.log(`✅ Ollama response received (${result.response.length} characters)`);
      return result.response;

    } catch (error) {
      console.error('❌ Ollama API error:', error);
      throw new Error(`Failed to call Ollama model ${request.model}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async listModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      if (!response.ok) {
        throw new Error(`Failed to list models: ${response.status}`);
      }
      
      const result = await response.json() as { models?: Array<{ name: string }> };
      return result.models?.map((model) => model.name) || [];
    } catch (error) {
      console.error('❌ Failed to list Ollama models:', error);
      return [];
    }
  }

  async isModelAvailable(modelName: string): Promise<boolean> {
    try {
      const models = await this.listModels();
      return models.includes(modelName);
    } catch (error) {
      console.error(`❌ Error checking model availability for ${modelName}:`, error);
      return false;
    }
  }
} 