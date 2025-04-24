// src/components/graph-runner/GraphSelector.tsx
import React from 'react';
import { Select, Typography } from 'antd';
import { ApartmentOutlined } from '@ant-design/icons';
import { useGraphRunnerStore } from '../../store/graphRunnerStore';

const { Option } = Select;
const { Text } = Typography;

const GraphSelector: React.FC = () => {
  const { graphs, selectedGraph, selectGraph, loading } = useGraphRunnerStore();

  return (
    <div className="graph-card graph-selector">
      <div className="graph-card-header">
        <h3 className="graph-card-title">
          <ApartmentOutlined style={{ marginRight: '8px' }} />
          Select Graph
        </h3>
      </div>
      <div className="graph-card-body">
        <Text className="graph-selector-helper">
          Choose a workflow graph to execute
        </Text>

        <Select
          placeholder="Select a graph to run"
          loading={loading}
          value={selectedGraph}
          onChange={selectGraph}
          style={{ width: '100%' }}
          size="large"
          suffixIcon={<ApartmentOutlined />}
          optionFilterProp="children"
          showSearch
          notFoundContent="No graphs available"
        >
          {graphs.map(graph => (
            <Option key={graph} value={graph}>{graph}</Option>
          ))}
        </Select>
      </div>
    </div>
  );
};

export default GraphSelector;