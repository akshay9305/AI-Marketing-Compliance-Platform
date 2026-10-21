import React, { useState } from 'react';
import { Upload, FileText, Download, Eye, CheckCircle, Loader, Plus, Edit3 } from 'lucide-react';
import axios from 'axios';

interface AnalyzedModule {
  id: string;
  name: string;
  type: string;
  editable: boolean;
  description: string;
  tag: string;
  selector?: string;
}

interface AnalysisResult {
  html_content: string;
  modules: AnalyzedModule[];
  analysis: {
    total_modules: number;
    structure_type: string;
    has_tables: boolean;
    has_divs: boolean;
    complexity: string;
  };
  suggested_template: {
    name: string;
    category: string;
    description: string;
    html_content: string;
    modules: AnalyzedModule[];
    compliance_score: number;
    schema: any;
  };
}

const TemplateUpload = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateCategory, setTemplateCategory] = useState('Email');
  const [templateDescription, setTemplateDescription] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleFileSelect = (file: File) => {
    const allowedExtensions = ['.html', '.htm', '.mjml'];
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    
    if (allowedExtensions.includes(fileExtension)) {
      setSelectedFile(file);
      if (!templateName) {
        setTemplateName(file.name.replace(/\.(html|htm|mjml)$/i, '').replace(/[_-]/g, ' '));
      }
      setAnalysisResult(null);
    } else {
      alert('Please select an HTML or MJML file (.html, .htm, or .mjml)');
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const analyzeTemplate = async () => {
    if (!selectedFile) return;

    setIsAnalyzing(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('name', templateName);
      formData.append('category', templateCategory);
      formData.append('description', templateDescription);

      const response = await axios.post('http://localhost:8000/api/template-analysis/upload-and-analyze', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setAnalysisResult(response.data);
    } catch (error) {
      console.error('Failed to analyze template:', error);
      alert('Failed to analyze template. Please check the file format and try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const saveAnalyzedTemplate = async () => {
    if (!analysisResult) return;

    setIsSaving(true);
    try {
      const response = await axios.post('http://localhost:8000/api/template-analysis/save-analyzed-template', 
        analysisResult.suggested_template
      );

      if (response.data.success) {
        alert(`Template saved successfully! Template ID: ${response.data.id}. You can now find it in the Templates section.`);
        
        // Reset the form after successful save
        setSelectedFile(null);
        setAnalysisResult(null);
        setTemplateName('');
        setTemplateDescription('');
        setShowPreview(false);
      }
    } catch (error: any) {
      console.error('Failed to save template:', error);
      alert(`Failed to save template: ${error.response?.data?.detail || error.message}. Please try again.`);
    } finally {
      setIsSaving(false);
    }
  };

  const downloadProcessedTemplate = () => {
    if (!analysisResult) return;

    const blob = new Blob([analysisResult.html_content], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${templateName.replace(/\s+/g, '_')}_processed.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4">
            <h1 className="text-2xl font-bold text-white flex items-center">
              <Upload className="mr-3" size={28} />
              Template Upload & Auto-Analysis
            </h1>
            <p className="text-blue-100 mt-2">
              Upload HTML+AMPscript or MJML+Handlebars templates and we'll automatically detect editable modules
            </p>
            <p className="text-blue-200 mt-1 text-sm">
              📷 Image upload feature coming soon
            </p>
          </div>

          <div className="p-6">
            {!analysisResult ? (
              <div className="space-y-6">
                {/* File Upload Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Upload Area */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Upload HTML or MJML Template
                    </label>
                    <div
                      className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                        dragActive
                          ? 'border-blue-400 bg-blue-50'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                      onDragEnter={handleDrag}
                      onDragLeave={handleDrag}
                      onDragOver={handleDrag}
                      onDrop={handleDrop}
                    >
                      {selectedFile ? (
                        <div className="space-y-2">
                          <FileText className="mx-auto h-12 w-12 text-green-500" />
                          <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
                          <p className="text-xs text-gray-500">
                            {(selectedFile.size / 1024).toFixed(1)} KB
                          </p>
                          <button
                            onClick={() => setSelectedFile(null)}
                            className="text-sm text-red-600 hover:text-red-800"
                          >
                            Remove file
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Upload className="mx-auto h-12 w-12 text-gray-400" />
                          <p className="text-sm text-gray-600">
                            <label htmlFor="file-upload" className="font-medium text-blue-600 hover:text-blue-500 cursor-pointer">
                              Click to upload
                            </label>
                            {' '}or drag and drop
                          </p>
                          <p className="text-xs text-gray-500">HTML or MJML files only (.html, .htm, .mjml)</p>
                          <input
                            id="file-upload"
                            type="file"
                            accept=".html,.htm,.mjml"
                            onChange={(e) => e.target.files && handleFileSelect(e.target.files[0])}
                            className="hidden"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Template Information */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Template Name
                      </label>
                      <input
                        type="text"
                        value={templateName}
                        onChange={(e) => setTemplateName(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter template name"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Category
                      </label>
                      <select
                        value={templateCategory}
                        onChange={(e) => setTemplateCategory(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="Email">Email</option>
                        <option value="Newsletter">Newsletter</option>
                        <option value="Promotion">Promotion</option>
                        <option value="Transactional">Transactional</option>
                        <option value="Landing Page">Landing Page</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description
                      </label>
                      <textarea
                        value={templateDescription}
                        onChange={(e) => setTemplateDescription(e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Describe this template..."
                      />
                    </div>

                    <button
                      onClick={analyzeTemplate}
                      disabled={!selectedFile || !templateName || isAnalyzing}
                      className="w-full btn-primary flex items-center justify-center space-x-2 disabled:opacity-50"
                    >
                      {isAnalyzing ? (
                        <>
                          <Loader className="animate-spin" size={16} />
                          <span>Analyzing Template...</span>
                        </>
                      ) : (
                        <>
                          <Eye size={16} />
                          <span>Analyze Template</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* Analysis Results */
              <div className="space-y-6">
                {/* Analysis Summary */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <CheckCircle className="text-green-500 mr-3" size={24} />
                    <div>
                      <h3 className="text-lg font-semibold text-green-800">Analysis Complete!</h3>
                      <p className="text-green-700">
                        Detected {analysisResult.modules.length} editable modules in your template
                      </p>
                    </div>
                  </div>
                </div>

                {/* Template Info & Actions */}
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{analysisResult.suggested_template.name}</h2>
                    <p className="text-gray-600">{analysisResult.suggested_template.description}</p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => setShowPreview(!showPreview)}
                      className="btn-secondary flex items-center space-x-2"
                    >
                      <Eye size={16} />
                      <span>{showPreview ? 'Hide' : 'Show'} Preview</span>
                    </button>
                    <button
                      onClick={downloadProcessedTemplate}
                      className="btn-secondary flex items-center space-x-2"
                    >
                      <Download size={16} />
                      <span>Download</span>
                    </button>
                    <button
                      onClick={saveAnalyzedTemplate}
                      disabled={isSaving}
                      className="btn-primary flex items-center space-x-2"
                    >
                      {isSaving ? (
                        <Loader className="animate-spin" size={16} />
                      ) : (
                        <Plus size={16} />
                      )}
                      <span>{isSaving ? 'Saving...' : 'Save Template'}</span>
                    </button>
                  </div>
                </div>

                {/* Analysis Details */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <h4 className="font-medium text-blue-900 mb-2">Structure Type</h4>
                    <p className="text-blue-700 capitalize">{analysisResult.analysis.structure_type}</p>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-4">
                    <h4 className="font-medium text-purple-900 mb-2">Complexity</h4>
                    <p className="text-purple-700 capitalize">{analysisResult.analysis.complexity}</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4">
                    <h4 className="font-medium text-green-900 mb-2">Detected Modules</h4>
                    <p className="text-green-700">{analysisResult.modules.length} modules</p>
                  </div>
                </div>

                {/* Detected Modules */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <Edit3 className="mr-2" size={20} />
                    Detected Editable Modules
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {analysisResult.modules.map((module, _index) => (
                      <div key={module.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-blue-600 uppercase tracking-wide">
                            {module.type}
                          </span>
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            module.editable 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {module.editable ? 'Editable' : 'Read-only'}
                          </span>
                        </div>
                        <h4 className="font-medium text-gray-900 mb-1">{module.name}</h4>
                        <p className="text-sm text-gray-600">{module.description}</p>
                        <div className="mt-2 text-xs text-gray-500">
                          Tag: <code className="bg-gray-100 px-1 rounded">{module.tag}</code>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Template Preview */}
                {showPreview && (
                  <div className="border border-gray-200 rounded-lg">
                    <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                      <h4 className="font-medium text-gray-900">Template Preview</h4>
                    </div>
                    <div className="p-4 max-h-96 overflow-auto">
                      <div 
                        className="border border-gray-300 rounded"
                        dangerouslySetInnerHTML={{ __html: analysisResult.html_content }}
                        style={{ maxWidth: '600px', margin: '0 auto', transform: 'scale(0.8)', transformOrigin: 'top center' }}
                      />
                    </div>
                  </div>
                )}

                {/* Reset Button */}
                <div className="pt-4 border-t border-gray-200">
                  <button
                    onClick={() => {
                      setSelectedFile(null);
                      setAnalysisResult(null);
                      setTemplateName('');
                      setTemplateDescription('');
                      setShowPreview(false);
                    }}
                    className="btn-secondary"
                  >
                    Upload Another Template
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TemplateUpload;