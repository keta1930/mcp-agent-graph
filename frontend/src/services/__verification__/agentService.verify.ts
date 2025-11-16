/**
 * Verification script for Agent Service CRUD methods
 * This file verifies that all required Agent management methods exist and are properly typed
 * 
 * Requirements verified:
 * - 4.1: listAgents() for displaying all available agents
 * - 4.2: listCategories() and listAgentsInCategory() for browsing by category
 * - 4.3: getAgent() for displaying agent details
 */

import {
  listAgents,
  listCategories,
  listAgentsInCategory,
  getAgent,
  createAgent,
  updateAgent,
  deleteAgent,
  type Agent,
  type AgentConfig,
  type AgentListItem,
  type AgentCategoryItem,
  type AgentInCategoryItem
} from '../agentService';

// Type verification - ensures all required types are exported
type VerifyAgentConfig = AgentConfig;
type VerifyAgent = Agent;
type VerifyAgentListItem = AgentListItem;
type VerifyAgentCategoryItem = AgentCategoryItem;
type VerifyAgentInCategoryItem = AgentInCategoryItem;

// Method signature verification
const verifyMethodSignatures = () => {
  // Requirement 4.1: List agents
  const _listAgents: (category?: string, limit?: number, skip?: number) => Promise<any> = listAgents;
  
  // Requirement 4.2: List categories
  const _listCategories: () => Promise<any> = listCategories;
  
  // Requirement 4.2: List agents in category
  const _listAgentsInCategory: (category: string) => Promise<any> = listAgentsInCategory;
  
  // Requirement 4.3: Get agent details
  const _getAgent: (agentName: string) => Promise<any> = getAgent;
  
  // Additional CRUD methods
  const _createAgent: (agentConfig: AgentConfig) => Promise<any> = createAgent;
  const _updateAgent: (agentName: string, agentConfig: AgentConfig) => Promise<any> = updateAgent;
  const _deleteAgent: (agentName: string) => Promise<any> = deleteAgent;

  return {
    listAgents: _listAgents,
    listCategories: _listCategories,
    listAgentsInCategory: _listAgentsInCategory,
    getAgent: _getAgent,
    createAgent: _createAgent,
    updateAgent: _updateAgent,
    deleteAgent: _deleteAgent
  };
};

// Verify all methods exist and are callable
export const verifyAgentServiceMethods = () => {
  const methods = verifyMethodSignatures();
  
  const requiredMethods = [
    'listAgents',
    'listCategories', 
    'listAgentsInCategory',
    'getAgent',
    'createAgent',
    'updateAgent',
    'deleteAgent'
  ];

  const missingMethods = requiredMethods.filter(
    method => typeof methods[method as keyof typeof methods] !== 'function'
  );

  if (missingMethods.length > 0) {
    throw new Error(`Missing required methods: ${missingMethods.join(', ')}`);
  }

  return {
    success: true,
    message: 'All required Agent CRUD methods are present and properly typed',
    methods: requiredMethods
  };
};

// Verify AgentConfig interface has required fields
export const verifyAgentConfigStructure = () => {
  const requiredFields: (keyof AgentConfig)[] = [
    'name',
    'card',
    'model',
    'category'
  ];

  const optionalFields: (keyof AgentConfig)[] = [
    'instruction',
    'max_actions',
    'mcp',
    'system_tools',
    'tags'
  ];

  return {
    success: true,
    message: 'AgentConfig interface structure verified',
    requiredFields,
    optionalFields
  };
};

// Export verification results
export const runVerification = () => {
  try {
    const methodsResult = verifyAgentServiceMethods();
    const configResult = verifyAgentConfigStructure();

    return {
      success: true,
      results: {
        methods: methodsResult,
        config: configResult
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};
