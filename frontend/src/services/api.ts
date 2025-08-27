// API service for GitHub Pages deployment
// Uses client-side API when deployed, falls back to local backend for development

export class ApiService {
  private isLocalhost: boolean;
  private localApiUrl: string;

  constructor() {
    this.isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    this.localApiUrl = 'http://localhost:4000';
  }

  private getApi() {
    // Check if we're on GitHub Pages
    const isGitHubPages = window.location.hostname.includes('github.io') || 
                         window.location.hostname.includes('navid-moradimehr.github.io');
    
    if (this.isLocalhost && !isGitHubPages) {
      // Use local backend for development
      return {
        healthCheck: async () => {
          const response = await fetch(`${this.localApiUrl}/api/health`);
          return await response.json();
        },
        executeWorkflow: async (workflowId: string, data: any) => {
          const response = await fetch(`${this.localApiUrl}/api/workflows/${workflowId}/execute`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          });
          return await response.json();
        },
        getWorkflowStatus: async (workflowId: string) => {
          const response = await fetch(`${this.localApiUrl}/api/workflows/${workflowId}/status`);
          return await response.json();
        }
      };
    } else {
      // Use client-side API for GitHub Pages
      console.log('Using client-side API for GitHub Pages deployment');
      return (window as any).RoundAIbleAPI;
    }
  }

  async healthCheck(): Promise<any> {
    try {
      const api = this.getApi();
      return await api.healthCheck();
    } catch (error) {
      console.error('Health check failed:', error);
      return { status: 'error', message: 'API not available' };
    }
  }

  async executeWorkflow(workflowId: string, data: any): Promise<any> {
    try {
      const api = this.getApi();
      return await api.executeWorkflow(workflowId, data);
    } catch (error) {
      console.error('Workflow execution failed:', error);
      throw error;
    }
  }

  async getWorkflowStatus(workflowId: string): Promise<any> {
    try {
      const api = this.getApi();
      return await api.getWorkflowStatus(workflowId);
    } catch (error) {
      console.error('Get workflow status failed:', error);
      throw error;
    }
  }
}

export const apiService = new ApiService();
