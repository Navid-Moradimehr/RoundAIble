import { Router, Request, Response } from 'express';
import { WorkflowEngine } from '../services/workflowEngine.js';
import { Workflow } from '../models/Workflow.js';

const router = Router();
const workflowEngine = new WorkflowEngine();

// Execute a workflow
router.post('/workflows/:id/execute', async (req: Request, res: Response) => {
  try {
    const workflowId = req.params.id;
    const workflow: Workflow = req.body.workflow;

    if (!workflow) {
      return res.status(400).json({ 
        error: 'Workflow data is required in request body' 
      });
    }

    if (workflow.id !== workflowId) {
      return res.status(400).json({ 
        error: 'Workflow ID mismatch' 
      });
    }

    console.log(`🚀 Starting workflow execution for: ${workflow.name}`);

    const executionStatus = await workflowEngine.executeWorkflow(workflow);

    return res.json({
      success: true,
      executionStatus
    });

  } catch (error) {
    console.error('❌ Workflow execution error:', error);
    return res.status(500).json({
      error: 'Workflow execution failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get execution status (for future real-time updates)
router.get('/workflows/:id/status', (req: Request, res: Response) => {
  const workflowId = req.params.id;
  
  // TODO: Implement real-time status tracking
  res.json({
    workflowId,
    status: 'completed',
    message: 'Status tracking not yet implemented'
  });
});

export default router; 