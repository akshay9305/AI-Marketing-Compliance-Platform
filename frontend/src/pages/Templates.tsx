import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';
import axios from 'axios';

interface Template {
  id: number;
  name: string;
  category: string;
  description: string;
  compliance_score: number;
  created_at: string;
  html_content?: string;
  schema?: Record<string, any>;
  status?: string;
}

const Templates = () => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await axios.get('http://localhost:8000/api/templates');
      console.log('Raw API response:', response.data);
      console.log('Response data length:', response.data.length);
      const templatesData = response.data.map((tpl: any) => {
        let schemaObj = tpl.schema;
        if (schemaObj && typeof schemaObj === 'string') {
          try {
            schemaObj = JSON.parse(schemaObj);
          } catch (e) {
            schemaObj = null;
          }
        }
        return { ...tpl, schema: schemaObj };
      });
      console.log('Fetched templates:', templatesData.length);
      console.log('Email templates:', templatesData.filter((t: any) => (t.category || '').toLowerCase().includes('email')).length);
      setTemplates(templatesData);
    } catch (error) {
      console.error('Failed to fetch templates:', error);
    }
  };

  const fetchTemplate = async (templateId: number) => {
    try {
      const response = await axios.get(`http://localhost:8000/api/templates/${templateId}`);
      const tpl = response.data as Template;
      let schemaObj = tpl.schema as any;
      if (schemaObj && typeof schemaObj === 'string') {
        try {
          schemaObj = JSON.parse(schemaObj);
        } catch (e) {
          schemaObj = null;
        }
      }
      tpl.schema = schemaObj;
      setSelectedTemplate(tpl);
    } catch (error) {
      console.error('Failed to fetch template:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Email Templates</h1>
        <div />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Available Templates</h3>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {templates.filter(t => (t.category || '').toLowerCase().includes('email')).map((template) => (
                <div
                  key={template.id}
                  onClick={() => fetchTemplate(template.id)}
                  className={`p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                    selectedTemplate?.id === template.id
                      ? 'border-blue-500 bg-blue-50 shadow-md'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-semibold text-gray-900 text-sm">{template.name}</h4>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      template.compliance_score >= 90 ? 'bg-green-100 text-green-800' :
                      template.compliance_score >= 70 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {template.compliance_score}%
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mb-2">{template.category}</p>
                  <p className="text-xs text-gray-500 line-clamp-2">{template.description}</p>
                  {selectedTemplate?.id === template.id && (
                    <div className="mt-2 flex items-center text-blue-600">
                      <CheckCircle size={14} className="mr-1" />
                      <span className="text-xs font-medium">Selected</span>
                    </div>
                  )}
                </div>
              ))}
              {templates.filter(t => (t.category || '').toLowerCase().includes('email')).length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <p>No email templates available</p>
                  <p className="text-sm">Upload templates via the Upload Template page</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Template Schema</h3>
              {selectedTemplate && (
                <button
                  onClick={() => navigate(`/playground/${selectedTemplate.id}`)}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center space-x-2"
                >
                  <span>🛝</span>
                  <span>Playground</span>
                </button>
              )}
            </div>
            {selectedTemplate ? (
              <div>
                {selectedTemplate.schema ? (
                  <div className="space-y-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-medium text-gray-900 mb-2">Properties</h4>
                      <div className="space-y-2">
                        {Object.entries(selectedTemplate.schema.properties || {}).map(([key, value]: [string, any]) => (
                          <div key={key} className="flex justify-between items-center py-1 border-b border-gray-200 last:border-b-0">
                            <span className="font-medium text-gray-700">{key}</span>
                            <span className="text-sm text-gray-500">{value.type || 'string'}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    {selectedTemplate.schema.description && (
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <h4 className="font-medium text-blue-900 mb-2">Description</h4>
                        <p className="text-sm text-blue-800">{selectedTemplate.schema.description}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">No schema available for this template.</div>
                )}
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-gray-400">Select a template to view its schema</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Templates;
