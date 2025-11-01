import React from 'react';
import {
  EdgeLabelRenderer,
  useReactFlow,
  EdgeProps,
} from 'reactflow';

/**
 * Handoffs 循环连接边组件
 *
 * 使用向上弯曲的弧线表示 Agent 之间的 handoffs 连接，特别是向上游或同级的连接。
 * 弧线设计的目的是在视觉上区分正常的流程连接和循环/回退连接，避免边的重叠和混淆。
 * 橙色虚线样式进一步强化了这种区分。
 */
const ArcEdge: React.FC<EdgeProps> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data,
}) => {
  const { setEdges } = useReactFlow();

  const createArcPath = () => {
    const midX = (sourceX + targetX) / 2;
    const midY = Math.min(sourceY, targetY) - 60;

    return `M ${sourceX} ${sourceY} Q ${midX} ${midY} ${targetX} ${targetY}`;
  };

  const onEdgeClick = () => {
    setEdges((edges) => {
      return edges.filter((edge) => edge.id !== id);
    });
  };

  const arcPath = createArcPath();
  const labelX = (sourceX + targetX) / 2;
  const labelY = Math.min(sourceY, targetY) - 30;

  return (
    <>
      <path
        d={arcPath}
        style={style}
        markerEnd={markerEnd}
        fill="none"
      />
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
          <button
            className="edge-button arc-edge-button"
            onClick={onEdgeClick}
            style={{
              backgroundColor: '#fa8c16',
              border: '2px solid white',
              borderRadius: '50%',
              width: '20px',
              height: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '12px',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(250, 140, 22, 0.4)'
            }}
          >
            ×
          </button>
          {data?.handoffs && (
            <div
              style={{
                position: 'absolute',
                top: '-25px',
                left: '50%',
                transform: 'translateX(-50%)',
                backgroundColor: '#fa8c16',
                color: 'white',
                padding: '2px 6px',
                borderRadius: '10px',
                fontSize: '10px',
                fontWeight: 'bold',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                whiteSpace: 'nowrap'
              }}
            >
              ↻ {data.handoffs}
            </div>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
};

export default ArcEdge;
