'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  useDraggable,
  useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  PlusIcon,
  PlayIcon,
  PauseIcon,
  StopIcon,
  Cog6ToothIcon,
  ArrowPathIcon,
  DocumentArrowDownIcon,
  ShareIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';
import { cn } from '@/utils';
import { useWorkflowEditorStore } from '@/hooks/useStore';

// Node types available in the palette
const nodeTypes = [
  {
    id: 'xcm-message',
    type: 'xcm-message',
    title: 'XCM Message',
    description: 'Send cross-consensus message',
    icon: '📡',
    category: 'Communication',
    color: 'bg-blue-500',
  },
  {
    id: 'contract-call',
    type: 'contract-call',
    title: 'Contract Call',
    description: 'Execute smart contract function',
    icon: '⚙️',
    category: 'Execution',
    color: 'bg-green-500',
  },
  {
    id: 'condition',
    type: 'condition',
    title: 'Condition',
    description: 'Conditional logic branch',
    icon: '🔀',
    category: 'Logic',
    color: 'bg-yellow-500',
  },
  {
    id: 'delay',
    type: 'delay',
    title: 'Delay',
    description: 'Wait for specified time',
    icon: '⏱️',
    category: 'Utility',
    color: 'bg-purple-500',
  },
  {
    id: 'transaction',
    type: 'transaction',
    title: 'Transaction',
    description: 'Submit blockchain transaction',
    icon: '💸',
    category: 'Blockchain',
    color: 'bg-red-500',
  },
];

// Draggable node component
function DraggableNode({ node }: { node: typeof nodeTypes[0] }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: node.id,
    data: { type: 'palette-node', nodeType: node },
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        'p-3 bg-card border border-border rounded-lg cursor-move hover:shadow-md transition-all duration-200 group',
        isDragging && 'opacity-50'
      )}
    >
      <div className="flex items-center space-x-3">
        <div className={cn('w-8 h-8 rounded-md flex items-center justify-center text-white', node.color)}>
          <span className="text-sm">{node.icon}</span>
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-foreground truncate">{node.title}</h4>
          <p className="text-xs text-muted-foreground truncate">{node.description}</p>
        </div>
      </div>
    </div>
  );
}

// Workflow node component
function WorkflowNode({ node }: { node: any }) {
  const { selectedNode, selectNode, updateNode } = useWorkflowEditorStore();
  const isSelected = selectedNode === node.id;

  return (
    <div
      className={cn(
        'workflow-node cursor-pointer min-w-[200px]',
        isSelected && 'selected'
      )}
      onClick={() => selectNode(node.id)}
      style={{
        position: 'absolute',
        left: node.position.x,
        top: node.position.y,
      }}
    >
      <div className="flex items-center space-x-3 mb-2">
        <div className={cn('w-8 h-8 rounded-md flex items-center justify-center text-white',
          nodeTypes.find(t => t.type === node.type)?.color || 'bg-gray-500'
        )}>
          <span className="text-sm">{nodeTypes.find(t => t.type === node.type)?.icon || '🔧'}</span>
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-foreground">{node.title}</h4>
          <p className="text-xs text-muted-foreground">{node.type}</p>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            // Open node configuration
          }}
          className="p-1 rounded-md hover:bg-accent transition-colors"
        >
          <Cog6ToothIcon className="w-4 h-4" />
        </button>
      </div>

      {node.description && (
        <p className="text-xs text-muted-foreground mb-3">{node.description}</p>
      )}

      {/* Connection Points */}
      <div className="flex justify-between items-center">
        {node.inputs?.length > 0 && (
          <div className="flex space-x-1">
            {node.inputs.map((input: string, index: number) => (
              <div
                key={index}
                className="w-3 h-3 border-2 border-primary rounded-full bg-background cursor-pointer hover:bg-primary transition-colors"
                title={input}
              />
            ))}
          </div>
        )}
        {node.outputs?.length > 0 && (
          <div className="flex space-x-1">
            {node.outputs.map((output: string, index: number) => (
              <div
                key={index}
                className="w-3 h-3 border-2 border-accent rounded-full bg-background cursor-pointer hover:bg-accent transition-colors"
                title={output}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Canvas component
function WorkflowCanvas({ children }: { children: React.ReactNode }) {
  const { setNodeRef } = useDroppable({
    id: 'workflow-canvas',
  });

  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPoint, setLastPanPoint] = useState({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0 && e.ctrlKey) { // Ctrl + left click for panning
      setIsPanning(true);
      setLastPanPoint({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      const deltaX = e.clientX - lastPanPoint.x;
      const deltaY = e.clientY - lastPanPoint.y;
      setPanOffset(prev => ({
        x: prev.x + deltaX,
        y: prev.y + deltaY,
      }));
      setLastPanPoint({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey) {
      e.preventDefault();
      const scaleDelta = e.deltaY > 0 ? 0.9 : 1.1;
      setScale(prev => Math.min(Math.max(prev * scaleDelta, 0.1), 3));
    }
  };

  return (
    <div
      ref={setNodeRef}
      className="flex-1 bg-muted/20 overflow-hidden relative"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
      style={{ cursor: isPanning ? 'grabbing' : 'default' }}
    >
      <div
        className="absolute inset-0 origin-top-left transition-transform"
        style={{
          transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${scale})`,
        }}
      >
        {/* Grid Pattern */}
        <div
          className="absolute inset-0 opacity-50"
          style={{
            backgroundImage: `
              radial-gradient(circle, hsl(var(--muted-foreground) / 0.3) 1px, transparent 1px)
            `,
            backgroundSize: '20px 20px',
          }}
        />

        {children}
      </div>

      {/* Canvas Controls */}
      <div className="absolute bottom-4 right-4 flex items-center space-x-2 bg-background border border-border rounded-lg p-2">
        <button
          onClick={() => setScale(1)}
          className="px-2 py-1 text-xs bg-muted rounded hover:bg-accent transition-colors"
        >
          Reset Zoom
        </button>
        <div className="text-xs text-muted-foreground">
          {Math.round(scale * 100)}%
        </div>
      </div>

      {/* Help Text */}
      <div className="absolute top-4 left-4 text-xs text-muted-foreground bg-background/80 backdrop-blur-sm border border-border rounded-lg p-2">
        <div>Ctrl + Mouse Wheel: Zoom</div>
        <div>Ctrl + Drag: Pan Canvas</div>
        <div>Drag from palette to add nodes</div>
      </div>
    </div>
  );
}

export default function WorkflowsPage() {
  const [activeWorkflow, setActiveWorkflow] = useState<any>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const {
    nodes,
    edges,
    selectedNode,
    addNode,
    selectNode,
    setNodes,
    saveToHistory
  } = useWorkflowEditorStore();

  const categories = ['All', ...Array.from(new Set(nodeTypes.map(n => n.category)))];

  const filteredNodes = selectedCategory === 'All'
    ? nodeTypes
    : nodeTypes.filter(n => n.category === selectedCategory);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && over.id === 'workflow-canvas') {
      const nodeType = active.data.current?.nodeType;
      if (nodeType) {
        const canvasRect = (over.rect?.current as HTMLElement)?.getBoundingClientRect();
        const newNode = {
          id: `node_${Date.now()}`,
          type: nodeType.type,
          title: nodeType.title,
          description: nodeType.description,
          position: {
            x: Math.random() * 400 + 100, // Random position for demo
            y: Math.random() * 300 + 100,
          },
          inputs: ['trigger'],
          outputs: ['success', 'error'],
          config: {},
        };

        addNode(newNode);
      }
    }
  };

  const runWorkflow = () => {
    setIsRunning(true);
    // Simulate workflow execution
    setTimeout(() => setIsRunning(false), 3000);
  };

  const stopWorkflow = () => {
    setIsRunning(false);
  };

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div className="flex h-full">
        {/* Sidebar - Node Palette */}
        <div className="w-80 bg-card border-r border-border flex flex-col">
          {/* Palette Header */}
          <div className="p-4 border-b border-border">
            <h2 className="text-lg font-semibold text-foreground mb-2">Node Palette</h2>
            <div className="flex flex-wrap gap-1">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={cn(
                    'px-2 py-1 text-xs rounded-md transition-colors',
                    selectedCategory === category
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-accent'
                  )}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          {/* Node List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {filteredNodes.map((node) => (
              <DraggableNode key={node.id} node={node} />
            ))}
          </div>

          {/* Workflow Actions */}
          <div className="p-4 border-t border-border space-y-2">
            <div className="flex space-x-2">
              {!isRunning ? (
                <button
                  onClick={runWorkflow}
                  className="flex-1 flex items-center justify-center px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <PlayIcon className="w-4 h-4 mr-2" />
                  Run Workflow
                </button>
              ) : (
                <button
                  onClick={stopWorkflow}
                  className="flex-1 flex items-center justify-center px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  <StopIcon className="w-4 h-4 mr-2" />
                  Stop
                </button>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button className="flex items-center justify-center px-2 py-2 bg-muted rounded-lg hover:bg-accent transition-colors">
                <DocumentArrowDownIcon className="w-4 h-4" />
              </button>
              <button className="flex items-center justify-center px-2 py-2 bg-muted rounded-lg hover:bg-accent transition-colors">
                <ShareIcon className="w-4 h-4" />
              </button>
              <button className="flex items-center justify-center px-2 py-2 bg-muted rounded-lg hover:bg-accent transition-colors">
                <EyeIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Main Canvas Area */}
        <div className="flex-1 flex flex-col">
          {/* Toolbar */}
          <div className="h-14 border-b border-border bg-card px-4 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-lg font-semibold text-foreground">
                Workflow Designer
              </h1>
              <div className="flex items-center text-sm text-muted-foreground">
                <div className={cn(
                  'w-2 h-2 rounded-full mr-2',
                  isRunning ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
                )} />
                {isRunning ? 'Running' : 'Ready'}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button className="p-2 rounded-lg hover:bg-accent transition-colors">
                <ArrowPathIcon className="w-4 h-4" />
              </button>
              <div className="text-sm text-muted-foreground">
                Nodes: {nodes.length} | Connections: {edges.length}
              </div>
            </div>
          </div>

          {/* Canvas */}
          <WorkflowCanvas>
            {nodes.map((node) => (
              <WorkflowNode key={node.id} node={node} />
            ))}

            {/* Render edges/connections here */}
            <svg className="absolute inset-0 pointer-events-none">
              {edges.map((edge) => {
                // Calculate edge path - simplified for demo
                const sourceNode = nodes.find(n => n.id === edge.source);
                const targetNode = nodes.find(n => n.id === edge.target);

                if (!sourceNode || !targetNode) return null;

                const x1 = sourceNode.position.x + 100; // Node center
                const y1 = sourceNode.position.y + 50;
                const x2 = targetNode.position.x + 100;
                const y2 = targetNode.position.y + 50;

                return (
                  <line
                    key={edge.id}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    className="workflow-edge"
                    markerEnd="url(#arrowhead)"
                  />
                );
              })}

              {/* Arrow marker definition */}
              <defs>
                <marker
                  id="arrowhead"
                  markerWidth="10"
                  markerHeight="7"
                  refX="9"
                  refY="3.5"
                  orient="auto"
                >
                  <polygon
                    points="0 0, 10 3.5, 0 7"
                    className="fill-border"
                  />
                </marker>
              </defs>
            </svg>
          </WorkflowCanvas>
        </div>

        {/* Properties Panel */}
        {selectedNode && (
          <div className="w-80 bg-card border-l border-border p-4">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Node Properties
            </h3>

            {/* Node configuration UI would go here */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Node ID
                </label>
                <input
                  type="text"
                  value={selectedNode}
                  readOnly
                  className="w-full px-3 py-2 bg-muted border-0 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Title
                </label>
                <input
                  type="text"
                  defaultValue={nodes.find(n => n.id === selectedNode)?.title || ''}
                  className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm focus:ring-2 focus:ring-ring"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Description
                </label>
                <textarea
                  defaultValue={nodes.find(n => n.id === selectedNode)?.description || ''}
                  className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm focus:ring-2 focus:ring-ring resize-none h-20"
                />
              </div>

              <button className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
                Update Node
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {/* Render dragging node preview here */}
      </DragOverlay>
    </DndContext>
  );
}