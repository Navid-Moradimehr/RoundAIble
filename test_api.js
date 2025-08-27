const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:4000';

async function testAPI() {
  console.log('🧪 Testing RoundAIble Backend API...\n');

  // Test 1: Health Check
  console.log('1. Testing Health Check...');
  try {
    const healthResponse = await fetch(`${BASE_URL}/api/health`);
    const healthData = await healthResponse.json();
    console.log('✅ Health Check:', healthData);
  } catch (error) {
    console.log('❌ Health Check Failed:', error.message);
  }

  // Test 2: Get Workflows
  console.log('\n2. Testing Get Workflows...');
  try {
    const workflowsResponse = await fetch(`${BASE_URL}/api/workflows`);
    const workflowsData = await workflowsResponse.json();
    console.log('✅ Get Workflows:', workflowsData);
  } catch (error) {
    console.log('❌ Get Workflows Failed:', error.message);
  }

  // Test 3: Create Test Workflow
  console.log('\n3. Testing Create Workflow...');
  const testWorkflow = {
    name: 'Test Workflow',
    nodes: [
      {
        id: 'input_1',
        type: 'inputNode',
        position: { x: 0, y: 200 },
        data: {
          label: 'Test Input',
          inputType: 'new-code',
          prompt: 'Create a simple Python function',
          rounds: 1
        }
      },
      {
        id: 'roundaible_1',
        type: 'roundaibleNode',
        position: { x: 300, y: 200 },
        data: {}
      },
      {
        id: 'reason_1',
        type: 'reasoningAgentNode',
        position: { x: 300, y: 0 },
        data: {
          label: 'Test Reasoning',
          variant: 'api',
          providerModel: 'openai:gpt-4',
          temperature: 0.7
        }
      },
      {
        id: 'critic_1',
        type: 'criticNode',
        position: { x: 300, y: 400 },
        data: {
          label: 'Test Critic',
          variant: 'api',
          providerModel: 'openai:gpt-4',
          temperature: 0.6
        }
      }
    ],
    edges: [
      { id: 'e1', source: 'input_1', target: 'roundaible_1', sourceHandle: 'output', targetHandle: 'input' },
      { id: 'e2', source: 'reason_1', target: 'roundaible_1', sourceHandle: 'output', targetHandle: 'reasoning' },
      { id: 'e3', source: 'roundaible_1', target: 'critic_1', sourceHandle: 'critic', targetHandle: 'input' }
    ]
  };

  try {
    const createResponse = await fetch(`${BASE_URL}/api/workflows`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testWorkflow)
    });
    const createData = await createResponse.json();
    console.log('✅ Create Workflow:', createData);
    
    if (createData.id) {
      // Test 4: Execute Workflow (if creation was successful)
      console.log('\n4. Testing Workflow Execution...');
      try {
        const executeResponse = await fetch(`${BASE_URL}/api/workflows/${createData.id}/execute`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rounds: 1 })
        });
        const executeData = await executeResponse.json();
        console.log('✅ Execute Workflow:', executeData);
      } catch (error) {
        console.log('❌ Execute Workflow Failed:', error.message);
      }
    }
  } catch (error) {
    console.log('❌ Create Workflow Failed:', error.message);
  }

  // Test 5: Test Different Input Types
  console.log('\n5. Testing Input Type Validation...');
  
  const inputTypes = [
    {
      name: 'new-code',
      data: {
        inputType: 'new-code',
        prompt: 'Create a Python function',
        rounds: 1
      }
    },
    {
      name: 'modify-code',
      data: {
        inputType: 'modify-code',
        existingCode: 'def test(): return 42',
        modificationRequest: 'Add error handling',
        rounds: 1
      }
    },
    {
      name: 'fix-bug',
      data: {
        inputType: 'fix-bug',
        existingCode: 'def buggy(): return 1/0',
        errorMessage: 'Function crashes with division by zero',
        rounds: 1
      }
    }
  ];

  for (const inputType of inputTypes) {
    console.log(`\n   Testing ${inputType.name}...`);
    try {
      const validationResponse = await fetch(`${BASE_URL}/api/validate-input`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inputType.data)
      });
      const validationData = await validationResponse.json();
      console.log(`   ✅ ${inputType.name}:`, validationData);
    } catch (error) {
      console.log(`   ❌ ${inputType.name} Failed:`, error.message);
    }
  }

  console.log('\n🎉 API Testing Complete!');
}

// Run the tests
testAPI().catch(console.error); 