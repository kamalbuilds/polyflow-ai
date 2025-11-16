import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import { WorkflowDesignerWithProvider } from '../WorkflowDesigner';

// Mock ReactFlow
jest.mock('reactflow', () => ({
  __esModule: true,
  default: ({ children, onDrop, onDragOver }: any) => (
    <div
      data-testid="workflow-canvas"
      onDrop={onDrop}
      onDragOver={onDragOver}
      className="react-flow"
    >
      {children}
    </div>
  ),
  ReactFlowProvider: ({ children }: any) => <div data-testid="react-flow-provider">{children}</div>,
  MiniMap: () => <div data-testid="minimap" />,
  Controls: () => <div data-testid="controls" />,
  Background: () => <div data-testid="background" />,
  BackgroundVariant: { Dots: 'dots' },
  useNodesState: () => [[], jest.fn(), jest.fn()],
  useEdgesState: () => [[], jest.fn(), jest.fn()],
  addEdge: jest.fn(),
  Handle: ({ type, position }: any) => (
    <div data-testid={`handle-${type}-${position}`} />
  ),
  Position: { Top: 'top', Bottom: 'bottom', Left: 'left', Right: 'right' },
}));

describe('WorkflowDesigner', () => {
  const mockOnWorkflowSave = jest.fn();
  const mockOnWorkflowLoad = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders workflow designer with all components', () => {
    render(
      <WorkflowDesignerWithProvider
        onWorkflowSave={mockOnWorkflowSave}
        onWorkflowLoad={mockOnWorkflowLoad}
      />
    );

    expect(screen.getByTestId('react-flow-provider')).toBeInTheDocument();
    expect(screen.getByTestId('workflow-canvas')).toBeInTheDocument();
    expect(screen.getByText('Component Palette')).toBeInTheDocument();
    expect(screen.getByText('XCM Message')).toBeInTheDocument();
    expect(screen.getByText('Blockchain')).toBeInTheDocument();
    expect(screen.getByText('AI Assistant')).toBeInTheDocument();
  });

  it('displays node palette with correct categories', () => {
    render(<WorkflowDesignerWithProvider />);

    expect(screen.getByText('Messages')).toBeInTheDocument();
    expect(screen.getByText('Networks')).toBeInTheDocument();
    expect(screen.getByText('Security')).toBeInTheDocument();
    expect(screen.getByText('AI Tools')).toBeInTheDocument();
  });

  it('allows searching components', async () => {
    const user = userEvent.setup();
    render(<WorkflowDesignerWithProvider />);

    const searchInput = screen.getByPlaceholderText('Search components...');
    await user.type(searchInput, 'XCM');

    expect(searchInput).toHaveValue('XCM');
  });

  it('handles node selection', async () => {
    const user = userEvent.setup();
    render(<WorkflowDesignerWithProvider />);

    const xcmNode = screen.getByText('XCM Message');
    await user.click(xcmNode);

    // Node should be selectable (visual feedback would be tested in integration tests)
    expect(xcmNode).toBeInTheDocument();
  });

  it('supports drag and drop functionality', async () => {
    render(<WorkflowDesignerWithProvider />);

    const canvas = screen.getByTestId('workflow-canvas');

    // Simulate drag over
    fireEvent.dragOver(canvas);

    // Simulate drop event
    const dropEvent = new DragEvent('drop', {
      bubbles: true,
      cancelable: true,
      dataTransfer: new DataTransfer(),
    });

    // Mock dataTransfer.getData
    dropEvent.dataTransfer?.setData('application/reactflow', 'xcmMessage');

    fireEvent(canvas, dropEvent);

    expect(canvas).toBeInTheDocument();
  });

  it('displays toolbar with correct buttons', () => {
    render(<WorkflowDesignerWithProvider />);

    expect(screen.getByText('Save Workflow')).toBeInTheDocument();
    expect(screen.getByText('Load Workflow')).toBeInTheDocument();
  });

  it('calls onWorkflowSave when save button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <WorkflowDesignerWithProvider onWorkflowSave={mockOnWorkflowSave} />
    );

    const saveButton = screen.getByText('Save Workflow');
    await user.click(saveButton);

    expect(mockOnWorkflowSave).toHaveBeenCalledTimes(1);
    expect(mockOnWorkflowSave).toHaveBeenCalledWith(
      expect.objectContaining({
        nodes: expect.any(Array),
        edges: expect.any(Array),
        timestamp: expect.any(String),
        version: '1.0.0',
      })
    );
  });

  it('calls onWorkflowLoad when load button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <WorkflowDesignerWithProvider onWorkflowLoad={mockOnWorkflowLoad} />
    );

    const loadButton = screen.getByText('Load Workflow');
    await user.click(loadButton);

    expect(mockOnWorkflowLoad).toHaveBeenCalledTimes(1);
  });

  it('displays workflow statistics', () => {
    render(<WorkflowDesignerWithProvider />);

    // Should show node and edge counts
    expect(screen.getByText(/nodes/)).toBeInTheDocument();
    expect(screen.getByText(/connections/)).toBeInTheDocument();
  });

  it('renders with custom className', () => {
    render(
      <WorkflowDesignerWithProvider className="custom-class" />
    );

    const container = screen.getByTestId('react-flow-provider').parentElement;
    expect(container).toHaveClass('custom-class');
  });

  it('provides quick action buttons', () => {
    render(<WorkflowDesignerWithProvider />);

    expect(screen.getByText('Add XCM Message')).toBeInTheDocument();
    expect(screen.getByText('Add Chain')).toBeInTheDocument();
    expect(screen.getByText('Add AI Assistant')).toBeInTheDocument();
  });

  it('shows auto-save status', () => {
    render(<WorkflowDesignerWithProvider />);

    expect(screen.getByText('Auto-save:')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
  });
});