import React from 'react';
import { Type, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';
import { EditableElement } from './EditableModule';

interface ElementEditorProps {
  element: EditableElement | null;
  onUpdate: (elementId: string, updates: Partial<EditableElement>) => void;
}

const ElementEditor: React.FC<ElementEditorProps> = ({ element, onUpdate }) => {
  if (!element) {
    return (
      <div className="p-4 text-center text-gray-500">
        <Type className="w-12 h-12 mx-auto mb-2 opacity-50" />
        <p>Select an element to edit its properties</p>
      </div>
    );
  }

  const handleStyleChange = (property: string, value: any) => {
    onUpdate(element.id, {
      styles: {
        ...element.styles,
        [property]: value
      }
    });
  };

  const handleContentChange = (content: string) => {
    onUpdate(element.id, { content });
  };

  const renderTextEditor = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Text Content</label>
        <textarea
          value={element.content}
          onChange={(e) => handleContentChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={4}
          placeholder="Enter your text here..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Font Size</label>
        <select
          value={element.styles.fontSize || '16px'}
          onChange={(e) => handleStyleChange('fontSize', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="12px">12px</option>
          <option value="14px">14px</option>
          <option value="16px">16px</option>
          <option value="18px">18px</option>
          <option value="20px">20px</option>
          <option value="24px">24px</option>
          <option value="28px">28px</option>
          <option value="32px">32px</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Font Weight</label>
        <select
          value={element.styles.fontWeight || 'normal'}
          onChange={(e) => handleStyleChange('fontWeight', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="normal">Normal</option>
          <option value="bold">Bold</option>
          <option value="lighter">Light</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Text Color</label>
        <input
          type="color"
          value={element.styles.color || '#000000'}
          onChange={(e) => handleStyleChange('color', e.target.value)}
          className="w-full h-10 border border-gray-300 rounded-md cursor-pointer"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Text Align</label>
        <div className="flex gap-2">
          <button
            onClick={() => handleStyleChange('textAlign', 'left')}
            className={`p-2 border rounded ${element.styles.textAlign === 'left' ? 'bg-blue-100 border-blue-500' : 'border-gray-300'}`}
          >
            <AlignLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleStyleChange('textAlign', 'center')}
            className={`p-2 border rounded ${element.styles.textAlign === 'center' ? 'bg-blue-100 border-blue-500' : 'border-gray-300'}`}
          >
            <AlignCenter className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleStyleChange('textAlign', 'right')}
            className={`p-2 border rounded ${element.styles.textAlign === 'right' ? 'bg-blue-100 border-blue-500' : 'border-gray-300'}`}
          >
            <AlignRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  const renderImageEditor = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Image URL</label>
        <input
          type="url"
          value={element.content}
          onChange={(e) => handleContentChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="https://example.com/image.jpg"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Width</label>
        <input
          type="text"
          value={element.styles.width || '100%'}
          onChange={(e) => handleStyleChange('width', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="100px or 100%"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Height</label>
        <input
          type="text"
          value={element.styles.height || 'auto'}
          onChange={(e) => handleStyleChange('height', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="auto or 200px"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Border Radius</label>
        <input
          type="text"
          value={element.styles.borderRadius || '0px'}
          onChange={(e) => handleStyleChange('borderRadius', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="0px or 8px"
        />
      </div>
    </div>
  );

  const renderButtonEditor = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Button Text</label>
        <input
          type="text"
          value={element.content}
          onChange={(e) => handleContentChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Click me!"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Background Color</label>
        <input
          type="color"
          value={element.styles.backgroundColor || '#007bff'}
          onChange={(e) => handleStyleChange('backgroundColor', e.target.value)}
          className="w-full h-10 border border-gray-300 rounded-md cursor-pointer"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Text Color</label>
        <input
          type="color"
          value={element.styles.color || '#ffffff'}
          onChange={(e) => handleStyleChange('color', e.target.value)}
          className="w-full h-10 border border-gray-300 rounded-md cursor-pointer"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Padding</label>
        <input
          type="text"
          value={element.styles.padding || '8px 16px'}
          onChange={(e) => handleStyleChange('padding', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="8px 16px"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Border Radius</label>
        <input
          type="text"
          value={element.styles.borderRadius || '4px'}
          onChange={(e) => handleStyleChange('borderRadius', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="4px"
        />
      </div>
    </div>
  );

  const renderDividerEditor = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Border Style</label>
        <select
          value={element.styles.borderTopStyle || 'solid'}
          onChange={(e) => handleStyleChange('borderTopStyle', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="solid">Solid</option>
          <option value="dashed">Dashed</option>
          <option value="dotted">Dotted</option>
          <option value="double">Double</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Border Width</label>
        <input
          type="text"
          value={element.styles.borderTopWidth || '1px'}
          onChange={(e) => handleStyleChange('borderTopWidth', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="1px"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Border Color</label>
        <input
          type="color"
          value={element.styles.borderTopColor || '#e5e7eb'}
          onChange={(e) => handleStyleChange('borderTopColor', e.target.value)}
          className="w-full h-10 border border-gray-300 rounded-md cursor-pointer"
        />
      </div>
    </div>
  );

  const renderSpacerEditor = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Height</label>
        <input
          type="text"
          value={element.styles.height || '20px'}
          onChange={(e) => handleStyleChange('height', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="20px"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Background Color</label>
        <input
          type="color"
          value={element.styles.backgroundColor || '#f9fafb'}
          onChange={(e) => handleStyleChange('backgroundColor', e.target.value)}
          className="w-full h-10 border border-gray-300 rounded-md cursor-pointer"
        />
      </div>
    </div>
  );

  const getEditorContent = () => {
    switch (element.type) {
      case 'text':
        return renderTextEditor();
      case 'image':
        return renderImageEditor();
      case 'button':
        return renderButtonEditor();
      case 'divider':
        return renderDividerEditor();
      case 'spacer':
        return renderSpacerEditor();
      default:
        return <div>Unknown element type</div>;
    }
  };

  return (
    <div className="p-4">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">
          Edit {element.type.charAt(0).toUpperCase() + element.type.slice(1)}
        </h3>
        <p className="text-sm text-gray-600">Customize the appearance and content</p>
      </div>

      {getEditorContent()}
    </div>
  );
};

export default ElementEditor;