import fetch from 'node-fetch';

const testWorkflow = {
  id: 'test-workflow-1',
  name: 'Test Workflow',
  nodes: [
    {
      id: 'input_1',
      type: 'inputNode',
      position: { x: 0, y: 200 },
      data: {
        label: 'Input Node',
        inputType: 'new-code',
        prompt: 'Create a simple Python function to calculate factorial',
        rounds: 1,
        tagged: 'No',
        knowCompetitors: 'No',
        isCommented: false
      }
    },
    {
      id: 'reasoning_1',
      type: 'reasoningAgentNode',
      position: { x: 300, y: 200 },
      data: {
        label: 'API Reasoning',
        variant: 'api',
        providerModel: 'openai:gpt-4',
        isCommented: false
      }
    },
    {
      id: 'output_1',
      type: 'outputNode',
      position: { x: 600, y: 200 },
      data: {
        label: 'Output Node',
        results: [],
        winner: '',
        isCommented: false
      }
    }
  ],
  edges: [
    {
      id: 'e1-2',
      source: 'input_1',
      target: 'reasoning_1',
      sourceHandle: 'right',
      targetHandle: 'left'
    },
    {
      id: 'e2-3',
      source: 'reasoning_1',
      target: 'output_1',
      sourceHandle: 'right',
      targetHandle: 'left'
    }
  ],
  createdAt: new Date(),
  updatedAt: new Date(),
  isActive: true
};

async function testWorkflowExecution() {
  try {
    console.log('🧪 Testing workflow execution...');
    
    const response = await fetch('http://localhost:4000/api/workflows/test-workflow-1/execute', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ workflow: testWorkflow })
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Workflow execution successful!');
      console.log('📊 Execution status:', result.executionStatus.status);
      console.log('📈 Progress:', result.executionStatus.progress + '%');
      console.log('🔢 Results count:', result.executionStatus.results.length);
    } else {
      console.log('❌ Workflow execution failed:', result);
    }
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testWorkflowExecution(); 