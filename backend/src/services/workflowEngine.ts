import { Workflow, NodeModel, EdgeModel } from '../models/Workflow.js';
import { OllamaService } from './ollamaService.js';
import { ApiService } from './apiService.js';
import { HuggingFaceService } from './huggingfaceService.js';

export interface ExecutionResult {
  nodeId: string;
  output: any;
  timestamp: Date;
  duration: number;
}

export interface ExecutionStatus {
  workflowId: string;
  status: 'running' | 'completed' | 'failed';
  progress: number;
  results: ExecutionResult[];
  errors: string[];
  // Added for Results Panel
  codeResults?: any[];
  liveChatMessages?: any[];
  winner?: string;
  scores?: Record<string, number[]>;
  rationales?: Record<string, string[]>;
}

export class WorkflowEngine {
  private ollamaService: OllamaService;
  private apiService: ApiService;
  private huggingfaceService: HuggingFaceService;

  constructor() {
    this.ollamaService = new OllamaService();
    this.apiService = new ApiService();
    this.huggingfaceService = new HuggingFaceService();
  }

  async executeWorkflow(workflow: Workflow): Promise<ExecutionStatus> {
    console.log('🚀 === ROUNDAIBLE WORKFLOW EXECUTION START ===');
    console.log('🚀 RoundAIble Workflow Engine - Version 1.0');
    console.log('🚀 Workflow ID:', workflow.id);
    console.log('🚀 Workflow Name:', workflow.name);
    
    const status: ExecutionStatus = {
      workflowId: workflow.id,
      status: 'running',
      progress: 0,
      results: [],
      errors: []
    };

    // --- VALIDATION BLOCK: Abort on errors ---
    // Filter out commented nodes
    const activeNodes = workflow.nodes.filter(node => !node.data?.isCommented);
    const validationErrors: string[] = [];
    // Check for input node and validate based on input type
    const inputNode = activeNodes.find(n => n.type === 'inputNode');
    if (!inputNode) {
      validationErrors.push('Input node is missing. Please add an input node to begin the workflow.');
    } else {
      const inputType = inputNode.data?.inputType || 'new-code';
      
      if (inputType === 'new-code') {
        if (!inputNode.data?.prompt || inputNode.data.prompt.trim() === '') {
          validationErrors.push('Input node prompt is missing or empty. Please provide a prompt for new code generation.');
        }
      } else if (inputType === 'modify-code') {
        if (!inputNode.data?.existingCode || inputNode.data.existingCode.trim() === '') {
          validationErrors.push('Input node existing code is missing or empty. Please provide the code to modify.');
        }
        if (!inputNode.data?.modificationRequest || inputNode.data.modificationRequest.trim() === '') {
          validationErrors.push('Input node modification request is missing or empty. Please describe what modifications you want.');
        }
      } else if (inputType === 'fix-bug') {
        if (!inputNode.data?.existingCode || inputNode.data.existingCode.trim() === '') {
          validationErrors.push('Input node existing code is missing or empty. Please provide the code with the bug.');
        }
        if (!inputNode.data?.errorMessage || inputNode.data.errorMessage.trim() === '') {
          validationErrors.push('Input node error message is missing or empty. Please provide the error message you are getting.');
        }
      }
    }
    // Check for missing API keys in reasoning/critic nodes
    for (const node of activeNodes) {
      if ((node.type === 'reasoningAgentNode' || node.type === 'criticNode')) {
        const variant = node.data?.variant || 'api';
        // --- The frontend must send the correct apiKey field for both reasoning and critic nodes (for API models) ---
        if (variant === 'api' && !node.data?.apiKey) {
          validationErrors.push(`${node.data?.label || node.id}: API key is missing for API model.`);
        }
        if (variant === 'huggingface' && !node.data?.hfApiKey) {
          validationErrors.push(`${node.data?.label || node.id}: HuggingFace API key is missing for HuggingFace model.`);
        }
      }
    }
    if (validationErrors.length > 0) {
      status.errors = validationErrors;
      status.status = 'failed';
      return status;
    }

    try {
      // Filter out commented nodes
      const activeNodes = workflow.nodes.filter(node => !node.data?.isCommented);
      const activeEdges = workflow.edges.filter(edge => 
        activeNodes.some(n => n.id === edge.source) && activeNodes.some(n => n.id === edge.target)
      );

      console.log('🚀 Active nodes:', activeNodes.map(n => ({ id: n.id, type: n.type })));

      // Find start nodes (nodes with no incoming edges)
      const startNodes = activeNodes.filter(node => {
        return !activeEdges.some(edge => edge.target === node.id);
      });

      if (startNodes.length === 0) {
        throw new Error('No start nodes found! Add an Input node to begin the workflow.');
      }

      console.log('🚀 Start nodes:', startNodes.map(n => ({ id: n.id, type: n.type })));

      // Create execution map
      const nodeOutputs = new Map<string, any>();
      const processedNodes = new Set<string>();

      // Process regular nodes in topological order (skip MCP nodes)
      const processRegularNode = async (nodeId: string): Promise<any> => {
        if (processedNodes.has(nodeId)) {
          return nodeOutputs.get(nodeId);
        }

        const node = activeNodes.find(n => n.id === nodeId);
        if (!node) {
          throw new Error(`Node ${nodeId} not found`);
        }

        // Skip MCP nodes - they will be handled separately
        if (node.type === 'reasoningAgentNode' || node.type === 'criticNode') {
          console.log(`⏭️ Skipping MCP node: ${node.id} (${node.type})`);
          const output = { type: 'skipped', reason: 'handled_by_mcp' };
          nodeOutputs.set(nodeId, output);
          processedNodes.add(nodeId);
          return output;
        }

        // Get input data from connected nodes
        const inputEdges = activeEdges.filter(edge => edge.target === nodeId);
        const inputs: any[] = [];
        for (const edge of inputEdges) {
          const inputData = await processRegularNode(edge.source);
          inputs.push({
            data: inputData,
            sourceHandle: edge.sourceHandle,
            targetHandle: edge.targetHandle
          });
        }

        // Execute regular node
        const startTime = Date.now();
        let output: any;

        console.log(`🔄 Processing regular node: ${node.id} (${node.type})`);
        
        switch (node.type) {
          case 'inputNode':
            output = await this.executeInputNode(node, inputs);
            break;
          case 'roundaibleNode':
            output = await this.executeRoundaibleNode(node, inputs);
            break;
          default:
            throw new Error(`Unknown node type: ${node.type}`);
        }

        const duration = Date.now() - startTime;

        // Store output and mark as processed
        nodeOutputs.set(nodeId, output);
        processedNodes.add(nodeId);

        // Update status
        status.results.push({
          nodeId,
          output,
          timestamp: new Date(),
          duration
        });

        status.progress = (processedNodes.size / activeNodes.length) * 100;
        return output;
      };

      // Process all start nodes
      await Promise.all(startNodes.map(node => processRegularNode(node.id)));

      // === STEP 2: MCP Logic ===
      console.log('🚀 Step 2: Starting MCP Logic');
      
      // Extract user prompt
      const inputNodes = activeNodes.filter(node => node.type === 'inputNode');
      const inputNodeData = inputNodes[0]?.data || {};
      const inputType = inputNodeData.inputType || 'new-code';
      console.log('📝 [DEBUG] Received inputType from frontend:', inputNodeData.inputType);
      const userPrompt = inputNodeData.prompt || '';
      const existingCode = inputNodeData.existingCode || '';
      const modificationRequest = inputNodeData.modificationRequest || '';
      const errorMessage = inputNodeData.errorMessage || '';
      const additionalContext = inputNodeData.additionalContext || '';

      console.log('📝 User prompt extracted:', userPrompt ? `"${userPrompt.substring(0, 100)}..."` : 'EMPTY');

      // Find reasoning and critic nodes
      const reasoningNodes = activeNodes.filter(node => node.type === 'reasoningAgentNode');
      const criticNodes = activeNodes.filter(node => node.type === 'criticNode');
      
      console.log('🚀 Reasoning nodes found:', reasoningNodes.length);
      console.log('🚀 Critic nodes found:', criticNodes.length);

      // Get workflow configuration
      const reasoningRounds = (workflow as any).data?.reasoningRounds ?? 1;
      const tagAgents = (workflow as any).data?.tagAgents ?? false;

      // === STEP 3: Initial Code Generation ===
      console.log('🚀 Step 3: Initial Code Generation');
      
      let agentResults: any[] = [];
      let liveChatMessages: any[] = [];

      for (const node of reasoningNodes) {
        console.log(`🤖 Generating initial code with agent: ${node.data?.label || node.id}`);
        // Always use the full system prompt for code generation
        let codeGenPrompt = '';
        if (inputType === 'fix-bug') {
          codeGenPrompt = `You are an AI code reasoning agent. Your task is to fix the bug described below in the provided code.\n\nBug Description:\n${userPrompt}\n\nError Message (if any):\n${errorMessage}\n\nAdditional Context:\n${additionalContext}\n\nExisting Code:\n${existingCode}\n\nPlease provide your fixed code with the following format:\n---\nFilename: <filename>\n<code block>\n---\nDescription: <your explanation here>\n`;
        } else if (inputType === 'modify-code') {
          codeGenPrompt = `You are an AI code reasoning agent. Your task is to modify the provided code as described below.\n\nModification Request:\n${userPrompt}\n\nModification Details:\n${modificationRequest}\n\nExisting Code:\n${existingCode}\n\nPlease provide your modified code with the following format:\n---\nFilename: <filename>\n<code block>\n---\nDescription: <your explanation here>\n`;
        } else {
          codeGenPrompt = `You are an AI code reasoning agent. Your task is to write high-quality code based on the user's request.\n\nUser Request:\n${userPrompt}\n\nPlease provide your code solution with the following format:\n---\nFilename: <filename>\n<code block>\n---\nDescription: <your explanation here>\n`;
        }
        console.log(`📝 [DEBUG] inputType for agent ${node.data?.label || node.id}:`, inputType);
        console.log(`📝 [DEBUG] Initial code generation prompt for agent ${node.data?.label || node.id}:\n${codeGenPrompt.substring(0, 500)}${codeGenPrompt.length > 500 ? '... [truncated]' : ''}`);
        const result = await this.executeReasoningNode(node, [{ data: codeGenPrompt, prompt: codeGenPrompt }], status);
        agentResults.push(result);
        liveChatMessages.push({
          role: 'reasoning',
          sender: result.agent_id,
          content: result.codes?.map((c: any) => `${c.filename}:\n${c.content}`).join('\n\n') + '\n' + (result.description || ''),
          timestamp: new Date().toISOString()
        });
      }

      // === STEP 4: Multi-Round Reasoning (if configured) ===
      if (reasoningRounds > 1) {
        console.log(`🚀 Step 4: Multi-Round Reasoning (${reasoningRounds} rounds)`);
        for (let round = 2; round <= reasoningRounds; round++) {
          console.log(`🚀 Round ${round}/${reasoningRounds}`);
          const updatedResults: any[] = [];
          for (const node of reasoningNodes) {
            let agentId = node.data?.label || node.id;
            const variant = node.data?.variant || 'local';
            if (!node.data?.label) {
              if (variant === 'api') {
                agentId = node.data?.providerModel || 'openai:gpt-4';
              } else if (variant === 'huggingface') {
                agentId = node.data?.hfModel || 'mistralai/Mistral-7B-v0.3';
              } else if (variant === 'local') {
                agentId = node.data?.localModel || 'gemma3:4b';
              }
            }
            if (reasoningNodes.length === 1) {
              // Self-review for single agent
              const selfReviewPrompt = `You are an AI code reasoning agent. Review and improve your previous code based on the original user request.\n\nOriginal User Request:\n${userPrompt}\n\nYour previous code and explanation:\n${agentResults[0].codes?.map((c: any) => `Filename: ${c.filename}\n${c.content}`).join('\n')}\nDescription: ${agentResults[0].description}\n\nPlease review your code and provide an improved version. Consider:\n- Code quality and efficiency\n- Error handling\n- Documentation and comments\n- Edge cases\n- Best practices\n\nReturn your improved code and description in the same format as before.`;
              const updated = await this.executeReasoningNode(node, [{ data: selfReviewPrompt }], status);
              updatedResults.push(updated);
              liveChatMessages.push({
                role: 'reasoning',
                sender: agentId,
                content: `Round ${round} - Self Review:\n${updated.codes?.map((c: any) => `${c.filename}:\n${c.content}`).join('\n\n')}\n${updated.description || ''}`,
                timestamp: new Date().toISOString()
              });
            } else {
              // Peer review for multiple agents
              const peers = agentResults.filter(r => r.agent_id !== agentId);
              const peerReviewPrompt = `You are an AI code reasoning agent participating in a peer review session.\n\nOriginal User Request:\n${userPrompt}\n\nPeer Code Submissions:\n${peers.map((p: any) => `Agent: ${p.agent_id}\n${p.codes?.map((c: any) => `Filename: ${c.filename}\n${c.content}`).join('\n')}
Description: ${p.description}`).join('\n\n')}\n\nYour task: Review your peers' code and provide constructive feedback.`;
              const updated = await this.executeReasoningNode(node, [{ data: peerReviewPrompt }], status);
              updatedResults.push(updated);
              liveChatMessages.push({
                role: 'reasoning',
                sender: agentId,
                content: `Round ${round} - Peer Review:\n${updated.codes?.map((c: any) => `${c.filename}:\n${c.content}`).join('\n\n')}\n${updated.description || ''}`,
                timestamp: new Date().toISOString()
              });
            }
          }
          agentResults = updatedResults;
        }
        // === NEW: Revision Step After Peer Review ===
        if (reasoningNodes.length > 1) {
          const revisedResults: any[] = [];
          for (const node of reasoningNodes) {
            let agentId = node.data?.label || node.id;
            const variant = node.data?.variant || 'local';
            if (!node.data?.label) {
              if (variant === 'api') {
                agentId = node.data?.providerModel || 'openai:gpt-4';
              } else if (variant === 'huggingface') {
                agentId = node.data?.hfModel || 'mistralai/Mistral-7B-v0.3';
              } else if (variant === 'local') {
                agentId = node.data?.localModel || 'gemma3:4b';
              }
            }
            // Gather peer feedback for this agent
            const peerFeedbacks = agentResults.filter(r => r.agent_id !== agentId).map(r => r.description || '').join('\n---\n');
            const previousCode = agentResults.find(r => r.agent_id === agentId)?.codes?.map((c: any) => `Filename: ${c.filename}\n${c.content}`).join('\n') || '';
            const revisionPrompt = `You are an AI code reasoning agent. You have received peer feedback on your code.\n\nOriginal User Request:\n${userPrompt}\n\nYour Previous Code:\n${previousCode}\n\nPeer Feedback:\n${peerFeedbacks}\n\nPlease revise and improve your code based on the feedback above.`;
            console.log(`📝 [DEBUG] Revision prompt for agent ${agentId}:\n${revisionPrompt.substring(0, 500)}${revisionPrompt.length > 500 ? '... [truncated]' : ''}`);
            const revised = await this.executeReasoningNode(node, [{ data: revisionPrompt }], status);
            revisedResults.push(revised);
            liveChatMessages.push({
              role: 'reasoning',
              sender: agentId,
              content: `Revision after Peer Feedback:\n${revised.codes?.map((c: any) => `${c.filename}:\n${c.content}`).join('\n\n')}\n${revised.description || ''}`,
              timestamp: new Date().toISOString()
            });
          }
          agentResults = revisedResults;
        }
      }

      // === STEP 5: Critic Evaluation ===
      console.log('🚀 Step 5: Critic Evaluation');
      
      if (reasoningNodes.length === 1) {
        console.log('🚀 RoundAIble: Single agent detected - skipping critic evaluation');
        console.log('🚀 RoundAIble: No peer review or criticism needed for single agent');
        
        // For single agent, create simple results
        const finalSubmissions = agentResults.map((r, i) => ({
          code_id: `code_${i+1}`,
          codes: r.codes,
          description: r.description
        }));
        
        const codeResults = finalSubmissions.map(sub => ({
          code_id: sub.code_id,
          codes: sub.codes,
          description: sub.description,
          scores: [10.0],
          avgScore: 10.0,
          rationales: ['Single agent submission - no comparison needed'],
          critiques: ['Single agent submission - no peer review needed']
        }));
        
        const winnerCodeId = finalSubmissions[0]?.code_id || '';
        
        // Add completion message
          liveChatMessages.push({
          role: 'system',
          sender: 'RoundAIble',
          content: 'Single reasoning agent workflow completed. No peer review or criticism needed.',
            timestamp: new Date().toISOString()
          });
        
        status.codeResults = codeResults;
        status.liveChatMessages = liveChatMessages;
        status.winner = winnerCodeId;
        status.scores = { [winnerCodeId]: [10.0] };
        status.rationales = { [winnerCodeId]: ['Single agent submission'] };
      } else {
        console.log('🚀 RoundAIble: Multi-agent scenario detected - proceeding with critic evaluation');
        
        // Prepare final submissions for critics (only the last round's results)
        console.log('🚀 RoundAIble: Preparing final submissions for critics');
        console.log('🚀 RoundAIble: Number of final submissions:', agentResults.length);
        
        const finalSubmissions = agentResults.map((r, i) => {
          console.log(`🚀 RoundAIble: Final submission ${i+1} from agent: ${r.agent_id}`);
          return {
            code_id: `code_${i+1}`,
            codes: r.codes,
            description: r.description,
            agent_id: r.agent_id
          };
        });
        
      let allCriticEvaluations: any[] = [];
        
        // Execute critics (ROUNDAIBLE ONLY)
      for (const criticNode of criticNodes) {
          console.log(`🚀 RoundAIble: Executing critic: ${criticNode.data?.label || criticNode.id}`);
          console.log(`🚀 RoundAIble: This critic execution is handled by RoundAIble workflow engine only`);
          
          let criticPrompt = '';
          console.log('🚀 RoundAIble: Building critic prompt with final submissions');
          console.log('🚀 RoundAIble: Number of submissions for critic:', finalSubmissions.length);
          
          const codeSubmissions = finalSubmissions.map((sub, idx) => {
            console.log(`🚀 RoundAIble: Adding Code ${idx + 1} from agent: ${sub.agent_id}`);
            return `Code ${idx + 1}:\n${sub.codes?.map((c: any) => `${c.content}`).join('\n\n')}\n`;
          }).join('\n---\n');
          
          if (inputType === 'new-code') {
            criticPrompt = `Evaluate these code submissions for: "${userPrompt}"\n\n${codeSubmissions}\n\nRate each from 1-10 and provide brief feedback.\n\nRespond in this exact format:\nCode 1: [score] - [feedback]\nCode 2: [score] - [feedback]\n...`;
          } else if (inputType === 'fix-bug') {
            criticPrompt = `Evaluate bug fixes for: "${userPrompt}"\nError: ${errorMessage}\nOriginal: ${existingCode}\n\n${codeSubmissions}\n\nRate each from 1-10 and provide brief feedback.\n\nRespond in this exact format:\nCode 1: [score] - [feedback]\nCode 2: [score] - [feedback]\n...`;
          } else if (inputType === 'modify-code') {
            criticPrompt = `Evaluate code modifications for: "${userPrompt}"\nOriginal: ${existingCode}\n\n${codeSubmissions}\n\nRate each from 1-10 and provide brief feedback.\n\nRespond in this exact format:\nCode 1: [score] - [feedback]\nCode 2: [score] - [feedback]\n...`;
          }

          const evaluation = await this.executeCriticNode(
            criticNode,
            [{ data: criticPrompt }],
            status,
            { inputType, userPrompt, errorMessage, additionalContext, existingCode, modificationRequest }
          );
        allCriticEvaluations.push(evaluation);
          
          // Add critic feedback to live chat (only the response, not the prompt)
          if (evaluation.critiques) {
            Object.entries(evaluation.critiques).forEach(([codeId, critique]: [string, any]) => {
              liveChatMessages.push({
                role: 'critic',
                sender: `${criticNode.data?.label || criticNode.id} (${codeId})`,
                content: `Score: ${evaluation.scores?.[codeId] || 'N/A'}\nFeedback: ${critique}`,
                timestamp: new Date().toISOString()
              });
            });
          } else if (evaluation.feedback) {
            liveChatMessages.push({
              role: 'critic',
              sender: criticNode.data?.label || criticNode.id,
              content: `Evaluation: ${evaluation.feedback}`,
              timestamp: new Date().toISOString()
            });
          }
        }
        
        // Aggregate scores and determine winner
      const scoreMap: Record<string, number[]> = {};
      const rationaleMap: Record<string, string[]> = {};
        const criticMap: Record<string, string[]> = {};
        
      console.log('🚀 RoundAIble: Aggregating critic evaluations');
      for (const evalResult of allCriticEvaluations) {
        console.log('🚀 RoundAIble: Processing critic evaluation:', evalResult);
        if (evalResult.scores) {
          console.log('🚀 RoundAIble: Found scores:', evalResult.scores);
          for (const [codeId, score] of Object.entries(evalResult.scores)) {
            if (!scoreMap[codeId]) scoreMap[codeId] = [];
            scoreMap[codeId].push(score as number);
            console.log(`🚀 RoundAIble: Added score ${score} for ${codeId}`);
          }
        }
        if (evalResult.rationales) {
          console.log('🚀 RoundAIble: Found rationales:', evalResult.rationales);
          for (const [codeId, rationale] of Object.entries(evalResult.rationales)) {
            if (!rationaleMap[codeId]) rationaleMap[codeId] = [];
            rationaleMap[codeId].push(rationale as string);
          }
        }
        if (evalResult.critiques) {
          console.log('🚀 RoundAIble: Found critiques:', evalResult.critiques);
          for (const [codeId, critique] of Object.entries(evalResult.critiques)) {
            if (!criticMap[codeId]) criticMap[codeId] = [];
            criticMap[codeId].push(critique as string);
          }
        }
      }
      
      console.log('🚀 RoundAIble: Final score map:', scoreMap);
      console.log('🚀 RoundAIble: Final rationale map:', rationaleMap);
      console.log('🚀 RoundAIble: Final critic map:', criticMap);
        
      // Compute average scores and select winner
      let winnerCodeId = '';
      let maxAvgScore = -1;
      console.log('🚀 RoundAIble: Creating final codeResults with scores');
      const codeResults = finalSubmissions.map(sub => {
        const codeId = sub.code_id;
        const scores = scoreMap[codeId] || [];
        const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
        console.log(`🚀 RoundAIble: Code ${codeId} - scores: ${scores}, avgScore: ${avgScore}`);
        if (avgScore > maxAvgScore) {
          maxAvgScore = avgScore;
          winnerCodeId = codeId;
        }
        const result = {
          code_id: codeId,
          codes: sub.codes,
          description: sub.description,
          scores,
          avgScore,
          rationales: rationaleMap[codeId] || [],
          critiques: criticMap[codeId] || []
        };
        console.log(`🚀 RoundAIble: Final result for ${codeId}:`, result);
        return result;
      });
        
        status.codeResults = codeResults;
        status.liveChatMessages = liveChatMessages;
        status.winner = winnerCodeId;
        status.scores = scoreMap;
        status.rationales = rationaleMap;
        
        console.log('🚀 RoundAIble: Final status.codeResults:', status.codeResults);
        console.log('🚀 RoundAIble: Final status.winner:', status.winner);
      }
      // At the end, aggregate and return all results and liveChatMessages for the frontend
      agentResults.forEach((r: any) => {
        status.results.push({
          nodeId: r.agent_id || r.code_id || '',
          output: {
            agent_id: r.agent_id,
            code_id: r.code_id,
            codes: r.codes,
            description: r.description,
            scores: r.scores,
            avgScore: r.avgScore,
            rationales: r.rationales,
            role: 'reasoning',
            content: r.codes?.map((c: any) => `${c.filename}:\n${c.content}`).join('\n\n') + '\n' + (r.description || ''),
            timestamp: new Date().toISOString()
          },
          timestamp: new Date(),
          duration: 0
        });
      });
      liveChatMessages.forEach((msg: any) => {
        status.results.push({
          nodeId: msg.sender || '',
          output: {
            agent_id: msg.sender,
            role: msg.role,
            content: msg.content,
            timestamp: msg.timestamp
          },
          timestamp: new Date(),
          duration: 0
        });
      });
      status.status = 'completed';
      console.log('🎉 Workflow execution completed successfully!');
      console.log('🚀 RoundAIble: FINAL STATUS BEING RETURNED TO FRONTEND:');
      console.log('🚀 RoundAIble: status.codeResults:', JSON.stringify(status.codeResults, null, 2));
      console.log('🚀 RoundAIble: status.liveChatMessages:', status.liveChatMessages?.length || 0, 'messages');
      console.log('🚀 RoundAIble: status.winner:', status.winner);
      console.log('🚀 RoundAIble: status.scores:', status.scores);
      console.log('🚀 RoundAIble: status.rationales:', status.rationales);
      return status;
    } catch (error) {
      status.status = 'failed';
      status.errors.push(error instanceof Error ? error.message : 'Unknown error');
      console.error('❌ Workflow execution failed:', error);
    }

    return status;
  }

  // Node execution methods
  private async executeInputNode(node: NodeModel, inputs: any[]): Promise<any> {
    const inputType = node.data?.inputType || 'new-code';
    
    let structuredData: any = {
      type: 'input',
      inputType: inputType,
      timestamp: new Date().toISOString()
    };

    switch (inputType) {
      case 'new-code':
        structuredData = {
          ...structuredData,
          prompt: node.data?.prompt || '',
          description: 'New code generation request'
        };
        break;
      case 'modify-code':
        structuredData = {
          ...structuredData,
          existingCode: node.data?.existingCode || '',
          modificationRequest: node.data?.modificationRequest || '',
          description: 'Code modification request'
        };
        break;
      case 'fix-bug':
        structuredData = {
          ...structuredData,
          existingCode: node.data?.existingCode || '',
          errorMessage: node.data?.errorMessage || '',
          additionalContext: node.data?.additionalContext || '',
          description: 'Bug fix request'
        };
        break;
    }

    structuredData.config = {
      rounds: node.data?.rounds || 1,
      tagged: node.data?.tagged || 'No',
      knowCompetitors: node.data?.knowCompetitors || 'No'
    };

    return structuredData;
  }

  private async executeOutputNode(node: NodeModel, inputs: any[]): Promise<any> {
    return {
      type: 'output',
      data: inputs,
      timestamp: new Date().toISOString()
    };
  }

  private async executeLiveChatNode(node: NodeModel, inputs: any[]): Promise<any> {
    return {
      type: 'liveChat',
      messages: inputs,
      timestamp: new Date().toISOString()
    };
  }

  private async executeRoundaibleNode(node: NodeModel, inputs: any[]): Promise<any> {
    return {
      type: 'roundaible',
      data: inputs,
      timestamp: new Date().toISOString()
    };
  }

  private async executeReasoningNode(node: NodeModel, inputs: any[], status: ExecutionStatus): Promise<any> {
    const input = inputs[0] || { data: 'No input provided', prompt: 'No input provided' };
    let variant = node.data?.variant || 'local';
    let modelName = 'gemma3:4b'; // fallback

    // --- FIX: Force variant to 'api' for OpenAI models ---
    if (node.data?.providerModel) {
      if (node.data.providerModel.startsWith('openai:')) {
        variant = 'api';
        modelName = node.data.providerModel;
      }
    } else if (node.data?.hfModel) {
      variant = 'huggingface';
      modelName = node.data.hfModel;
    } else if (node.data?.localModel) {
      variant = 'local';
      modelName = node.data.localModel;
    } else {
      variant = variant || 'local';
    }

    console.log(`🛠 [DEBUG] Reasoning node model routing: variant=${variant}, modelName=${modelName}`);

    if (variant === 'api' && !node.data?.providerModel) {
      console.warn(`⚠️ Reasoning node ${node.id} has variant 'api' but no providerModel. Falling back to gemma3:4b.`);
      throw new Error(`Reasoning node ${node.id}: API model selected but providerModel is missing.`);
    }
    if (variant === 'huggingface' && !node.data?.hfModel) {
      console.warn(`⚠️ Reasoning node ${node.id} has variant 'huggingface' but no hfModel. Falling back to gemma3:4b.`);
      throw new Error(`Reasoning node ${node.id}: HuggingFace model selected but hfModel is missing.`);
    }
    if (variant === 'local' && !node.data?.localModel) {
      console.warn(`⚠️ Reasoning node ${node.id} has variant 'local' but no localModel. Falling back to gemma3:4b.`);
      throw new Error(`Reasoning node ${node.id}: Local model selected but localModel is missing.`);
    }

    try {
      let response = '';
      if (variant === 'local') {
        console.log(`🤖 Calling Ollama model: ${modelName}`);
        response = await this.ollamaService.generateText({
          model: modelName,
          prompt: input.data,
          options: {
            temperature: node.data?.temperature || 0.7,
            top_p: 0.8
          }
        });
        console.log(`✅ Ollama response received (${response.length} characters)`);
      } else if (variant === 'api') {
        console.log(`🤖 API-based reasoning with model: ${modelName}`);
        const provider = this.apiService.getProviderFromModel(modelName);
        const actualModel = this.apiService.getModelName(modelName);
        const apiKey = node.data?.apiKey || '';
        if (!apiKey) {
          throw new Error(`API key required for ${provider} model ${actualModel}`);
        }
        response = await this.apiService.generateText({
          provider,
          model: actualModel,
          prompt: input.data,
          apiKey,
          options: {
            temperature: node.data?.temperature || 0.7,
            max_tokens: node.data?.timeout ? node.data.timeout * 10 : 4000,
            top_p: 0.8
          }
        });
        console.log(`✅ API response received (${response.length} characters)`);
      } else if (variant === 'huggingface') {
        console.log(`🤖 HuggingFace-based reasoning with model: ${modelName}`);
        const apiKey = node.data?.hfApiKey || '';
        if (!apiKey) {
          throw new Error(`HuggingFace API key required for model ${modelName}`);
        }
        response = await this.huggingfaceService.generateText({
          model: modelName,
          prompt: input.data,
          apiKey,
          options: {
            temperature: node.data?.temperature || 0.7,
            max_new_tokens: node.data?.timeout ? node.data.timeout * 10 : 512,
            top_p: 0.8,
            do_sample: true,
            return_full_text: false
          }
        });
        console.log(`✅ HuggingFace response received (${response.length} characters)`);
      }

      // Parse the response to extract code and description
      let codes: Array<{ filename: string; content: string }> = [];
      let description = '';
      const codeMatches = response.match(/---\s*\nFilename:\s*([^\n]+)\s*\n([\s\S]*?)\s*---/g);
      if (codeMatches) {
        for (const match of codeMatches) {
          const filenameMatch = match.match(/Filename:\s*([^\n]+)/);
          const codeMatch = match.match(/---\s*\nFilename:\s*[^\n]+\s*\n([\s\S]*?)\s*---/);
          if (filenameMatch && codeMatch) {
            codes.push({ filename: filenameMatch[1].trim(), content: codeMatch[1].trim() });
          }
        }
      }
      
      // Extract description
      const descMatch = response.match(/Description:\s*([\s\S]*)$/);
      description = descMatch ? descMatch[1].trim() : '';

      // If no codes were parsed, create a fallback
      if (codes.length === 0) {
        codes = [{ filename: 'main.py', content: response }];
      }

      return {
        agent_id: node.data?.label || modelName,
        codes,
        description
      };
    } catch (error) {
      console.error(`❌ Error in reasoning node execution:`, error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      if (status.errors) status.errors.push(errorMsg);
      return {
        agent_id: node.data?.label || modelName,
        codes: [],
        description: `Error: ${errorMsg}`,
        error: errorMsg
      };
    }
  }

  private async executeCriticNode(
    node: NodeModel,
    inputs: any[],
    status: ExecutionStatus,
    context: {
      inputType: string;
      userPrompt: string;
      errorMessage: string;
      additionalContext: string;
      existingCode: string;
      modificationRequest: string;
    }
  ): Promise<any> {
    const input = inputs[0] || { analysis: 'No analysis provided' };
    let variant = node.data?.variant;
    let modelName = 'gemma3:4b'; // fallback

    if (node.data?.providerModel) {
      variant = 'api';
      modelName = node.data.providerModel;
    } else if (node.data?.hfModel) {
      variant = 'huggingface';
      modelName = node.data.hfModel;
    } else if (node.data?.localModel) {
      variant = 'local';
      modelName = node.data.localModel;
    } else {
      variant = variant || 'local';
    }

    if (variant === 'api' && !node.data?.providerModel) {
      console.warn(`⚠️ Critic node ${node.id} has variant 'api' but no providerModel. Falling back to gemma3:4b.`);
      throw new Error(`Critic node ${node.id}: API model selected but providerModel is missing.`);
    }
    if (variant === 'huggingface' && !node.data?.hfModel) {
      console.warn(`⚠️ Critic node ${node.id} has variant 'huggingface' but no hfModel. Falling back to gemma3:4b.`);
      throw new Error(`Critic node ${node.id}: HuggingFace model selected but hfModel is missing.`);
    }
    if (variant === 'local' && !node.data?.localModel) {
      console.warn(`⚠️ Critic node ${node.id} has variant 'local' but no localModel. Falling back to gemma3:4b.`);
      throw new Error(`Critic node ${node.id}: Local model selected but localModel is missing.`);
    }

    try {
      // Use the prompt passed from the main workflow execution
      const criticPrompt = input.data || input.prompt || 'No prompt provided';

      console.log(`🤖 Executing critic with ${variant} model: ${modelName}`);
      console.log(`📝 Prompt length: ${criticPrompt.length} characters`);
      
      let response = '';

      if (variant === 'local') {
        console.log(`🤖 Calling Ollama model: ${modelName}`);
        
        response = await this.ollamaService.generateText({
          model: modelName,
          prompt: criticPrompt,
          options: {
            temperature: 0.6,
            top_p: 0.8
          }
        });

        console.log(`✅ Ollama response received (${response.length} characters)`);
      } else if (variant === 'api') {
        console.log(`🤖 API-based critic with model: ${modelName}`);
        
        const provider = this.apiService.getProviderFromModel(modelName);
        const actualModel = this.apiService.getModelName(modelName);
        const apiKey = node.data?.apiKey || '';
        
        if (!apiKey) {
          throw new Error(`API key required for ${provider} model ${actualModel}`);
        }
        
        response = await this.apiService.generateText({
          provider,
          model: actualModel,
          prompt: criticPrompt,
          apiKey,
          options: {
            temperature: node.data?.temperature || 0.6,
            max_tokens: node.data?.timeout ? node.data.timeout * 10 : 4000,
            top_p: 0.8
          }
        });
      } else if (variant === 'huggingface') {
        console.log(`🤖 HuggingFace-based critic with model: ${modelName}`);
        
        const apiKey = node.data?.hfApiKey || '';
        
        if (!apiKey) {
          throw new Error(`HuggingFace API key required for model ${modelName}`);
        }
        
        response = await this.huggingfaceService.generateText({
          model: modelName,
          prompt: criticPrompt,
          apiKey,
          options: {
            temperature: node.data?.temperature || 0.6,
            max_new_tokens: node.data?.timeout ? node.data.timeout * 10 : 512,
            top_p: 0.8,
            do_sample: true,
            return_full_text: false
          }
        });
      }

      console.log(`🚀 RoundAIble: Critic response received (${response.length} characters)`);
      console.log(`🚀 RoundAIble: Critic response preview: ${response.substring(0, 200)}...`);
      
      // Try to parse JSON response
      try {
        const parsed = JSON.parse(response);
        console.log(`🚀 RoundAIble: Successfully parsed JSON response from critic`);
        return {
          type: 'critique',
          variant: variant,
          model: modelName,
          input: criticPrompt,
          scores: parsed.scores || {},
          rationales: parsed.rationales || {},
          critiques: parsed.critiques || {},
          timestamp: new Date().toISOString()
        };
      } catch (parseError) {
        console.log(`🚀 RoundAIble: JSON parsing failed, using fallback parsing`);
        // Fallback parsing for non-JSON responses
        const lines = response.split('\n').filter(line => line.trim());
        
        // Extract scores for each code submission
        const scores: Record<string, number> = {};
        const rationales: Record<string, string> = {};
        const critiques: Record<string, string> = {};
        
        // Look for patterns like "Code 1: 8.5" or "code_1: 7.0" or "Score: 8.5"
        const scoreMatches = response.match(/(?:code_(\d+)|Code\s*(\d+)|Submission\s*(\d+))[:\s]*(\d+(?:\.\d+)?)/gi);
        if (scoreMatches) {
          console.log(`🚀 RoundAIble: Found ${scoreMatches.length} score matches:`, scoreMatches);
          scoreMatches.forEach(match => {
            const parts = match.match(/(?:code_(\d+)|Code\s*(\d+)|Submission\s*(\d+))[:\s]*(\d+(?:\.\d+)?)/i);
            if (parts) {
              const codeId = parts[1] || parts[2] || parts[3];
              const score = parseFloat(parts[4]);
              console.log(`🚀 RoundAIble: Extracted score ${score} for code_${codeId}`);
              
              // Extract the specific feedback for this code
              const codePattern = new RegExp(`Code\\s*${codeId}[^\\n]*:\\s*${score}[^\\n]*\\s*-\\s*([^\\n]+(?:\\n[^\\n]+)*)`, 'i');
              const feedbackMatch = response.match(codePattern);
              const specificFeedback = feedbackMatch ? feedbackMatch[1].trim() : `Score: ${score} - General feedback`;
              
              scores[`code_${codeId}`] = score;
              rationales[`code_${codeId}`] = `Score: ${score} - ${specificFeedback}`;
              critiques[`code_${codeId}`] = specificFeedback;
            }
          });
                  } else {
            // Try to find any score-like patterns
            const generalScoreMatches = response.match(/(\d+(?:\.\d+)?)\s*\/\s*10|score[:\s]*(\d+(?:\.\d+)?)|rating[:\s]*(\d+(?:\.\d+)?)/gi);
            if (generalScoreMatches) {
              generalScoreMatches.forEach((match, index) => {
                const scoreMatch = match.match(/(\d+(?:\.\d+)?)/);
                if (scoreMatch) {
                  const score = parseFloat(scoreMatch[1]);
                  const codeId = index + 1;
                  scores[`code_${codeId}`] = score;
                  rationales[`code_${codeId}`] = `Score: ${score} - General feedback`;
                  critiques[`code_${codeId}`] = `General feedback for code ${codeId}`;
                }
              });
            } else {
              // If no specific scores found, assign a default score to all submissions
              // Try to determine how many code submissions there are from the prompt
              const codeCountMatch = criticPrompt.match(/Code\s+(\d+):/g);
              const numCodes = codeCountMatch ? codeCountMatch.length : 1;
              
              console.log(`🚀 RoundAIble: No scores found in critic response, assigning default scores to ${numCodes} codes`);
              
              for (let i = 1; i <= numCodes; i++) {
                const defaultScore = 7.0;
                scores[`code_${i}`] = defaultScore;
                rationales[`code_${i}`] = `Default score: ${defaultScore} - Default feedback`;
                critiques[`code_${i}`] = `Default feedback for code ${i}`;
              }
            }
          }
        
        return {
          type: 'critique',
          variant: variant,
          model: modelName,
          input: criticPrompt,
          scores: scores,
          rationales: rationales,
          critiques: critiques,
          timestamp: new Date().toISOString()
        };
      }
    } catch (error) {
      console.error(`❌ Error in critic node execution:`, error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      if (status.errors) status.errors.push(errorMsg);
      return {
        type: 'critique',
        variant: variant,
        model: modelName,
        input: input.analysis || input.data || 'No input provided',
        feedback: `Error: ${errorMsg}`,
        score: 0.0,
        timestamp: new Date().toISOString()
      };
    }
  }
} 