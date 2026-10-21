import React, { useState, useRef, useEffect } from 'react';
import { Save, X, Download } from 'lucide-react';

interface ModuleEditorProps {
  moduleId: string;
  moduleContent: string;
  onSave: (content: string) => void;
  onClose: () => void;
}

const ModuleEditor: React.FC<ModuleEditorProps> = ({ 
  moduleId, 
  moduleContent, 
  onSave, 
  onClose
}) => {
  const [content, setContent] = useState('');
  const [showElementsLibrary, setShowElementsLibrary] = useState(true);
  const contentEditableRef = useRef<HTMLDivElement>(null);

  // Parse initial content to display properly
  useEffect(() => {
    if (contentEditableRef.current && moduleContent) {
      // Extract content between tr tags
      const match = moduleContent.match(/<tr[^>]*>(.*?)<\/tr>/s);
      if (match) {
        const innerContent = match[1];
        setContent(innerContent);
        if (contentEditableRef.current.innerHTML !== innerContent) {
          contentEditableRef.current.innerHTML = innerContent;
        }
      } else {
        setContent(moduleContent);
        if (contentEditableRef.current.innerHTML !== moduleContent) {
          contentEditableRef.current.innerHTML = moduleContent;
        }
      }
    }
  }, [moduleContent]);

  const handleContentChange = () => {
    if (contentEditableRef.current) {
      const newContent = contentEditableRef.current.innerHTML;
      setContent(newContent);
    }
  };

  const insertElementAtCursor = (elementHtml: string) => {
    if (!contentEditableRef.current) return;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      // No selection, append at the end
      contentEditableRef.current.insertAdjacentHTML('beforeend', elementHtml);
    } else {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = elementHtml;
      
      while (tempDiv.firstChild) {
        range.insertNode(tempDiv.firstChild);
      }
      
      // Move cursor after inserted content
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    }
    
    handleContentChange();
  };

  const downloadAsHtml = () => {
    const wrappedContent = `<tr id="${moduleId}">${content}</tr>`;
    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Email Template</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
        table { width: 100%; max-width: 600px; margin: 0 auto; }
        td { padding: 15px; }
        img { max-width: 100%; height: auto; }
    </style>
</head>
<body>
    <table>
        ${wrappedContent}
    </table>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `email-template-${moduleId}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const elements = {
    text: [
      { name: 'Heading', html: '<h2 style="color: #1f2937; margin: 0 0 15px 0; font-size: 22px; font-weight: bold;">Your Heading Here</h2>' },
      { name: 'Paragraph', html: '<p style="color: #6b7280; margin: 0 0 15px 0; font-size: 16px; line-height: 1.6;">Your paragraph text goes here.</p>' },
      { name: 'Bold Text', html: '<strong style="color: #1f2937; font-weight: bold;">Bold text here</strong>' },
      { name: 'Link', html: '<a href="#" style="color: #3b82f6; text-decoration: underline;">Click here</a>' },
    ],
    content: [
      { name: 'Button', html: '<div style="text-align: center; margin: 25px 0;"><a href="#" style="background-color: #3b82f6; color: #ffffff; text-decoration: none; padding: 12px 25px; border-radius: 6px; font-weight: bold; display: inline-block;">Click Here</a></div>' },
      { name: 'Image', html: '<div style="text-align: center; margin: 20px 0;"><img src="https://via.placeholder.com/400x200" alt="Description" style="max-width: 100%; height: auto; border-radius: 8px;"></div>' },
      { name: 'Divider', html: '<hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">' },
    ],
    layout: [
      { name: 'Two Columns', html: '<div style="display: flex; gap: 20px;"><div style="flex: 1;"><p>Left column content</p></div><div style="flex: 1;"><p>Right column content</p></div></div>' },
      { name: 'Spacing', html: '<div style="height: 20px;"></div>' },
    ]
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-7xl h-[90vh] flex overflow-hidden">
        {/* Main Editor */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                Edit Module: {moduleId}
              </h3>
              <div className="flex items-center space-x-3">
                <button
                  onClick={downloadAsHtml}
                  className="btn-secondary flex items-center space-x-2"
                >
                  <Download size={16} />
                  <span>Download HTML</span>
                </button>
                <button
                  onClick={() => setShowElementsLibrary(!showElementsLibrary)}
                  className={`px-3 py-2 rounded-lg transition-colors ${
                    showElementsLibrary 
                      ? 'bg-blue-100 text-blue-600' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Elements {showElementsLibrary ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>
          </div>

          {/* Editor Content */}
          <div className="flex-1 p-6 overflow-auto">
            <div className="max-w-2xl mx-auto">
              <label className="block text-sm font-medium text-gray-700 mb-4">
                📝 Click anywhere to edit content. Use the Elements Library to add new components.
              </label>
              
              <div 
                ref={contentEditableRef}
                contentEditable
                onInput={handleContentChange}
                className="min-h-96 p-6 border-2 border-dashed border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                style={{
                  lineHeight: '1.6',
                  fontSize: '16px',
                  fontFamily: 'Arial, sans-serif'
                }}
                suppressContentEditableWarning={true}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-gray-200 flex justify-between">
            <div className="text-sm text-gray-500">
              💡 Tip: Click where you want to insert elements, then use the Elements Library
            </div>
            <div className="flex space-x-3">
              <button onClick={onClose} className="btn-secondary">
                <X size={16} className="mr-2" />
                Cancel
              </button>
              <button 
                onClick={() => {
                  // Wrap content back in tr tags before saving
                  const wrappedContent = `<tr id="${moduleId}">${content}</tr>`;
                  onSave(wrappedContent);
                }}
                className="btn-primary flex items-center space-x-2"
              >
                <Save size={16} />
                <span>Save Changes</span>
              </button>
            </div>
          </div>
        </div>

        {/* Elements Library */}
        {showElementsLibrary && (
          <div className="w-80 bg-gray-50 border-l border-gray-200 overflow-y-auto">
            <div className="p-4 border-b border-gray-200 bg-white">
              <h3 className="text-lg font-semibold text-gray-900">Elements Library</h3>
              <p className="text-sm text-gray-500 mt-1">Click to insert at cursor position</p>
            </div>

            <div className="p-4 space-y-6">
              {Object.entries(elements).map(([category, items]) => (
                <div key={category}>
                  <h4 className="font-medium text-gray-900 mb-3 capitalize">{category} Elements</h4>
                  <div className="space-y-2">
                    {items.map((item, index) => (
                      <button
                        key={index}
                        onClick={() => insertElementAtCursor(item.html)}
                        className="w-full text-left p-3 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
                      >
                        <div className="font-medium text-sm text-gray-900">{item.name}</div>
                        <div 
                          className="text-xs text-gray-500 mt-1 truncate"
                          dangerouslySetInnerHTML={{ __html: item.html }}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              {/* Quick Actions */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Quick Actions</h4>
                <div className="space-y-2">
                  <button
                    onClick={() => insertElementAtCursor('<br>')}
                    className="w-full text-left p-2 text-sm bg-white rounded border hover:bg-gray-50"
                  >
                    Line Break
                  </button>
                  <button
                    onClick={() => insertElementAtCursor('&nbsp;&nbsp;&nbsp;&nbsp;')}
                    className="w-full text-left p-2 text-sm bg-white rounded border hover:bg-gray-50"
                  >
                    Add Space
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ModuleEditor;