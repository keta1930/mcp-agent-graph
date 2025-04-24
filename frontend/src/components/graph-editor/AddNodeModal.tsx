// src/components/graph-editor/AddNodeModal.tsx
import React from 'react';
import { Modal, Form, Input, Select, Switch } from 'antd';
import { useModelStore } from '../../store/modelStore';
import { useMCPStore } from '../../store/mcpStore';
import { useGraphEditorStore } from '../../store/graphEditorStore';

const { Option } = Select;

interface AddNodeModalProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (nodeData: any) => void;
}

const AddNodeModal: React.FC<AddNodeModalProps> = ({ visible, onClose, onAdd }) => {
  const [form] = Form.useForm();
  const { models } = useModelStore();
  const { config } = useMCPStore();
  const { graphs, currentGraph } = useGraphEditorStore();

  const mcpServers = Object.keys(config.mcpServers || {});

  // Available subgraphs - exclude current graph to avoid circular references
  const availableSubgraphs = graphs.filter(
    graphName => !currentGraph || graphName !== currentGraph.name
  );

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      onAdd(values);
      form.resetFields();
      onClose();
    } catch (error) {
      // Form validation error
    }
  };

  const handleTypeChange = (isSubgraph: boolean) => {
    // Reset related fields when switching type
    if (isSubgraph) {
      form.setFieldsValue({ model_name: undefined });
    } else {
      form.setFieldsValue({ subgraph_name: undefined });
    }
  };

  return (
    <Modal
      title="Add Node"
      open={visible}
      onOk={handleSubmit}
      onCancel={onClose}
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="name"
          label="Node Name"
          rules={[
            { required: true, message: 'Please enter node name' },
            {
              validator: (_, value) => {
                if (value && (/[/\\.]/.test(value))) {
                  return Promise.reject('Name cannot contain special characters (/, \\, .)');
                }
                return Promise.resolve();
              }
            }
          ]}
        >
          <Input placeholder="Enter node name" />
        </Form.Item>

        <Form.Item
          name="is_subgraph"
          label="Node Type"
          valuePropName="checked"
          initialValue={false}
        >
          <Switch
            checkedChildren="Subgraph"
            unCheckedChildren="Agent"
            onChange={handleTypeChange}
          />
        </Form.Item>

        <Form.Item
          noStyle
          shouldUpdate={(prevValues, currentValues) => prevValues.is_subgraph !== currentValues.is_subgraph}
        >
          {({ getFieldValue }) =>
            getFieldValue('is_subgraph') ? (
              <Form.Item
                name="subgraph_name"
                label="Subgraph"
                rules={[{ required: true, message: 'Please select a subgraph' }]}
              >
                <Select placeholder="Select subgraph">
                  {availableSubgraphs.map(graph => (
                    <Option key={graph} value={graph}>{graph}</Option>
                  ))}
                </Select>
              </Form.Item>
            ) : (
              <Form.Item
                name="model_name"
                label="Model"
                rules={[{ required: true, message: 'Please select a model' }]}
              >
                <Select placeholder="Select model">
                  {models.map(model => (
                    <Option key={model.name} value={model.name}>{model.name}</Option>
                  ))}
                </Select>
              </Form.Item>
            )
          }
        </Form.Item>

        <Form.Item
          name="mcp_servers"
          label="MCP Servers"
          initialValue={[]}
        >
          <Select mode="multiple" placeholder="Select MCP servers">
            {mcpServers.map(server => (
              <Option key={server} value={server}>{server}</Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          name="is_start"
          valuePropName="checked"
          initialValue={false}
        >
          <Switch checkedChildren="Start Node" unCheckedChildren="Normal Node" />
        </Form.Item>

        <Form.Item
          name="is_end"
          valuePropName="checked"
          initialValue={false}
        >
          <Switch checkedChildren="End Node" unCheckedChildren="Normal Node" />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default AddNodeModal;