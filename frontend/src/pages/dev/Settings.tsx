import React, { useState, useRef, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
// @ts-ignore
import mjml2html from 'mjml-browser';
import axios from 'axios';

interface Element {
  id: string;
  type: 'text' | 'image' | 'button';
  content: string;
  mjmlId?: string;
  fontSize?: string;
  color?: string;
  backgroundColor?: string;
  href?: string;
}

interface ModuleSegment {
  id: string;
  name: string;
  content: string;
  startLine: number;
  endLine: number;
}

const DraggableElement: React.FC<{ element: Element; onSelect: () => void; isSelected: boolean }> = ({ element, onSelect, isSelected }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: element.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={`p-4 bg-white border border-gray-300 rounded mb-2 relative ${isSelected ? 'ring-2 ring-blue-500' : ''}`}
      onClick={onSelect}
    >
      <div {...listeners} className="absolute top-1 left-1 cursor-move text-gray-400">⋮⋮</div>
      {element.type === 'text' && <p dangerouslySetInnerHTML={{ __html: element.content }} style={{ fontSize: element.fontSize, color: element.color }}></p>}
      {element.type === 'image' && <img src={element.content} alt="Element" className="max-w-full h-auto" />}
      {element.type === 'button' && <button style={{ backgroundColor: element.backgroundColor }} className="px-4 py-2 text-white rounded">{element.content}</button>}
    </div>
  );
};

// Parse MJML to extract module segments
const parseModuleSegments = (mjml: string): ModuleSegment[] => {
  const segments: ModuleSegment[] = [];
  const lines = mjml.split('\n');
  let currentModule: any = null;

  lines.forEach((line, index) => {
    // More flexible regex to handle comments like "<!-- HEADER MODULE_START: Header -->"
    const startMatch = line.match(/<!--\s*(?:\w+\s+)?MODULE_START:\s*(.+?)\s*-->/);
    const endMatch = line.match(/<!--\s*(?:\w+\s+)?MODULE_END:\s*(.+?)\s*-->/);

    if (startMatch) {
      currentModule = {
        id: `module-${startMatch[1].toLowerCase().replace(/\s+/g, '-')}`,
        name: startMatch[1].trim(),
        startLine: index + 1, // Line numbers are 1-indexed for display
        lines: [],
      };
      console.log('Module START found:', currentModule.name, 'at line', currentModule.startLine);
    } else if (endMatch && currentModule) {
      currentModule.endLine = index + 1; // Line numbers are 1-indexed
      currentModule.content = currentModule.lines.join('\n');
      segments.push(currentModule);
      console.log('Module END found:', currentModule.name, 'at line', currentModule.endLine);
      currentModule = null;
    } else if (currentModule) {
      currentModule.lines.push(line);
    }
  });

  console.log('Total modules parsed:', segments.length);
  return segments;
};

const DevSettings: React.FC = () => {
  const [elements, setElements] = useState<Element[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [renderedHtml, setRenderedHtml] = useState<string>('');
  const [currentMjml, setCurrentMjml] = useState<string>('');
  const [templates, setTemplates] = useState<any>({});
  const [moduleSegments, setModuleSegments] = useState<ModuleSegment[]>([]);
  const [selectedModule, setSelectedModule] = useState<ModuleSegment | null>(null);
  const [payloadJson, setPayloadJson] = useState<string>('{}');
  const [compiledHtml, setCompiledHtml] = useState<string>('');
  const previewRef = useRef<HTMLDivElement>(null);
  const mjmlCodeRef = useRef<HTMLTextAreaElement>(null);

  // Undo/Redo history
  const [mjmlHistory, setMjmlHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  // AI Assistant chat state
  const [showAIAssistant, setShowAIAssistant] = useState<boolean>(false);
  const [aiMessages, setAiMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [aiInput, setAiInput] = useState<string>('');
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const aiMessagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch templates from API
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const response = await axios.get('http://localhost:8000/api/templates');
        const templatesData: any = {};
        response.data.forEach((tpl: any) => {
          templatesData[tpl.id] = {
            name: tpl.name,
            mjml: tpl.html_content || '', // Get MJML from html_content field
            elements: [],
          };
        });
        setTemplates(templatesData);
      } catch (error) {
        console.error('Failed to fetch templates:', error);
      }
    };
    fetchTemplates();
  }, []);

  const generateMjml = (elements: Element[]) => {
    return `
<mjml>
  <mj-head>
    <mj-title>Email Template</mj-title>
  </mj-head>
  <mj-body>
    <mj-section>
      <mj-column>
        ${elements.map(el => {
          if (el.type === 'text') {
            return `<mj-text id="${el.mjmlId}" font-size="${el.fontSize}" color="${el.color}">${el.content}</mj-text>`;
          } else if (el.type === 'button') {
            return `<mj-button id="${el.mjmlId}" background-color="${el.backgroundColor}" href="${el.href || '#'}">${el.content}</mj-button>`;
          } else if (el.type === 'image') {
            return `<mj-image id="${el.mjmlId}" src="${el.content}" alt="Image"></mj-image>`;
          }
          return '';
        }).join('\n        ')}
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>
    `.trim();
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (selectedTemplate && elements.length > 0) {
      const mjml = generateMjml(elements);
      setCurrentMjml(mjml);
      try {
        const result = (mjml2html as any)(mjml);
        setRenderedHtml(result.html);
      } catch (error) {
        console.error('MJML rendering error:', error);
        setRenderedHtml('<p>Error rendering MJML</p>');
      }
    } else {
      setCurrentMjml('');
      setRenderedHtml('');
    }
  }, [selectedTemplate, elements]);

  // Auto-scroll to highlighted module in MJML code editor
  useEffect(() => {
    if (!selectedModule || !mjmlCodeRef.current) return;

    const textarea = mjmlCodeRef.current;
    const lines = currentMjml.split('\n');
    
    // Calculate the character position at the start of the selected module
    let charPosition = 0;
    for (let i = 0; i < selectedModule.startLine - 1; i++) {
      charPosition += lines[i].length + 1; // +1 for newline
    }

    // Set cursor position to make the line visible
    textarea.setSelectionRange(charPosition, charPosition);
    
    // Force focus and scroll
    textarea.focus();
    
    // Use a more accurate calculation based on the actual line height
    // text-xs with line-height 1.5 = approximately 18px per line
    setTimeout(() => {
      const lineHeight = 18;
      const scrollOffset = Math.max(0, (selectedModule.startLine - 3) * lineHeight);
      textarea.scrollTop = scrollOffset;
    }, 50);
  }, [selectedModule, currentMjml]);

  const updateElement = (id: string, updates: Partial<Element>) => {
    setElements((prev) => prev.map((el) => (el.id === id ? { ...el, ...updates } : el)));
  };

  // Extract Handlebars variables from MJML content
  const extractHandlebarsVariables = (mjml: string): Record<string, string> => {
    const variableRegex = /{{\s*(\w+)\s*}}/g;
    const variables: Record<string, string> = {};
    let match;

    while ((match = variableRegex.exec(mjml)) !== null) {
      const varName = match[1];
      // Set default values based on variable name
      if (!variables[varName]) {
        if (varName.toLowerCase().includes('title')) {
          variables[varName] = 'Email Title';
        } else if (varName.toLowerCase().includes('body') || varName.toLowerCase().includes('content')) {
          variables[varName] = 'Your content goes here';
        } else if (varName.toLowerCase().includes('image') || varName.toLowerCase().includes('url')) {
          variables[varName] = 'https://via.placeholder.com/600x300?text=Image';
        } else if (varName.toLowerCase().includes('button') || varName.toLowerCase().includes('cta')) {
          variables[varName] = 'Click Here';
        } else if (varName.toLowerCase().includes('link')) {
          variables[varName] = 'https://example.com';
        } else if (varName.toLowerCase().includes('name') || varName.toLowerCase().includes('company')) {
          variables[varName] = 'Your Company';
        } else if (varName.toLowerCase().includes('year')) {
          variables[varName] = new Date().getFullYear().toString();
        } else if (varName.toLowerCase().includes('unsubscribe')) {
          variables[varName] = 'https://example.com/unsubscribe';
        } else {
          variables[varName] = `[${varName}]`;
        }
      }
    }

    return variables;
  };

  const handleTemplateChange = (templateKey: string) => {
    console.log('handleTemplateChange called with:', templateKey);
    setSelectedTemplate(templateKey);
    if (templateKey && templates[templateKey as keyof typeof templates]) {
      // Fetch the full template with MJML content
      const fetchFullTemplate = async () => {
        try {
          console.log('Fetching template from API:', templateKey);
          const response = await axios.get(`http://localhost:8000/api/templates/${templateKey}`);
          const template = response.data;
          console.log('Template response:', {
            name: template.name,
            hasHtmlContent: !!template.html_content,
            htmlContentLength: template.html_content ? template.html_content.length : 0,
          });
          
          // If template has MJML content, parse it and extract modules
          if (template.html_content) {
            console.log('About to setCurrentMjml with length:', template.html_content.length);
            setCurrentMjml(template.html_content);
            const segments = parseModuleSegments(template.html_content);
            console.log('Parsed segments:', segments);
            setModuleSegments(segments);
            
            // Extract Handlebars variables and populate payload
            const variables = extractHandlebarsVariables(template.html_content);
            setPayloadJson(JSON.stringify(variables, null, 2));
            console.log('Populated payload with variables:', variables);
            
            console.log('State should be updated now');
          } else {
            console.log('No html_content in template');
            setCurrentMjml('');
            setModuleSegments([]);
            setPayloadJson('{}');
          }
        } catch (error) {
          console.error('Failed to fetch template details:', error);
          setCurrentMjml('');
          setModuleSegments([]);
          setPayloadJson('{}');
        }
      };
      fetchFullTemplate();
    } else {
      console.log('Template not found or key empty');
      setCurrentMjml('');
      setModuleSegments([]);
      setPayloadJson('{}');
    }
  };

  // Function to render MJML with Handlebars substitution
  const compileTemplate = () => {
    if (!currentMjml) {
      alert('No MJML code loaded');
      return;
    }

    try {
      const payload = JSON.parse(payloadJson);
      let mjmlContent = currentMjml;

      // Replace Handlebars variables with payload values
      Object.keys(payload).forEach((key) => {
        const value = payload[key];
        const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
        mjmlContent = mjmlContent.replace(regex, value);
      });

      console.log('MJML after Handlebars substitution:', mjmlContent);

      // Compile MJML to HTML
      const result = (mjml2html as any)(mjmlContent);
      if (typeof result === 'string') {
        setCompiledHtml(result);
      } else if (result && typeof result.html === 'string') {
        setCompiledHtml(result.html);
      } else {
        console.error('Invalid MJML compilation result:', result);
        alert('Error compiling MJML');
      }
    } catch (error) {
      console.error('Template compilation error:', error);
      alert(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Handle MJML code changes with history tracking
  const handleMjmlChange = (newMjml: string) => {
    setCurrentMjml(newMjml);
    // Add to history
    const newHistory = mjmlHistory.slice(0, historyIndex + 1);
    newHistory.push(newMjml);
    setMjmlHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  // Handle Undo
  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setCurrentMjml(mjmlHistory[newIndex]);
      setHistoryIndex(newIndex);
    }
  };

  // Handle Save (mock - just shows a message)
  const handleSave = () => {
    alert('💾 Changes saved! (Mock save)');
    console.log('Current MJML:', currentMjml);
  };

  // Function to get highlighted lines
  const getHighlightedLines = () => {
    const lines = currentMjml.split('\n');
    return lines.map((line, lineIndex) => {
      const lineNum = lineIndex + 1;
      const isHighlighted = selectedModule && lineNum >= selectedModule.startLine && lineNum <= selectedModule.endLine;
      return {
        lineNum,
        line,
        isHighlighted,
      };
    });
  };
  const handleAIQuery = async () => {
    if (!aiInput.trim() || !selectedModule) {
      return;
    }

    // Add user message to chat
    const userMessage = aiInput.trim();
    setAiMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setAiInput('');
    setAiLoading(true);

    try {
      // Call the assistant-edit endpoint with module context
      const response = await axios.post(
        `http://localhost:8000/api/templates/${selectedTemplate}/assistant-edit`,
        {
          node_id: selectedModule.id,
          selected_html: selectedModule.content,
          prompt: userMessage,
        }
      );

      const modifiedHtml = response.data.modified_html || selectedModule.content;
      const assistantResponse = `✅ Module updated!\n\nModified MJML:\n\`\`\`\n${modifiedHtml}\n\`\`\``;
      setAiMessages(prev => [...prev, { role: 'assistant', content: assistantResponse }]);

      // Scroll to bottom of messages
      aiMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
      console.error('AI query error:', error);
      const errorMsg = error instanceof Error ? error.message : 'Failed to get AI response';
      setAiMessages(prev => [...prev, { role: 'assistant', content: `Error: ${errorMsg}` }]);
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold mb-2">Developer Templates</h1>
      <p className="text-gray-600 mb-6">Browse and edit MJML email templates with module-based visualization</p>
      
      {/* Template Selection */}
      <div className="mb-6 bg-white p-4 rounded-lg shadow">
        <label htmlFor="template-select" className="block text-sm font-medium text-gray-700 mb-2">
          Select a Template
        </label>
        <select
          id="template-select"
          value={selectedTemplate}
          onChange={(e) => handleTemplateChange(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Choose a template...</option>
          {Object.entries(templates).map(([key, template]: [string, any]) => (
            <option key={key} value={key}>
              {template.name}
            </option>
          ))}
        </select>
      </div>

      {/* Payload Input */}
      {selectedTemplate && (
        <div className="mb-6 bg-white p-4 rounded-lg shadow">
          <label htmlFor="payload-json" className="block text-sm font-medium text-gray-700 mb-2">
            JSON Payload (for Handlebars template variables)
          </label>
          <textarea
            id="payload-json"
            value={payloadJson}
            onChange={(e) => setPayloadJson(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 h-32"
            placeholder='{"emailTitle": "Hello World", "contentBody": "Your content here"}'
          />
          <button
            onClick={compileTemplate}
            className="mt-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors"
          >
            🔧 Compile & Render
          </button>
        </div>
      )}

      {selectedTemplate && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
          {/* Modules Canvas */}
          <div className="bg-white rounded-lg shadow p-6 lg:col-span-1 max-h-[600px] overflow-y-auto">
            <h2 className="text-lg font-semibold mb-4">📦 Modules</h2>
            <div className="space-y-3">
              {moduleSegments.length > 0 ? (
                moduleSegments.map((segment) => (
                  <div
                    key={segment.id}
                    onClick={() => setSelectedModule(segment)}
                    className={`p-4 rounded-lg cursor-pointer transition-all transform hover:scale-105 ${
                      selectedModule?.id === segment.id
                        ? 'bg-blue-100 border-2 border-blue-600 ring-2 ring-blue-300 shadow-md'
                        : 'bg-gray-50 border-2 border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-gray-800">
                        {segment.name}
                      </h3>
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        Lines {segment.startLine}-{segment.endLine}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 line-clamp-3 whitespace-pre-wrap font-mono">
                      {segment.content.trim().substring(0, 150)}...
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-8">No modules found in this template</p>
              )}
            </div>
          </div>

          {/* MJML Code Editor */}
          <div className="bg-white rounded-lg shadow p-6 lg:col-span-2 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">📝 MJML Code</h2>
              <div className="flex gap-2">
                <button
                  onClick={handleUndo}
                  disabled={historyIndex <= 0}
                  className="px-3 py-1 text-sm bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white rounded transition-colors disabled:cursor-not-allowed"
                  title="Undo last change"
                >
                  ↶ Undo
                </button>
                <button
                  onClick={handleSave}
                  className="px-3 py-1 text-sm bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
                  title="Save changes"
                >
                  💾 Save
                </button>
                <button
                  onClick={() => setShowAIAssistant(!showAIAssistant)}
                  className="px-3 py-1 text-sm bg-purple-600 hover:bg-purple-700 text-white rounded transition-colors"
                  disabled={!selectedModule}
                  title={selectedModule ? `Ask AI to modify "${selectedModule.name}"` : 'Select a module first'}
                >
                  🤖 AI Assistant
                </button>
              </div>
            </div>
            <div className="flex-1 rounded border border-gray-700 overflow-hidden" style={{ minHeight: '300px' }}>
              <textarea
                ref={mjmlCodeRef}
                value={currentMjml}
                onChange={(e) => handleMjmlChange(e.target.value)}
                className="w-full h-full bg-gray-900 text-gray-100 p-4 font-mono text-xs border-0 resize-none focus:outline-none focus:ring-0"
                style={{ 
                  lineHeight: '1.5',
                  fontFamily: 'monospace',
                }}
                placeholder="MJML code will appear here..."
              />
            </div>
          </div>

          {/* Compiled Email Preview */}
          <div className="bg-white rounded-lg shadow p-6 lg:col-span-1 flex flex-col">
            <h2 className="text-lg font-semibold mb-4">👁️ Email Preview</h2>
            <div
              ref={previewRef}
              className="bg-white border border-gray-300 rounded p-4 flex-1 overflow-auto"
              style={{ backgroundColor: '#f5f5f5', minHeight: '300px' }}
            >
              {compiledHtml ? (
                <iframe
                  srcDoc={compiledHtml}
                  className="w-full h-full border-0"
                  style={{ minHeight: '300px' }}
                  title="Email Preview"
                />
              ) : (
                <p className="text-gray-400 text-center py-20">
                  Compile a template to see preview
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* AI Assistant Modal */}
      {showAIAssistant && selectedModule && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col border-2 border-purple-300">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-6 flex items-center justify-between rounded-t-lg">
              <div>
                <h2 className="text-xl font-bold">🤖 AI Assistant</h2>
                <p className="text-sm text-purple-100">Editing: {selectedModule.name}</p>
              </div>
              <button
                onClick={() => setShowAIAssistant(false)}
                className="text-white hover:bg-purple-800 rounded p-2 transition-colors"
                title="Close"
              >
                ✕
              </button>
            </div>

            {/* Modal Body - Chat Area */}
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50 space-y-3">
              {aiMessages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-gray-500 text-center">
                  <p className="text-sm">
                    💬 Ask AI to help modify the "{selectedModule.name}" module.<br/>
                    Examples: "Make text larger", "Add emoji", "Improve wording"
                  </p>
                </div>
              ) : (
                <>
                  {aiMessages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`p-4 rounded-lg ${
                        msg.role === 'user'
                          ? 'bg-blue-100 text-blue-900 ml-8 border-l-4 border-blue-400'
                          : 'bg-purple-100 text-purple-900 mr-8 border-l-4 border-purple-400'
                      }`}
                    >
                      <div className="font-semibold text-sm mb-1">
                        {msg.role === 'user' ? '👤 You' : '🤖 AI Assistant'}
                      </div>
                      <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
                    </div>
                  ))}
                  <div ref={aiMessagesEndRef} />
                </>
              )}
            </div>

            {/* Modal Footer - Input Area */}
            <div className="bg-white border-t border-gray-200 p-6 rounded-b-lg space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={aiInput}
                  onChange={(e) => setAiInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && aiInput.trim() && handleAIQuery()}
                  placeholder={`Ask AI to modify "${selectedModule.name}"...`}
                  disabled={aiLoading}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100"
                  autoFocus
                />
                <button
                  onClick={handleAIQuery}
                  disabled={!aiInput.trim() || aiLoading}
                  className="px-6 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white font-medium rounded-md transition-colors disabled:cursor-not-allowed"
                >
                  {aiLoading ? '⏳ Thinking...' : '📤 Send'}
                </button>
              </div>
              <p className="text-xs text-gray-600">
                💡 Tip: Describe the changes you want, e.g., "Make it more casual", "Add emojis", "Increase font size"
              </p>
            </div>
          </div>
        </div>
      )}

      {!selectedTemplate && (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-500 text-lg">Select a template from the dropdown above to get started</p>
        </div>
      )}
    </div>
  );
};

export default DevSettings;
