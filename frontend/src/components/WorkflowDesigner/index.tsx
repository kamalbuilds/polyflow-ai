import React, { useCallback, useMemo, useState } from 'react';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  ReactFlowProvider,
  BackgroundVariant,
} from 'reactflow';
import 'reactflow/dist/style.css';

import XCMMessageNode from './nodes/XCMMessageNode';
import ChainNode from './nodes/ChainNode';
import ValidationNode from './nodes/ValidationNode';
import AIAssistantNode from './nodes/AIAssistantNode';
import { WorkflowToolbar } from './components/WorkflowToolbar';
import { NodePalette } from './components/NodePalette';

const nodeTypes = {
  xcmMessage: XCMMessageNode,
  chain: ChainNode,
  validation: ValidationNode,
  aiAssistant: AIAssistantNode,
};

const initialNodes: Node[] = [
  {
    id: 'ai-1',
    type: 'aiAssistant',
    position: { x: 100, y: 100 },
    data: {
      label: 'AI Assistant',
      description: 'Natural language to XCM translation'
    },
  },
];

const initialEdges: Edge[] = [];

interface WorkflowDesignerProps {
  onWorkflowSave?: (workflow: any) => void;
  onWorkflowLoad?: () => void;
  className?: string;
}

export const WorkflowDesigner: React.FC<WorkflowDesignerProps> = ({
  onWorkflowSave,
  onWorkflowLoad,
  className = '',
}) => {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNodeType, setSelectedNodeType] = useState<string>('xcmMessage');

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const reactFlowBounds = (event.target as HTMLElement)
        .closest('.react-flow')
        ?.getBoundingClientRect();

      const type = event.dataTransfer.getData('application/reactflow');

      if (typeof type === 'undefined' || !type || !reactFlowBounds) {
        return;
      }

      const position = {
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      };

      const newNode: Node = {
        id: `${type}-${Date.now()}`,
        type,
        position,
        data: {
          label: `${type} node`,
          description: `New ${type} node`,
        },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [setNodes]
  );

  const handleSaveWorkflow = useCallback(() => {
    const workflow = {
      nodes,
      edges,
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    };
    onWorkflowSave?.(workflow);
  }, [nodes, edges, onWorkflowSave]);

  const handleLoadWorkflow = useCallback(() => {
    onWorkflowLoad?.();
  }, [onWorkflowLoad]);

  const proOptions = { hideAttribution: true };

  return (
    <div className={`h-full w-full flex ${className}`}>
      {/* Node Palette */}
      <div className="w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
        <NodePalette
          selectedNodeType={selectedNodeType}
          onNodeTypeSelect={setSelectedNodeType}
        />
      </div>

      {/* Main Workflow Canvas */}
      <div className="flex-1 relative">
        <WorkflowToolbar
          onSave={handleSaveWorkflow}
          onLoad={handleLoadWorkflow}
          nodeCount={nodes.length}
          edgeCount={edges.length}
        />

        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onDragOver={onDragOver}
          onDrop={onDrop}
          nodeTypes={nodeTypes}
          proOptions={proOptions}
          fitView
          className="bg-gray-50 dark:bg-gray-900"
        >
          <Controls
            position="bottom-left"
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
          />
          <MiniMap
            position="bottom-right"
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
            nodeColor={(node) => {
              switch (node.type) {
                case 'xcmMessage':
                  return '#3b82f6';
                case 'chain':
                  return '#10b981';
                case 'validation':
                  return '#f59e0b';
                case 'aiAssistant':
                  return '#8b5cf6';
                default:
                  return '#6b7280';
              }
            }}
          />
          <Background
            variant={BackgroundVariant.Dots}
            gap={12}
            size={1}
            className="bg-gray-50 dark:bg-gray-900"
          />
        </ReactFlow>
      </div>
    </div>
  );
};

export const WorkflowDesignerWithProvider: React.FC<WorkflowDesignerProps> = (props) => {
  return (
    <ReactFlowProvider>
      <WorkflowDesigner {...props} />
    </ReactFlowProvider>
  );
};

export default WorkflowDesignerWithProvider;