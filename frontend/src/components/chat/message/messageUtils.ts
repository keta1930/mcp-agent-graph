// 消息处理工具函数
import { ConversationMessage, TaskData, TaskRoundData } from '../../../types/conversation';

/**
 * 构建工具调用结果映射
 * 从rounds中提取所有工具调用的结果
 */
export const buildToolResultsMap = (rounds: any[]): Record<string, string> => {
  const toolResults: Record<string, string> = {};

  if (Array.isArray(rounds)) {
    rounds.forEach(round => {
      if (round && round.messages && Array.isArray(round.messages)) {
        round.messages.forEach((msg: ConversationMessage) => {
          if (msg && msg.role === 'tool' && msg.tool_call_id) {
            toolResults[msg.tool_call_id] = msg.content || '';
          }
        });
      }
    });
  }

  return toolResults;
};

/**
 * 构建task round数据映射
 * 通过tool_call_id关联task和round
 */
export const buildTaskRoundDataMap = (tasks: TaskData[] | undefined): Record<string, TaskRoundData> => {
  const taskRoundDataMap: Record<string, TaskRoundData> = {};

  if (Array.isArray(tasks)) {
    tasks.forEach(task => {
      task.rounds.forEach(round => {
        if (round.tool_call_id) {
          taskRoundDataMap[round.tool_call_id] = {
            task_id: task.task_id,
            agent_name: task.agent_name,
            round: round
          };
        }
      });
    });
  }

  return taskRoundDataMap;
};
