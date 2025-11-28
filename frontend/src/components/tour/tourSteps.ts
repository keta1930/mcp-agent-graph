// src/components/tour/tourSteps.ts
import { TourStep } from './useTour';

// 工作台引导步骤
export const workspaceTourSteps: TourStep[] = [
  {
    element: '[data-tour="workspace-sidebar"]',
    titleKey: 'components.tour.workspace.sidebar.title',
    contentKey: 'components.tour.workspace.sidebar.content',
    placement: 'right'
  },
  {
    element: '[data-tour="workspace-agent-manager"]',
    titleKey: 'components.tour.workspace.agentManager.title',
    contentKey: 'components.tour.workspace.agentManager.content',
    placement: 'right'
  },
  {
    element: '[data-tour="workspace-graph-editor"]',
    titleKey: 'components.tour.workspace.graphEditor.title',
    contentKey: 'components.tour.workspace.graphEditor.content',
    placement: 'right'
  },
  {
    element: '[data-tour="workspace-model-manager"]',
    titleKey: 'components.tour.workspace.modelManager.title',
    contentKey: 'components.tour.workspace.modelManager.content',
    placement: 'right'
  },
  {
    element: '[data-tour="workspace-system-tools"]',
    titleKey: 'components.tour.workspace.systemTools.title',
    contentKey: 'components.tour.workspace.systemTools.content',
    placement: 'right'
  },
  {
    element: '[data-tour="workspace-mcp-manager"]',
    titleKey: 'components.tour.workspace.mcpManager.title',
    contentKey: 'components.tour.workspace.mcpManager.content',
    placement: 'right'
  },
  {
    element: '[data-tour="workspace-prompt-manager"]',
    titleKey: 'components.tour.workspace.promptManager.title',
    contentKey: 'components.tour.workspace.promptManager.content',
    placement: 'right'
  },
  {
    element: '[data-tour="workspace-file-manager"]',
    titleKey: 'components.tour.workspace.fileManager.title',
    contentKey: 'components.tour.workspace.fileManager.content',
    placement: 'right'
  },
  {
    element: '[data-tour="workspace-memory-manager"]',
    titleKey: 'components.tour.workspace.memoryManager.title',
    contentKey: 'components.tour.workspace.memoryManager.content',
    placement: 'right'
  },
  {
    element: '[data-tour="workspace-home-button"]',
    titleKey: 'components.tour.workspace.homeButton.title',
    contentKey: 'components.tour.workspace.homeButton.content',
    placement: 'top'
  },
  {
    element: '[data-tour="workspace-main-area"]',
    titleKey: 'components.tour.workspace.mainArea.title',
    contentKey: 'components.tour.workspace.mainArea.content',
    placement: 'left'
  }
];

// 对话系统引导步骤
export const chatTourSteps: TourStep[] = [
  {
    element: '[data-tour="chat-sidebar"]',
    titleKey: 'components.tour.chat.sidebar.title',
    contentKey: 'components.tour.chat.sidebar.content',
    placement: 'right'
  },
  {
    element: '[data-tour="chat-new-conversation"]',
    titleKey: 'components.tour.chat.newConversation.title',
    contentKey: 'components.tour.chat.newConversation.content',
    placement: 'right'
  },
  {
    element: '[data-tour="chat-workspace-button"]',
    titleKey: 'components.tour.chat.workspaceButton.title',
    contentKey: 'components.tour.chat.workspaceButton.content',
    placement: 'top'
  },
  {
    element: '[data-tour="chat-main-area"]',
    titleKey: 'components.tour.chat.mainArea.title',
    contentKey: 'components.tour.chat.mainArea.content',
    placement: 'left'
  },
  {
    element: '[data-tour="chat-mode-selector"]',
    titleKey: 'components.tour.chat.modeSelector.title',
    contentKey: 'components.tour.chat.modeSelector.content',
    placement: 'top'
  },
  {
    element: '[data-tour="chat-input-area"]',
    titleKey: 'components.tour.chat.inputArea.title',
    contentKey: 'components.tour.chat.inputArea.content',
    placement: 'top'
  }
];
