import { useState } from 'react';
import { Type, Image, Link, AlignLeft, ChevronRight, ChevronDown, Plus } from 'lucide-react';

interface ElementsLibraryProps {
  onElementInsert: (html: string, type: string) => void;
  isVisible: boolean;
}

const ElementsLibrary = ({ onElementInsert, isVisible }: ElementsLibraryProps) => {
  const [expandedSections, setExpandedSections] = useState<string[]>(['text']);

  const toggleSection = (section: string) => {
    setExpandedSections(prev =>
      prev.includes(section)
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  const elements = {
    text: {
      title: 'Text Elements',
      items: [
        {
          name: 'Heading',
          icon: Type,
          type: 'text',
          html: '<h2 style="color: #1f2937; margin: 0 0 15px 0; font-size: 22px; font-weight: bold;">Your Heading Here</h2>',
          description: 'Large heading text'
        },
        {
          name: 'Paragraph',
          icon: AlignLeft,
          type: 'text',
          html: '<p style="color: #6b7280; margin: 0 0 15px 0; font-size: 16px; line-height: 1.6;">Your paragraph text goes here.</p>',
          description: 'Regular paragraph text'
        }
      ]
    },
    content: {
      title: 'Content Elements',
      items: [
        {
          name: 'Image',
          icon: Image,
          type: 'image',
          html: '<img src="[IMAGE_URL]" alt="Description" style="max-width: 100%; height: auto;">',
          description: 'Responsive image'
        },
        {
          name: 'Button',
          icon: Link,
          type: 'button',
          html: '<a href="#" style="background-color: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">Click Here</a>',
          description: 'Call-to-action button'
        }
      ]
    }
  };

  if (!isVisible) return null;

  return (
    <div className="space-y-4">
      {Object.entries(elements).map(([sectionKey, section]) => (
        <div key={sectionKey} className="border border-gray-200 rounded-lg">
          <button
            onClick={() => toggleSection(sectionKey)}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-50"
          >
            <div className="flex items-center">
              <Plus size={20} className="mr-2 text-blue-600" />
              <span className="font-medium text-gray-900">{section.title}</span>
            </div>
            {expandedSections.includes(sectionKey) ? (
              <ChevronDown size={16} className="text-gray-400" />
            ) : (
              <ChevronRight size={16} className="text-gray-400" />
            )}
          </button>

          {expandedSections.includes(sectionKey) && (
            <div className="px-4 pb-4 space-y-2">
              {section.items.map((item, index) => {
                const Icon = item.icon;
                return (
                  <div
                    key={index}
                    onClick={() => onElementInsert(item.html, item.type)}
                    className="flex items-start space-x-3 p-2 hover:bg-blue-50 rounded-lg cursor-pointer transition-colors group"
                  >
                    <div className="w-8 h-8 bg-gray-100 group-hover:bg-blue-100 rounded-lg flex items-center justify-center">
                      <Icon size={14} className="text-gray-600 group-hover:text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm text-gray-900">{item.name}</p>
                      <p className="text-xs text-gray-500">{item.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default ElementsLibrary;