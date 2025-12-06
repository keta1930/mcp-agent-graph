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
  }
];
