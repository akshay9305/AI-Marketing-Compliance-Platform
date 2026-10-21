import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ContentValidationTab from '../../components/ContentValidationTab';
import CTAVerificationTab from '../../components/CTAVerificationTab';
import GenerateReportTab from '../../components/GenerateReportTab';
import LocaleComparisonTab from '../../components/LocaleComparisonTab';

interface SavedTemplate {
  id: number;
  name: string;
  html_content: string;
  modules: any[];
}

const Validation: React.FC = () => {
  const [templates, setTemplates] = useState<SavedTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<SavedTemplate | null>(null);
  const [activeTab, setActiveTab] = useState('content');

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const res = await axios.get('http://localhost:8000/api/templates');
      setTemplates(res.data);
    } catch (error) {
      console.error('Failed to fetch templates', error);
    }
  };

  const fetchFullTemplate = async (id: number) => {
    try {
      const res = await axios.get(`http://localhost:8000/api/templates/${id}`);
      setSelectedTemplate(res.data);
    } catch (error) {
      console.error('Failed to fetch full template', error);
    }
  };

  // Mock data for the validation components
  const emails = selectedTemplate ? [{ locale: selectedTemplate.name, subject: selectedTemplate.name, status: 'ready' }] : [];
  const emailCache = selectedTemplate ? { [selectedTemplate.name]: { subject: selectedTemplate.name, content: selectedTemplate.html_content } } : {};
  const [validatingLocale, setValidatingLocale] = useState<string | null>(null);
  const [selectedValidationLocale, _setSelectedValidationLocale] = useState<string | null>(null);
  const [contentValidationResults, setContentValidationResults] = useState<Record<string, any>>({});
  const [contentIssueFilter, setContentIssueFilter] = useState({
    severity: [] as string[],
    type: [] as string[],
    sortBy: 'none' as 'severity' | 'type' | 'none',
    sortOrder: 'asc' as 'asc' | 'desc'
  });

  const [_authState, _setAuthState] = useState({
    isAuthenticated: false,
    isCapturing: false,
    status: 'Not authenticated',
    authData: null
  });
  const [_authSectionExpanded, _setAuthSectionExpanded] = useState(false);
  const [_isStreamingCta, _setIsStreamingCta] = useState(false);
  const [_validatingCtaLocale, _setValidatingCtaLocale] = useState<string | null>(null);
  const [_selectedCtaLocale, _setSelectedCtaLocale] = useState<string | null>(null);
  const [_ctaValidationResults, _setCtaValidationResults] = useState<Record<string, any>>({});

  // Mock for Report
  const [_ctaValidationResultsForReport, _setCtaValidationResultsForReport] = useState<Record<string, any>>({});
  const [_localeComparisonResults, _setLocaleComparisonResults] = useState<any>(null);

  // Mock for Locale
  const [_selectedBaseLocale, _setSelectedBaseLocale] = useState<string | null>(null);
  const [_selectedTargetLocale, _setSelectedTargetLocale] = useState<string | null>(null);
  const [_comparisonIssueFilter, _setComparisonIssueFilter] = useState({
    severity: [] as string[],
    type: [] as string[],
    sortBy: 'none' as 'severity' | 'type' | 'none',
    sortOrder: 'asc' as 'asc' | 'desc'
  });

  const validateEmailContent = async (locale: string) => {
    if (!selectedTemplate?.html_content) return;
    setValidatingLocale(locale);
    try {
      const res = await axios.post('http://localhost:8000/api/content-validation/validate', { html_content: selectedTemplate.html_content, use_llm: true });
      setContentValidationResults({ [locale]: res.data });
      _setSelectedValidationLocale(locale);
    } catch (error) {
      console.error('Validation failed', error);
    } finally {
      setValidatingLocale(null);
    }
  };

  const downloadValidationReport = (_locale: string) => {
    // Mock download
    alert('Report downloaded');
  };

  const validateCtaForLocale = async (locale: string) => {
    if (!selectedTemplate?.html_content) return;
    _setValidatingCtaLocale(locale);
    try {
      const res = await axios.post('http://localhost:8000/api/cta-validation/validate', { html_content: selectedTemplate.html_content, limit: 30 });
      _setCtaValidationResults({ [locale]: res.data });
      _setSelectedCtaLocale(locale);
    } catch (error) {
      console.error('CTA Validation failed', error);
    } finally {
      _setValidatingCtaLocale(null);
    }
  };

  const downloadCtaValidationReport = (_locale: string) => {
    // Mock download
    alert('CTA Report downloaded');
  };

  const tabs = [
    { id: 'content', label: 'Content Validation', component: ContentValidationTab },
    { id: 'cta', label: 'CTA Verification', component: CTAVerificationTab },
    { id: 'report', label: 'Generate Report', component: GenerateReportTab },
    { id: 'locale', label: 'Locale Comparison', component: LocaleComparisonTab }
  ];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Template Validation</h1>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Select Saved Template</label>
        <select
          value={selectedTemplate?.id || ''}
          onChange={(e) => {
            const id = parseInt(e.target.value);
            fetchFullTemplate(id);
          }}
          className="block w-full px-3 py-2 border border-gray-300 rounded-md"
        >
          <option value="">Choose a template...</option>
          {templates.map(template => (
            <option key={template.id} value={template.id}>
              {template.name}
            </option>
          ))}
        </select>
      </div>
      {selectedTemplate && (
        <div>
          <div className="mb-4">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                {tabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === tab.id
                        ? 'border-indigo-500 text-indigo-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>
          </div>
          <div>
            {activeTab === 'content' && (
              <ContentValidationTab
                emails={emails}
                emailCache={emailCache}
                validatingLocale={validatingLocale}
                selectedValidationLocale={selectedValidationLocale}
                contentValidationResults={contentValidationResults}
                contentIssueFilter={contentIssueFilter}
                setContentIssueFilter={setContentIssueFilter}
                validateEmailContent={validateEmailContent}
                downloadValidationReport={downloadValidationReport}
              />
            )}
            {activeTab === 'cta' && (
              <CTAVerificationTab
                emails={emails}
                emailCache={emailCache}
                authState={_authState}
                authSectionExpanded={_authSectionExpanded}
                setAuthSectionExpanded={_setAuthSectionExpanded}
                captureAuthenticationData={() => {}}
                captureStorageData={() => {}}
                uploadAuthenticationData={() => {}}
                importAuthData={() => {}}
                isStreamingCta={_isStreamingCta}
                validatingCtaLocale={_validatingCtaLocale}
                selectedCtaLocale={_selectedCtaLocale}
                ctaValidationResults={_ctaValidationResults}
                setSelectedCtaLocale={_setSelectedCtaLocale}
                validateCtaForLocale={validateCtaForLocale}
                downloadCtaValidationReport={downloadCtaValidationReport}
              />
            )}
            {activeTab === 'report' && (
              <GenerateReportTab
                emails={emails}
                contentValidationResults={contentValidationResults}
                ctaValidationResults={_ctaValidationResultsForReport}
                localeComparisonResults={_localeComparisonResults}
                reportGenerated={false}
                onGenerateReport={() => {}}
                onDownloadContentReport={() => {}}
                onDownloadCtaReport={() => {}}
                onDownloadLocaleComparisonReport={() => {}}
              />
            )}
            {activeTab === 'locale' && (
              <LocaleComparisonTab
                emails={emails.map(e => ({ locale: e.locale }))}
                selectedBaseLocale={_selectedBaseLocale}
                setSelectedBaseLocale={_setSelectedBaseLocale}
                selectedTargetLocale={_selectedTargetLocale}
                setSelectedTargetLocale={_setSelectedTargetLocale}
                compareLocales={() => {}}
                isComparingLocales={false}
                localeComparisonResults={_localeComparisonResults}
                downloadComparisonReport={() => {}}
                comparisonIssueFilter={_comparisonIssueFilter}
                setComparisonIssueFilter={_setComparisonIssueFilter}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Validation;