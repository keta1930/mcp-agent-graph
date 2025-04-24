// src/components/mcp-manager/MCPToolsViewer.tsx
import React, { useState, useEffect } from 'react';
import { Modal, Tabs, Card, Typography, Descriptions, Collapse } from 'antd';
import { useMCPStore } from '../../store/mcpStore';

const { Text, Paragraph } = Typography;
const { Panel } = Collapse;

interface MCPToolsViewerProps {
  visible: boolean;
  onClose: () => void;
  serverName: string;
}

const MCPToolsViewer: React.FC<MCPToolsViewerProps> = ({
  visible,
  onClose,
  serverName,
}) => {
  const { tools, fetchTools } = useMCPStore();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      setLoading(true);
      fetchTools().finally(() => setLoading(false));
    }
  }, [visible, fetchTools]);

  const serverTools = tools[serverName] || [];

  // Function to render a JSON object with proper formatting
  const renderJsonObject = (obj: any) => {
    if (!obj) return <span>null</span>;

    return (
      <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-96">
        {JSON.stringify(obj, null, 2)}
      </pre>
    );
  };

  return (
    <Modal
      title={`Tools for ${serverName}`}
      open={visible}
      onCancel={onClose}
      footer={null}
      width={800}
    >
      {loading ? (
        <div className="text-center py-4">Loading tools...</div>
      ) : serverTools.length === 0 ? (
        <div className="text-center py-4">No tools available</div>
      ) : (
        <Tabs
          type="card"
          items={serverTools.map(tool => ({
            key: tool.name,
            label: tool.name,
            children: (
              <Card>
                <Descriptions column={1} bordered>
                  <Descriptions.Item label="Name">
                    <Text strong>{tool.name}</Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="Description">
                    {tool.description}
                  </Descriptions.Item>
                  <Descriptions.Item label="Input Schema">
                    {renderJsonObject(tool.input_schema)}
                  </Descriptions.Item>
                </Descriptions>
              </Card>
            )
          }))}
        />
      )}
    </Modal>
  );
};

export default MCPToolsViewer;