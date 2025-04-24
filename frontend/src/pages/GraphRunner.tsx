// src/pages/GraphRunner.tsx
import React, { useEffect } from 'react';
import { Row, Col, Alert } from 'antd';
import GraphSelector from '../components/graph-runner/GraphSelector';
import InputPanel from '../components/graph-runner/InputPanel';
import ResultPanel from '../components/graph-runner/ResultPanel';
import ConversationHistory from '../components/graph-runner/ConversationHistory';
import { useGraphRunnerStore } from '../store/graphRunnerStore';

const GraphRunner: React.FC = () => {
  const { fetchGraphs, error } = useGraphRunnerStore();

  useEffect(() => {
    fetchGraphs();
  }, [fetchGraphs]);

  return (
    <div className="graph-runner-container">
      <h1 className="graph-runner-title">Graph Runner</h1>

      {error && (
        <Alert
          message="Error"
          description={error}
          type="error"
          showIcon
          className="mb-4"
        />
      )}

      <Row gutter={[24, 24]}>
        <Col xs={24} lg={16}>
          <GraphSelector />
          <InputPanel />
          <ResultPanel />
        </Col>

        <Col xs={24} lg={8}>
          <ConversationHistory />
        </Col>
      </Row>
    </div>
  );
};

export default GraphRunner;