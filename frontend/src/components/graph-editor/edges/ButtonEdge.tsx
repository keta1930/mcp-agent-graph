import React from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  useReactFlow,
  EdgeProps,
} from 'reactflow';

/**
 * 标准连接边组件
 *
 * 使用贝塞尔曲线绘制节点间的连接，在边的中心位置显示删除按钮。
 * 这种设计允许用户在可视化编辑时快速移除不需要的连接关系。
 */
const ButtonEdge: React.FC<EdgeProps> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
}) => {
  const { setEdges } = useReactFlow();
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const onEdgeClick = () => {
    setEdges((edges) => {
      return edges.filter((edge) => edge.id !== id);
    });
  };

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={style}></BaseEdge>
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            fontSize: 12,
            pointerEvents: 'all',
          }}
          className="nodrag nopan"
        >
          <button className="edge-button" onClick={onEdgeClick}>
            ×
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  );
};

export default ButtonEdge;
