// 图编辑器工具函数

/**
 * 生成随机节点位置
 */
export const generateNodePosition = () => {
  const baseX = 250;
  const baseY = 150;
  const randomOffset = () => (Math.random() - 0.5) * 100;

  return {
    x: baseX + randomOffset(),
    y: baseY + randomOffset()
  };
};

/**
 * 处理文件导入
 */
export const getFileExtension = (filename: string): string => {
  return filename.toLowerCase().split('.').pop() || '';
};

/**
 * 验证图名称
 */
export const validateGraphName = (name: string): boolean => {
  return !/[/\\.]/.test(name);
};
