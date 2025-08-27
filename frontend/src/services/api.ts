// API service for connecting to backend
const API_BASE_URL = process.env.VITE_API_URL || 
  (window.location.hostname === 'localhost' ? 'http://localhost:4000' : 'https://roundaible.vercel.app');

export class ApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  async healthCheck(): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/api/health`);
      return await response.json();
    } catch (error) {
      console.error('Health check failed:', error);
      return { status: 'error', message: 'Backend not connected' };
    }
  }

  async executeWorkflow(workflowId: string, data: any): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/api/workflows/${workflowId}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      return await response.json();
    } catch (error) {
      console.error('Workflow execution failed:', error);
      throw error;
    }
  }

  async getWorkflowStatus(workflowId: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/api/workflows/${workflowId}/status`);
      return await response.json();
    } catch (error) {
      console.error('Get workflow status failed:', error);
      throw error;
    }
  }
}

export const apiService = new ApiService();
