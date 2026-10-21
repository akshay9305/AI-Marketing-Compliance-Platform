import React, { useState } from 'react';
import { GripVertical, Trash2, Edit3, Image } from 'lucide-react';

export interface EditableElement {
  id: string;
  type: 'text' | 'image' | 'button' | 'divider' | 'spacer';
  content: string;
  styles: Record<string, any>;
  order: number;
}

export interface EditableModule {
  id: string;
  type: string;
  name: string;
  elements: EditableElement[];
}

interface EditableModuleProps {
  module: EditableModule;
  onUpdate: (moduleId: string, elements: EditableElement[]) => void;
  onElementSelect: (element: EditableElement | null) => void;
  selectedElementId: string | null;
}

const EditableModule: React.FC<EditableModuleProps> = ({
  module,
  onUpdate,
  onElementSelect,
  selectedElementId
}) => {
  const [draggedElement, setDraggedElement] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, elementId: string) => {
    setDraggedElement(elementId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (!draggedElement) return;

    const newElements = [...module.elements];
    const draggedIndex = newElements.findIndex(el => el.id === draggedElement);

    if (draggedIndex === -1) return;

    const [draggedItem] = newElements.splice(draggedIndex, 1);
    newElements.splice(dropIndex, 0, draggedItem);

    // Update order values
    newElements.forEach((el, index) => {
      el.order = index;
    });

    onUpdate(module.id, newElements);
    setDraggedElement(null);
    setDragOverIndex(null);
  };

  const handleElementClick = (element: EditableElement, e: React.MouseEvent) => {
    e.stopPropagation();
    onElementSelect(element);
  };

  const handleElementDelete = (elementId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newElements = module.elements.filter(el => el.id !== elementId);
    onUpdate(module.id, newElements);
    if (selectedElementId === elementId) {
      onElementSelect(null);
    }
  };

  const renderElement = (element: EditableElement) => {
    const isSelected = selectedElementId === element.id;

    const baseClasses = `relative border-2 transition-all duration-200 cursor-pointer ${
      isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
    }`;

    switch (element.type) {
      case 'text':
        return (
          <div
            key={element.id}
            className={`${baseClasses} p-4 min-h-[60px]`}
            onClick={(e) => handleElementClick(element, e)}
            draggable
            onDragStart={(e) => handleDragStart(e, element.id)}
          >
            <div className="flex items-start gap-2">
              <GripVertical className="w-4 h-4 text-gray-400 mt-1 flex-shrink-0" />
              <div className="flex-1">
                <div
                  className="prose prose-sm max-w-none"
                  style={element.styles}
                  dangerouslySetInnerHTML={{ __html: element.content || '<p>Click to edit text...</p>' }}
                />
              </div>
              <button
                onClick={(e) => handleElementDelete(element.id, e)}
                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded transition-opacity"
              >
                <Trash2 className="w-4 h-4 text-red-500" />
              </button>
            </div>
          </div>
        );

      case 'image':
        return (
          <div
            key={element.id}
            className={`${baseClasses} p-4`}
            onClick={(e) => handleElementClick(element, e)}
            draggable
            onDragStart={(e) => handleDragStart(e, element.id)}
          >
            <div className="flex items-center gap-2">
              <GripVertical className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <div className="flex-1">
                {element.content ? (
                  <img
                    src={element.content}
                    alt="Element"
                    className="max-w-full h-auto rounded"
                    style={element.styles}
                  />
                ) : (
                  <div className="w-full h-32 bg-gray-100 border-2 border-dashed border-gray-300 rounded flex items-center justify-center">
                    <Image className="w-8 h-8 text-gray-400" />
                  </div>
                )}
              </div>
              <button
                onClick={(e) => handleElementDelete(element.id, e)}
                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded transition-opacity"
              >
                <Trash2 className="w-4 h-4 text-red-500" />
              </button>
            </div>
          </div>
        );

      case 'button':
        return (
          <div
            key={element.id}
            className={`${baseClasses} p-4`}
            onClick={(e) => handleElementClick(element, e)}
            draggable
            onDragStart={(e) => handleDragStart(e, element.id)}
          >
            <div className="flex items-center gap-2">
              <GripVertical className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <div className="flex-1">
                <button
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                  style={element.styles}
                >
                  {element.content || 'Button Text'}
                </button>
              </div>
              <button
                onClick={(e) => handleElementDelete(element.id, e)}
                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded transition-opacity"
              >
                <Trash2 className="w-4 h-4 text-red-500" />
              </button>
            </div>
          </div>
        );

      case 'divider':
        return (
          <div
            key={element.id}
            className={`${baseClasses} p-2`}
            onClick={(e) => handleElementClick(element, e)}
            draggable
            onDragStart={(e) => handleDragStart(e, element.id)}
          >
            <div className="flex items-center gap-2">
              <GripVertical className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <div className="flex-1">
                <hr className="border-gray-300" style={element.styles} />
              </div>
              <button
                onClick={(e) => handleElementDelete(element.id, e)}
                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded transition-opacity"
              >
                <Trash2 className="w-4 h-4 text-red-500" />
              </button>
            </div>
          </div>
        );

      case 'spacer':
        return (
          <div
            key={element.id}
            className={`${baseClasses} p-2`}
            onClick={(e) => handleElementClick(element, e)}
            draggable
            onDragStart={(e) => handleDragStart(e, element.id)}
          >
            <div className="flex items-center gap-2">
              <GripVertical className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <div className="flex-1">
                <div
                  className="bg-gray-100 border border-gray-200 rounded"
                  style={{ height: element.styles.height || '20px', ...element.styles }}
                />
              </div>
              <button
                onClick={(e) => handleElementDelete(element.id, e)}
                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded transition-opacity"
              >
                <Trash2 className="w-4 h-4 text-red-500" />
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg mb-4">
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">{module.name}</h3>
        <p className="text-sm text-gray-600">Click elements to edit • Drag to reorder</p>
      </div>

      <div className="p-4 space-y-2">
        {module.elements.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Edit3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No elements yet. Add some from the library!</p>
          </div>
        ) : (
          module.elements
            .sort((a, b) => a.order - b.order)
            .map((element, index) => (
              <div
                key={element.id}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={(e) => handleDrop(e, index)}
                className={`group ${dragOverIndex === index ? 'border-t-2 border-blue-500' : ''}`}
              >
                {renderElement(element)}
              </div>
            ))
        )}
      </div>
    </div>
  );
};

export default EditableModule;