// src/components/graph-runner/GraphSelector.tsx
import React from 'react';
import { Select, Typography, Empty } from 'antd';
import { ApartmentOutlined, AppstoreOutlined } from '@ant-design/icons';
import { useGraphRunnerStore } from '../../store/graphRunnerStore';

const { Option } = Select;
const { Text } = Typography;

const GraphSelector: React.FC = () => {
  const { graphs, selectedGraph, selectGraph, loading } = useGraphRunnerStore();

  return (
    <div className="graph-card graph-selector">
      <div className="graph-card-header">
        <h3 className="graph-card-title">
          <ApartmentOutlined className="card-icon" />
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
          notFoundContent={
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="No graphs available"
              className="select-empty"
            />
          }
          dropdownRender={(menu) => (
            <div className="custom-dropdown">
              <div className="dropdown-header">
                <AppstoreOutlined className="dropdown-icon" />
                <span>Available Graphs</span>
              </div>
              {menu}
            </div>
          )}
          className="graph-select"
        >
          {graphs.map(graph => (
            <Option key={graph} value={graph}>
              <div className="graph-option">
                <ApartmentOutlined className="graph-option-icon" />
                <span>{graph}</span>
              </div>
            </Option>
          ))}
        </Select>
      </div>
    </div>
  );
};

export default GraphSelector;