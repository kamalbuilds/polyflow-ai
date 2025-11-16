import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import AIChatInterface from '../AI/AIChatInterface';

// Mock window.webkitSpeechRecognition for voice input tests
const mockSpeechRecognition = {
  start: jest.fn(),
  stop: jest.fn(),
  onstart: null,
  onend: null,
  onresult: null,
  continuous: false,
  interimResults: false,
};

Object.defineProperty(window, 'webkitSpeechRecognition', {
  writable: true,
  value: jest.fn(() => mockSpeechRecognition),
});

describe('AIChatInterface', () => {
  const mockOnCodeGenerate = jest.fn();
  const mockOnWorkflowCreate = jest.fn();
  const mockOnXCMMessageCreate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders AI chat interface with initial message', () => {
    render(<AIChatInterface />);

    expect(screen.getByText('PolyFlow AI Assistant')).toBeInTheDocument();
    expect(screen.getByText('Your intelligent cross-chain development companion')).toBeInTheDocument();
    expect(screen.getByText(/Welcome to PolyFlow AI!/)).toBeInTheDocument();
  });

  it('displays input area with placeholder', () => {
    render(<AIChatInterface />);

    const input = screen.getByPlaceholderText('Ask me anything about cross-chain development...');
    expect(input).toBeInTheDocument();
  });

  it('displays quick action buttons', () => {
    render(<AIChatInterface />);

    expect(screen.getByText('XCM Transfer')).toBeInTheDocument();
    expect(screen.getByText('New Pallet')).toBeInTheDocument();
    expect(screen.getByText('Smart Contract')).toBeInTheDocument();
    expect(screen.getByText('Optimize')).toBeInTheDocument();
  });

  it('allows typing in the input field', async () => {
    const user = userEvent.setup();
    render(<AIChatInterface />);

    const input = screen.getByPlaceholderText('Ask me anything about cross-chain development...');
    await user.type(input, 'Create an XCM message');

    expect(input).toHaveValue('Create an XCM message');
  });

  it('sends message when send button is clicked', async () => {
    const user = userEvent.setup();
    render(<AIChatInterface />);

    const input = screen.getByPlaceholderText('Ask me anything about cross-chain development...');
    const sendButton = screen.getByTitle('Send message (Enter)');

    await user.type(input, 'Hello AI');
    await user.click(sendButton);

    await waitFor(() => {
      expect(screen.getByText('Hello AI')).toBeInTheDocument();
    });

    expect(input).toHaveValue('');
  });

  it('sends message when Enter key is pressed', async () => {
    const user = userEvent.setup();
    render(<AIChatInterface />);

    const input = screen.getByPlaceholderText('Ask me anything about cross-chain development...');

    await user.type(input, 'Test message{enter}');

    await waitFor(() => {
      expect(screen.getByText('Test message')).toBeInTheDocument();
    });
  });

  it('prevents sending empty messages', async () => {
    const user = userEvent.setup();
    render(<AIChatInterface />);

    const sendButton = screen.getByTitle('Send message (Enter)');

    // Send button should be disabled when input is empty
    expect(sendButton).toBeDisabled();

    await user.click(sendButton);

    // No new message should appear
    const messages = screen.getAllByText(/Welcome to PolyFlow AI!/);
    expect(messages).toHaveLength(1); // Only the initial message
  });

  it('shows loading state while AI is responding', async () => {
    const user = userEvent.setup();
    render(<AIChatInterface />);

    const input = screen.getByPlaceholderText('Ask me anything about cross-chain development...');
    const sendButton = screen.getByTitle('Send message (Enter)');

    await user.type(input, 'Test question');
    await user.click(sendButton);

    // Should show loading state
    expect(screen.getByText('AI is thinking...')).toBeInTheDocument();

    // Wait for response
    await waitFor(() => {
      expect(screen.queryByText('AI is thinking...')).not.toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('handles XCM-related queries correctly', async () => {
    const user = userEvent.setup();
    render(<AIChatInterface />);

    const input = screen.getByPlaceholderText('Ask me anything about cross-chain development...');

    await user.type(input, 'Create an XCM transfer');
    await user.click(screen.getByTitle('Send message (Enter)'));

    await waitFor(() => {
      expect(screen.getByText(/XCM message/)).toBeInTheDocument();
    });
  });

  it('handles pallet-related queries correctly', async () => {
    const user = userEvent.setup();
    render(<AIChatInterface />);

    const input = screen.getByPlaceholderText('Ask me anything about cross-chain development...');

    await user.type(input, 'Generate a Substrate pallet');
    await user.click(screen.getByTitle('Send message (Enter)'));

    await waitFor(() => {
      expect(screen.getByText(/Substrate pallet/)).toBeInTheDocument();
    });
  });

  it('displays suggested actions for responses', async () => {
    const user = userEvent.setup();
    render(<AIChatInterface />);

    const input = screen.getByPlaceholderText('Ask me anything about cross-chain development...');

    await user.type(input, 'Help me with XCM');
    await user.click(screen.getByTitle('Send message (Enter)'));

    await waitFor(() => {
      expect(screen.getByText('Create XCM Transfer')).toBeInTheDocument();
    });
  });

  it('calls onCodeGenerate when Generate Code action is clicked', async () => {
    const user = userEvent.setup();
    render(<AIChatInterface onCodeGenerate={mockOnCodeGenerate} />);

    const input = screen.getByPlaceholderText('Ask me anything about cross-chain development...');

    await user.type(input, 'Generate a pallet');
    await user.click(screen.getByTitle('Send message (Enter)'));

    await waitFor(() => {
      const generateButton = screen.getByText('Generate Pallet Code');
      expect(generateButton).toBeInTheDocument();
    });

    const generateButton = screen.getByText('Generate Pallet Code');
    await user.click(generateButton);

    expect(mockOnCodeGenerate).toHaveBeenCalledWith(
      expect.stringContaining('frame_support::pallet'),
      'rust'
    );
  });

  it('calls onXCMMessageCreate when Create XCM Transfer action is clicked', async () => {
    const user = userEvent.setup();
    render(<AIChatInterface onXCMMessageCreate={mockOnXCMMessageCreate} />);

    const input = screen.getByPlaceholderText('Ask me anything about cross-chain development...');

    await user.type(input, 'Create XCM transfer');
    await user.click(screen.getByTitle('Send message (Enter)'));

    await waitFor(() => {
      const xcmButton = screen.getByText('Create XCM Transfer');
      expect(xcmButton).toBeInTheDocument();
    });

    const xcmButton = screen.getByText('Create XCM Transfer');
    await user.click(xcmButton);

    expect(mockOnXCMMessageCreate).toHaveBeenCalledWith({
      type: 'transfer',
      source: expect.any(String),
    });
  });

  it('fills input with quick action text', async () => {
    const user = userEvent.setup();
    render(<AIChatInterface />);

    const quickActionButton = screen.getByText('XCM Transfer');
    await user.click(quickActionButton);

    const input = screen.getByPlaceholderText('Ask me anything about cross-chain development...');
    expect(input).toHaveValue('Create an XCM transfer from Polkadot to Acala');
  });

  it('shows confidence score for AI responses', async () => {
    const user = userEvent.setup();
    render(<AIChatInterface />);

    const input = screen.getByPlaceholderText('Ask me anything about cross-chain development...');

    await user.type(input, 'Test question');
    await user.click(screen.getByTitle('Send message (Enter)'));

    await waitFor(() => {
      expect(screen.getByText(/% confidence/)).toBeInTheDocument();
    });
  });

  it('supports voice input when available', async () => {
    const user = userEvent.setup();
    render(<AIChatInterface />);

    const voiceButton = screen.getByTitle('Voice input');
    await user.click(voiceButton);

    expect(mockSpeechRecognition.start).toHaveBeenCalled();
  });

  it('displays message timestamps', () => {
    render(<AIChatInterface />);

    // Initial message should have a timestamp
    expect(screen.getByText(new Date().toLocaleTimeString())).toBeInTheDocument();
  });

  it('supports code highlighting in responses', async () => {
    const user = userEvent.setup();
    render(<AIChatInterface />);

    const input = screen.getByPlaceholderText('Ask me anything about cross-chain development...');

    await user.type(input, 'Show me Rust code');
    await user.click(screen.getByTitle('Send message (Enter)'));

    await waitFor(() => {
      // Should contain code blocks
      expect(document.querySelector('pre')).toBeInTheDocument();
    });
  });
});