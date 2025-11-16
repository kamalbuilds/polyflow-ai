import React, { useRef, useEffect, useState } from 'react';
import Editor from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import {
  PlayIcon,
  DocumentArrowDownIcon,
  DocumentArrowUpIcon,
  CogIcon,
  FolderIcon,
  DocumentTextIcon,
  CodeBracketIcon,
} from '@heroicons/react/24/outline';

interface CodeFile {
  id: string;
  name: string;
  path: string;
  content: string;
  language: string;
  lastModified: Date;
}

interface CodeEditorProps {
  initialFile?: CodeFile;
  onFileChange?: (file: CodeFile) => void;
  onFileSave?: (file: CodeFile) => void;
  onCodeExecute?: (code: string, language: string) => Promise<string>;
  className?: string;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  initialFile,
  onFileChange,
  onFileSave,
  onCodeExecute,
  className = '',
}) => {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const [currentFile, setCurrentFile] = useState<CodeFile>(
    initialFile || {
      id: '1',
      name: 'my_pallet.rs',
      path: '/src/lib.rs',
      content: `#[frame_support::pallet]
pub mod pallet {
    use frame_support::pallet_prelude::*;
    use frame_system::pallet_prelude::*;

    #[pallet::pallet]
    pub struct Pallet<T>(_);

    #[pallet::config]
    pub trait Config: frame_system::Config {
        type RuntimeEvent: From<Event<Self>> + IsType<<Self as frame_system::Config>::RuntimeEvent>;
    }

    #[pallet::storage]
    #[pallet::getter(fn something)]
    pub type Something<T> = StorageValue<_, u32>;

    #[pallet::event]
    #[pallet::generate_deposit(pub(super) fn deposit_event)]
    pub enum Event<T: Config> {
        /// Event documentation should end with an array that provides descriptive names for event
        /// parameters. [something, who]
        SomethingStored { something: u32, who: T::AccountId },
    }

    #[pallet::error]
    pub enum Error<T> {
        /// Error names should be descriptive.
        NoneValue,
        /// Errors should have helpful documentation associated with them.
        StorageOverflow,
    }

    #[pallet::call]
    impl<T: Config> Pallet<T> {
        /// An example dispatchable that takes a singles value as a parameter, writes the value to
        /// storage and emits an event. This function must be dispatched by a signed extrinsic.
        #[pallet::call_index(0)]
        #[pallet::weight(10_000 + T::DbWeight::get().writes(1).ref_time())]
        pub fn do_something(origin: OriginFor<T>, something: u32) -> DispatchResult {
            // Check that the extrinsic was signed and get the signer.
            let who = ensure_signed(origin)?;

            // Update storage.
            <Something<T>>::put(&something);

            // Emit an event.
            Self::deposit_event(Event::SomethingStored { something, who });

            // Return a successful DispatchResultWithPostInfo
            Ok(())
        }

        /// An example dispatchable that may throw a custom error.
        #[pallet::call_index(1)]
        #[pallet::weight(10_000 + T::DbWeight::get().reads_writes(1,1).ref_time())]
        pub fn cause_error(origin: OriginFor<T>) -> DispatchResult {
            let _who = ensure_signed(origin)?;

            // Read a value from storage.
            match <Something<T>>::get() {
                // Return an error if the value has not been set.
                None => return Err(Error::<T>::NoneValue.into()),
                Some(old) => {
                    // Increment the value read from storage; will error in the event of overflow.
                    let new = old.checked_add(1).ok_or(Error::<T>::StorageOverflow)?;
                    // Update the value in storage with the incremented result.
                    <Something<T>>::put(&new);
                    Ok(())
                }
            }
        }
    }
}`,
      language: 'rust',
      lastModified: new Date(),
    }
  );

  const [files, setFiles] = useState<CodeFile[]>([currentFile]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState<string>('');
  const [theme, setTheme] = useState<'vs-dark' | 'light'>('vs-dark');
  const [fontSize, setFontSize] = useState(14);

  const handleEditorDidMount = (editor: monaco.editor.IStandaloneCodeEditor) => {
    editorRef.current = editor;

    // Configure Rust language features
    monaco.languages.registerCompletionItemProvider('rust', {
      provideCompletionItems: (model, position) => {
        const suggestions = [
          {
            label: 'pallet_template',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: [
              '#[frame_support::pallet]',
              'pub mod pallet {',
              '    use frame_support::pallet_prelude::*;',
              '    use frame_system::pallet_prelude::*;',
              '',
              '    #[pallet::pallet]',
              '    pub struct Pallet<T>(_);',
              '',
              '    #[pallet::config]',
              '    pub trait Config: frame_system::Config {',
              '        type RuntimeEvent: From<Event<Self>> + IsType<<Self as frame_system::Config>::RuntimeEvent>;',
              '    }',
              '',
              '    #[pallet::call]',
              '    impl<T: Config> Pallet<T> {',
              '        // Your dispatchable functions here',
              '    }',
              '}',
            ].join('\n'),
            range: {
              startLineNumber: position.lineNumber,
              endLineNumber: position.lineNumber,
              startColumn: position.column,
              endColumn: position.column,
            },
          },
          {
            label: 'storage_value',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: [
              '#[pallet::storage]',
              '#[pallet::getter(fn ${1:storage_name})]',
              'pub type ${2:StorageName}<T> = StorageValue<_, ${3:u32}>;',
            ].join('\n'),
            range: {
              startLineNumber: position.lineNumber,
              endLineNumber: position.lineNumber,
              startColumn: position.column,
              endColumn: position.column,
            },
          },
          {
            label: 'dispatchable',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: [
              '#[pallet::call_index(${1:0})]',
              '#[pallet::weight(${2:10_000})]',
              'pub fn ${3:function_name}(origin: OriginFor<T>) -> DispatchResult {',
              '    let _who = ensure_signed(origin)?;',
              '    ${4:// Your logic here}',
              '    Ok(())',
              '}',
            ].join('\n'),
            range: {
              startLineNumber: position.lineNumber,
              endLineNumber: position.lineNumber,
              startColumn: position.column,
              endColumn: position.column,
            },
          },
        ];

        return { suggestions };
      },
    });

    // Set up keyboard shortcuts
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      handleSaveFile();
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      handleExecuteCode();
    });
  };

  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      const updatedFile = {
        ...currentFile,
        content: value,
        lastModified: new Date(),
      };
      setCurrentFile(updatedFile);
      onFileChange?.(updatedFile);
    }
  };

  const handleSaveFile = () => {
    onFileSave?.(currentFile);
    // Update the file in files array
    setFiles(prev => prev.map(f => f.id === currentFile.id ? currentFile : f));
  };

  const handleExecuteCode = async () => {
    if (!onCodeExecute) return;

    setIsExecuting(true);
    setExecutionResult('');

    try {
      const result = await onCodeExecute(currentFile.content, currentFile.language);
      setExecutionResult(result);
    } catch (error) {
      setExecutionResult(`Error: ${error}`);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleNewFile = () => {
    const newFile: CodeFile = {
      id: Date.now().toString(),
      name: 'new_file.rs',
      path: `/src/new_file.rs`,
      content: '// New Substrate pallet\n\n',
      language: 'rust',
      lastModified: new Date(),
    };

    setFiles(prev => [...prev, newFile]);
    setCurrentFile(newFile);
  };

  const handleOpenFile = (file: CodeFile) => {
    setCurrentFile(file);
  };

  const getLanguageIcon = (language: string) => {
    switch (language) {
      case 'rust':
        return '🦀';
      case 'javascript':
      case 'typescript':
        return '📜';
      case 'solidity':
        return '💎';
      default:
        return '📄';
    }
  };

  const predefinedFiles = [
    {
      id: 'template-basic',
      name: 'basic_pallet.rs',
      path: '/templates/basic_pallet.rs',
      content: `// Basic Substrate Pallet Template
#[frame_support::pallet]
pub mod pallet {
    use frame_support::pallet_prelude::*;
    use frame_system::pallet_prelude::*;

    #[pallet::pallet]
    pub struct Pallet<T>(_);

    #[pallet::config]
    pub trait Config: frame_system::Config {
        type RuntimeEvent: From<Event<Self>> + IsType<<Self as frame_system::Config>::RuntimeEvent>;
    }

    #[pallet::call]
    impl<T: Config> Pallet<T> {
        // Add your dispatchable functions here
    }
}`,
      language: 'rust',
      lastModified: new Date(),
    },
    {
      id: 'template-xcm',
      name: 'xcm_message.rs',
      path: '/templates/xcm_message.rs',
      content: `// XCM Message Template
use xcm::v3::{Junction::Parachain, Junctions::X1, MultiLocation, WeightLimit};

let dest = MultiLocation {
    parents: 1,
    interior: X1(Parachain(2000)), // Target parachain
};

let assets = vec![MultiAsset {
    id: Concrete(MultiLocation::here()),
    fun: Fungible(1_000_000_000_000), // 1 DOT
}];

let message = xcm::v3::Xcm(vec![
    WithdrawAsset(assets.into()),
    InitiateReserveWithdraw {
        assets: Wild(AllCounted(1)),
        reserve: dest,
        xcm: Xcm(vec![
            BuyExecution {
                fees: MultiAsset::from((MultiLocation::here(), 100_000_000_000u128)),
                weight_limit: WeightLimit::Unlimited
            },
            DepositAsset {
                assets: Wild(AllCounted(1)),
                beneficiary: account
            }
        ])
    }
]);`,
      language: 'rust',
      lastModified: new Date(),
    },
  ];

  return (
    <div className={`flex flex-col h-full bg-white dark:bg-gray-900 ${className}`}>
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Code Editor
          </h3>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleNewFile}
              className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <DocumentTextIcon className="w-4 h-4" />
              <span>New</span>
            </button>
            <button
              onClick={handleSaveFile}
              className="flex items-center space-x-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <DocumentArrowUpIcon className="w-4 h-4" />
              <span>Save</span>
            </button>
            <button
              onClick={handleExecuteCode}
              disabled={isExecuting}
              className="flex items-center space-x-2 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
            >
              <PlayIcon className={`w-4 h-4 ${isExecuting ? 'animate-spin' : ''}`} />
              <span>{isExecuting ? 'Running...' : 'Run'}</span>
            </button>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <label className="text-sm text-gray-600 dark:text-gray-400">Theme:</label>
            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value as 'vs-dark' | 'light')}
              className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-800 dark:text-white"
            >
              <option value="vs-dark">Dark</option>
              <option value="light">Light</option>
            </select>
          </div>
          <div className="flex items-center space-x-2">
            <label className="text-sm text-gray-600 dark:text-gray-400">Font:</label>
            <select
              value={fontSize}
              onChange={(e) => setFontSize(Number(e.target.value))}
              className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-800 dark:text-white"
            >
              <option value={12}>12px</option>
              <option value={14}>14px</option>
              <option value={16}>16px</option>
              <option value={18}>18px</option>
            </select>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* File Explorer */}
        <div className="w-64 bg-gray-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
          <div className="p-4">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Files</h4>

            {/* Current Files */}
            <div className="space-y-1">
              {files.map((file) => (
                <button
                  key={file.id}
                  onClick={() => handleOpenFile(file)}
                  className={`w-full text-left p-2 rounded text-sm flex items-center space-x-2 ${
                    currentFile.id === file.id
                      ? 'bg-blue-100 text-blue-900 dark:bg-blue-900 dark:text-blue-100'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <span className="text-lg">{getLanguageIcon(file.language)}</span>
                  <span>{file.name}</span>
                </button>
              ))}
            </div>

            {/* Templates */}
            <h4 className="text-sm font-medium text-gray-900 dark:text-white mt-6 mb-3">Templates</h4>
            <div className="space-y-1">
              {predefinedFiles.map((file) => (
                <button
                  key={file.id}
                  onClick={() => {
                    const newFile = {
                      ...file,
                      id: Date.now().toString(),
                      name: `${file.name}`,
                    };
                    setFiles(prev => [...prev, newFile]);
                    setCurrentFile(newFile);
                  }}
                  className="w-full text-left p-2 rounded text-sm flex items-center space-x-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <span className="text-lg">{getLanguageIcon(file.language)}</span>
                  <span>{file.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Editor and Output */}
        <div className="flex-1 flex flex-col">
          {/* Current File Tab */}
          <div className="flex items-center px-4 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <span className="text-lg mr-2">{getLanguageIcon(currentFile.language)}</span>
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {currentFile.name}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
              {currentFile.path}
            </span>
          </div>

          {/* Monaco Editor */}
          <div className="flex-1">
            <Editor
              height="100%"
              language={currentFile.language}
              theme={theme}
              value={currentFile.content}
              onChange={handleEditorChange}
              onMount={handleEditorDidMount}
              options={{
                fontSize,
                minimap: { enabled: true },
                wordWrap: 'on',
                automaticLayout: true,
                scrollBeyondLastLine: false,
                smoothScrolling: true,
                cursorBlinking: 'blink',
                renderWhitespace: 'selection',
                bracketPairColorization: { enabled: true },
              }}
            />
          </div>

          {/* Output Panel */}
          {executionResult && (
            <div className="h-48 bg-gray-900 text-green-400 p-4 overflow-y-auto border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium">Output</h4>
                <button
                  onClick={() => setExecutionResult('')}
                  className="text-gray-400 hover:text-white"
                >
                  ×
                </button>
              </div>
              <pre className="text-xs font-mono">{executionResult}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CodeEditor;