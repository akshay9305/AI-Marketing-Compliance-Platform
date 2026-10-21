import React, { useState, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { Code, Eye, Upload, Download, Save, Shield, GitBranch } from 'lucide-react';

interface Template {
  id: number;
  name: string;
  category: string;
  description: string;
  html_content: string;
  schema: any;
  modules: any[];
}

const Playground = () => {
  const { id } = useParams<{ id: string }>();
  const [template, setTemplate] = useState<Template | null>(null);
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [viewMode, setViewMode] = useState<'code' | 'preview'>('code');
  const [isLoading, setIsLoading] = useState(false);
  const [isComplianceLoading, setIsComplianceLoading] = useState(false);
  const [complianceResults, setComplianceResults] = useState<any>(null);
  const [showComplianceModal, setShowComplianceModal] = useState(false);
  const [showAIResolveView, setShowAIResolveView] = useState(false);
  const [isRewriting, setIsRewriting] = useState(false);
  const [correctedHtml, setCorrectedHtml] = useState<string>('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (id) {
      loadTemplate();
    }
  }, [id]);

  const loadTemplate = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(`http://localhost:8000/api/templates/${id}`);
      const tpl = response.data;
      setTemplate(tpl);
      setHtmlContent(tpl.html_content || '');
    } catch (error) {
      console.error('Error loading template:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!template) return;

    try {
      setIsLoading(true);
      await axios.put(`http://localhost:8000/api/templates/${template.id}`, {
        ...template,
        html_content: htmlContent
      });
      alert('Template saved successfully!');
    } catch (error) {
      console.error('Error saving template:', error);
      alert('Error saving template');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setHtmlContent(content);
    };
    reader.readAsText(file);
  };

  const insertElement = (elementHtml: string) => {
    if (viewMode !== 'code' || !textareaRef.current) return;

    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newContent = htmlContent.substring(0, start) + elementHtml + htmlContent.substring(end);

    setHtmlContent(newContent);

    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + elementHtml.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const downloadHtml = () => {
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${template?.name || 'template'}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleComplianceCheck = async () => {
    if (!template) {
      alert('Please save the template first before checking compliance');
      return;
    }

    try {
      setIsComplianceLoading(true);
      const response = await axios.post(`http://localhost:8000/api/templates/${template.id}/validate`);
      setComplianceResults(response.data);
      setShowComplianceModal(true);
    } catch (error) {
      console.error('Error checking compliance:', error);
      alert('Error checking compliance');
    } finally {
      setIsComplianceLoading(false);
    }
  };

  const handleAIResolve = async () => {
    setShowAIResolveView(true);
    setIsRewriting(true);
    
    try {
      // Load the corrected HTML template from backend
      const response = await axios.get('http://localhost:8000/api/templates/sample/corrected');
      setTimeout(() => {
        setIsRewriting(false);
        setCorrectedHtml(response.data.html_content);
      }, 5000);
    } catch (error) {
      console.error('Error loading corrected template:', error);
      // Fallback to original with some mock highlighting
      const mockCorrectedHtml = htmlContent
        .replace(/Expedia logo/g, '<span style="background-color: yellow;">Expedia</span> Logo')
        .replace(/background-color: #EFF3F7/g, 'background-color: <span style="background-color: yellow;">#FFFFFF</span>');
      
      setTimeout(() => {
        setIsRewriting(false);
        setCorrectedHtml(mockCorrectedHtml);
      }, 5000);
    }
  };

  const handleForkForDevelopment = async () => {
    if (!template) {
      alert('Please save the template first before forking');
      return;
    }

    try {
      setIsLoading(true);
      // First save current changes
      await axios.put(`http://localhost:8000/api/templates/${template.id}`, {
        ...template,
        html_content: htmlContent
      });

      // Then fork the template
      const response = await axios.post(`http://localhost:8000/api/templates/${template.id}/fork_for_developer`);
      alert(`Template forked successfully! New template: ${response.data.name}`);
    } catch (error) {
      console.error('Error forking template:', error);
      alert('Error forking template');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <React.Fragment>
      <div className="flex h-screen bg-gray-50 relative">
        {(isLoading || isComplianceLoading) && (
          <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-50">
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="text-lg text-gray-700">Processing...</span>
            </div>
          </div>
        )}
        <div className="flex-1 flex flex-col">
          <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-semibold text-gray-900">
              {template?.name || 'HTML Editor'}
            </h1>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setViewMode('code')}
                className={`px-3 py-1 rounded-md text-sm font-medium ${
                  viewMode === 'code'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Code className="w-4 h-4 inline mr-1" />
                Code
              </button>
              <button
                onClick={() => setViewMode('preview')}
                className={`px-3 py-1 rounded-md text-sm font-medium ${
                  viewMode === 'preview'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Eye className="w-4 h-4 inline mr-1" />
                Preview
              </button>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <label className="cursor-pointer">
              <input
                type="file"
                accept=".html"
                onChange={handleFileUpload}
                className="hidden"
              />
              <div className="flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">
                <Upload className="w-4 h-4 mr-2" />
                Upload HTML
              </div>
            </label>

            <button
              onClick={downloadHtml}
              className="flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <Download className="w-4 h-4 mr-2" />
              Download
            </button>

            <button
              onClick={handleSave}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
            >
              <Save className="w-4 h-4 mr-2" />
              Save
            </button>

            <button
              onClick={handleComplianceCheck}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700"
            >
              <Shield className="w-4 h-4 mr-2" />
              AI Compliance
            </button>

            <button
              onClick={handleForkForDevelopment}
              className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-md text-sm font-medium hover:bg-purple-700"
            >
              <GitBranch className="w-4 h-4 mr-2" />
              Fork for Development
            </button>
        </div>
      </div>

        <div className="flex-1 overflow-hidden">
          {viewMode === 'code' ? (
            <textarea
              ref={textareaRef}
              value={htmlContent}
              onChange={(e) => setHtmlContent(e.target.value)}
              className="w-full h-full p-4 font-mono text-sm border-0 resize-none focus:outline-none focus:ring-0"
              placeholder="Paste your HTML code here..."
              spellCheck={false}
            />
          ) : (
            <div className="w-full h-full bg-white">
              <iframe
                srcDoc={htmlContent}
                className="w-full h-full border-0"
                title="HTML Preview"
                sandbox="allow-scripts allow-same-origin"
              />
            </div>
          )}
        </div>
        </div>

        <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Elements Library</h2>
          <p className="text-sm text-gray-600 mt-1">
            Click to insert HTML elements at cursor position
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-2">Basic Elements</h3>
            <div className="space-y-2">
              <button
                onClick={() => insertElement('<h1>Heading 1</h1>')}
                className="w-full text-left p-3 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
                disabled={viewMode !== 'code'}
              >
                <div className="font-medium text-gray-900">Heading 1</div>
                <div className="text-xs text-gray-500">&lt;h1&gt;Heading 1&lt;/h1&gt;</div>
              </button>

              <button
                onClick={() => insertElement('<h2>Heading 2</h2>')}
                className="w-full text-left p-3 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
                disabled={viewMode !== 'code'}
              >
                <div className="font-medium text-gray-900">Heading 2</div>
                <div className="text-xs text-gray-500">&lt;h2&gt;Heading 2&lt;/h2&gt;</div>
              </button>

              <button
                onClick={() => insertElement('<p>Paragraph text</p>')}
                className="w-full text-left p-3 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
                disabled={viewMode !== 'code'}
              >
                <div className="font-medium text-gray-900">Paragraph</div>
                <div className="text-xs text-gray-500">&lt;p&gt;Paragraph text&lt;/p&gt;</div>
              </button>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-2">Interactive Elements</h3>
            <div className="space-y-2">
              <button
                onClick={() => insertElement('<a href="#" class="text-blue-600 hover:text-blue-800">Link Text</a>')}
                className="w-full text-left p-3 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
                disabled={viewMode !== 'code'}
              >
                <div className="font-medium text-gray-900">Link</div>
                <div className="text-xs text-gray-500">Clickable link element</div>
              </button>

              <button
                onClick={() => insertElement('<button class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Button Text</button>')}
                className="w-full text-left p-3 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
                disabled={viewMode !== 'code'}
              >
                <div className="font-medium text-gray-900">Button</div>
                <div className="text-xs text-gray-500">Interactive button</div>
              </button>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-2">Media Elements</h3>
            <div className="space-y-2">
              <button
                onClick={() => insertElement('<img src="https://via.placeholder.com/300x200" alt="Image description" class="max-w-full h-auto">')}
                className="w-full text-left p-3 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
                disabled={viewMode !== 'code'}
              >
                <div className="font-medium text-gray-900">Image</div>
                <div className="text-xs text-gray-500">Responsive image element</div>
              </button>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-2">Layout Elements</h3>
            <div className="space-y-2">
              <button
                onClick={() => insertElement('<div class="bg-gray-100 p-4 rounded">\n  Content goes here\n</div>')}
                className="w-full text-left p-3 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
                disabled={viewMode !== 'code'}
              >
                <div className="font-medium text-gray-900">Container</div>
                <div className="text-xs text-gray-500">Styled container div</div>
              </button>

              <button
                onClick={() => insertElement('<table class="w-full border-collapse border border-gray-300">\n  <tr>\n    <td class="border border-gray-300 p-2">Cell 1</td>\n    <td class="border border-gray-300 p-2">Cell 2</td>\n  </tr>\n</table>')}
                className="w-full text-left p-3 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
                disabled={viewMode !== 'code'}
              >
                <div className="font-medium text-gray-900">Table</div>
                <div className="text-xs text-gray-500">Basic table structure</div>
              </button>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-2">Email Elements</h3>
            <div className="space-y-2">
              <button
                onClick={() => insertElement('%%=v(@first_name)=%%')}
                className="w-full text-left p-3 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
                disabled={viewMode !== 'code'}
              >
                <div className="font-medium text-gray-900">First Name</div>
                <div className="text-xs text-gray-500">AMPscript personalization</div>
              </button>

              <button
                onClick={() => insertElement('<a href="%%=RedirectTo(@cta_url)=%%" class="text-blue-600 hover:text-blue-800">Click Here</a>')}
                className="w-full text-left p-3 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
                disabled={viewMode !== 'code'}
              >
                <div className="font-medium text-gray-900">Tracked Link</div>
                <div className="text-xs text-gray-500">AMPscript redirect link</div>
              </button>
            </div>
          </div>
          </div>
        </div>
      </div>

      {/* Compliance Results Modal */}
      {showComplianceModal && complianceResults && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-7xl w-full mx-4 max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">
                  {showAIResolveView ? 'AI Compliance Resolution' : 'AI Compliance Check Results'}
                </h2>
                <button
                  onClick={() => {
                    setShowComplianceModal(false);
                    setShowAIResolveView(false);
                    setIsRewriting(false);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <span className="text-2xl">&times;</span>
                </button>
              </div>
              {!showAIResolveView && (
                <div className="mt-2">
                  <div className="text-sm text-gray-600">
                    Compliance Score: <span className={`font-semibold ${complianceResults.compliance_score >= 80 ? 'text-green-600' : complianceResults.compliance_score >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {complianceResults.compliance_score}/100
                    </span>
                  </div>
                </div>
              )}
            </div>

            {!showAIResolveView ? (
              <div className="p-6 overflow-y-auto max-h-[60vh]">
                {complianceResults.validation_results && complianceResults.validation_results.length > 0 ? (
                  <div className="space-y-4">
                    {complianceResults.validation_results.map((issue: any, index: number) => (
                      <div key={index} className={`p-4 rounded-lg border ${
                        issue.severity === 'high' ? 'border-red-200 bg-red-50' :
                        issue.severity === 'medium' ? 'border-yellow-200 bg-yellow-50' :
                        'border-blue-200 bg-blue-50'
                      }`}>
                        <div className="flex items-start">
                          <div className={`w-3 h-3 rounded-full mt-1 mr-3 ${
                            issue.severity === 'high' ? 'bg-red-500' :
                            issue.severity === 'medium' ? 'bg-yellow-500' :
                            'bg-blue-500'
                          }`}></div>
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">{issue.issue}</div>
                            <div className="text-sm text-gray-600 mt-1">
                              <strong>Type:</strong> {issue.type} | <strong>Location:</strong> {issue.location} | <strong>Severity:</strong> {issue.severity}
                            </div>
                            <div className="text-sm text-gray-700 mt-2">
                              <strong>Suggestion:</strong> {issue.suggestion}
                            </div>
                            {issue.context && (
                              <div className="text-xs text-gray-500 mt-2 p-2 bg-gray-100 rounded">
                                <strong>Context:</strong> {issue.context}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Shield className="w-12 h-12 text-green-500 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">All Clear!</h3>
                    <p className="text-gray-600">No compliance issues found in this template.</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex h-[60vh]">
                {/* Left Window - Original */}
                <div className="flex-1 border-r border-gray-200 flex flex-col">
                  <div className="p-4 border-b border-gray-200 bg-gray-50">
                    <div className="text-sm font-medium text-gray-700">Original Template</div>
                    <div className="text-sm text-gray-600 mt-1">
                      Compliance Score: <span className={`font-semibold ${complianceResults.compliance_score >= 80 ? 'text-green-600' : complianceResults.compliance_score >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {complianceResults.compliance_score}/100
                      </span>
                    </div>
                  </div>
                  <div className="flex-1 p-4 overflow-auto">
                    <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
                  </div>
                </div>

                {/* Right Window - Corrected */}
                <div className="flex-1 flex flex-col">
                  <div className="p-4 border-b border-gray-200 bg-gray-50">
                    <div className="text-sm font-medium text-gray-700">AI-Corrected Template</div>
                    {!isRewriting && (
                      <div className="text-sm text-gray-600 mt-1">
                        Compliance Score: <span className="font-semibold text-green-600">93/100</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 p-4 overflow-auto">
                    {isRewriting ? (
                      <div className="flex items-center justify-center h-full">
                        <div className="flex items-center space-x-2">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                          <span className="text-lg text-gray-700">Rewriting...</span>
                        </div>
                      </div>
                    ) : (
                      <div dangerouslySetInnerHTML={{ __html: correctedHtml || htmlContent }} />
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-between">
              <button
                onClick={() => {
                  if (showAIResolveView) {
                    setShowAIResolveView(false);
                    setIsRewriting(false);
                  } else {
                    setShowComplianceModal(false);
                  }
                }}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
              >
                {showAIResolveView ? 'Back to Results' : 'Close'}
              </button>
              {!showAIResolveView ? (
                <button
                  onClick={handleAIResolve}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  AI-Resolve
                </button>
              ) : (
                <button
                  onClick={() => {
                    setHtmlContent(correctedHtml);
                    setShowComplianceModal(false);
                    setShowAIResolveView(false);
                    setIsRewriting(false);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  disabled={isRewriting}
                >
                  Apply Changes
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </React.Fragment>
  );
};

export default Playground;