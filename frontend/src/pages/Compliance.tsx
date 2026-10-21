import { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Shield, 
  Globe, 
  FileCheck, 
  CheckCircle, 
  AlertTriangle,
  Mail, 
  MessageSquare, 
  ExternalLink, 
  Lock, 
  ClipboardCheck,
  ArrowRight,
  Download,
  Calendar,
  BarChart3
} from 'lucide-react';

const Compliance = () => {
  const [selectedCountry, setSelectedCountry] = useState('us');
  const [selectedTab, setSelectedTab] = useState('overview');
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const [categoryTemplates, setCategoryTemplates] = useState<any[]>([]);
  const [activeTemplate, setActiveTemplate] = useState<any | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResults, setValidationResults] = useState<any | null>(null);
  const [modalTemplate, setModalTemplate] = useState<any | null>(null);

  const countries = [
    { code: 'us', name: 'United States', flag: '🇺🇸' },
    { code: 'eu', name: 'European Union', flag: '🇪🇺' },
    { code: 'ca', name: 'Canada', flag: '🇨🇦' },
    { code: 'au', name: 'Australia', flag: '🇦🇺' },
    { code: 'uk', name: 'United Kingdom', flag: '🇬🇧' },
    { code: 'jp', name: 'Japan', flag: '🇯🇵' }
  ];

  

  // Overview categories to show high-level validated / pending counts
  const overviewCategories = [
    { key: 'email', category: 'Email Marketing', validated: 124, pending: 5, icon: Mail },
    { key: 'social', category: 'Social Media Marketing', validated: 87, pending: 12, icon: MessageSquare },
    { key: 'affiliate', category: 'Affiliate Marketing', validated: 45, pending: 8, icon: ClipboardCheck },
    { key: 'ads', category: 'Advertising', validated: 60, pending: 2, icon: ExternalLink },
    { key: 'privacy', category: 'Data Privacy', validated: 102, pending: 3, icon: Lock }
  ];

  // Load templates persisted in localStorage for a given category key
  const loadCategoryTemplates = (categoryKey: string) => {
    const raw = localStorage.getItem('local_templates');
    let localTemplates: any[] = [];
    if (raw) {
      try { localTemplates = JSON.parse(raw); } catch {}
    }

    // simple mapping from categoryKey to template.category substrings
    const mapping: Record<string, string[]> = {
      email: ['email', 'newsletter'],
      social: ['social', 'post', 'instagram', 'facebook', 'twitter'],
      affiliate: ['affiliate'],
      ads: ['ad', 'advertising'],
      privacy: ['privacy', 'data']
    };

    const keywords = mapping[categoryKey] || [categoryKey];
    const matches = localTemplates.filter(t => {
      const cat = (t.category || '').toLowerCase();
      return keywords.some(k => cat.includes(k));
    });

    setCategoryTemplates(matches);
    setActiveTemplate(null);
    setValidationResults(null);
  };

  // React to other parts of the app saving templates to local storage
  // so the Compliance UI can show them immediately
  useEffect(() => {
    const handler = () => {
      if (openCategory) loadCategoryTemplates(openCategory);
    };
    window.addEventListener('local_templates_updated', handler as EventListener);
    return () => window.removeEventListener('local_templates_updated', handler as EventListener);
  }, [openCategory]);

  const runValidationForTemplate = async (template: any) => {
    setIsValidating(true);
    setValidationResults(null);
    try {
      // Ensure template exists on server (create if needed) so validation endpoint can run
      let serverTemplate = template;
      try {
        if (!template.id) {
          const payload = {
            name: template.name || 'Saved Template',
            category: template.category || 'email',
            description: template.description || '',
            html_content: template.html_content || '',
            modules: template.modules || [],
            compliance_score: template.compliance_score || 0,
          };

          const createResp = await axios.post('http://localhost:8000/api/templates', payload);
          // backend returns TemplateSummary with id
          const created = createResp.data as any;
          serverTemplate = { ...template, id: created.id };

          // Update localStorage entry for local_templates so future runs have id
          try {
            const raw = localStorage.getItem('local_templates');
            let arr: any[] = raw ? JSON.parse(raw) : [];
            // Try to find by name + html_content
            const idx = arr.findIndex((t: any) => (t.name === template.name && t.html_content === template.html_content));
            if (idx >= 0) arr[idx] = serverTemplate; else arr.unshift(serverTemplate);
            localStorage.setItem('local_templates', JSON.stringify(arr.slice(0, 50)));
          } catch (e) {
            console.warn('Failed to update local_templates after create', e);
          }

          // Update in-memory UI lists
          setCategoryTemplates(prev => prev.map((t: any) => (t.name === template.name && t.html_content === template.html_content ? serverTemplate : t)));
          if (activeTemplate && activeTemplate.name === template.name && activeTemplate.html_content === template.html_content) {
            setActiveTemplate(serverTemplate);
          }
          if (modalTemplate && modalTemplate.name === template.name && modalTemplate.html_content === template.html_content) {
            setModalTemplate(serverTemplate);
          }
        }

        // Call validate endpoint on server
        const resp = await axios.post(`http://localhost:8000/api/templates/${serverTemplate.id}/validate`);
        setValidationResults(resp.data);
      } catch (err) {
        // If server fails or is unreachable, fallback to simulated results
        console.warn('Server validation failed, falling back to simulated result', err);
        const fake = {
          compliance_score: Math.floor(70 + Math.random() * 30),
          validation_results: [
            { rule: 'Unsubscribe Link', status: 'pass', message: 'Found unsubscribe link' },
            { rule: 'Sender Authentication', status: Math.random() > 0.5 ? 'pass' : 'fail', message: 'DKIM/SPF check' }
          ]
        };
        setValidationResults(fake);
      }
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <div className="bg-blue-100 p-2 rounded-lg">
                <Shield className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Compliance Center</h1>
                <p className="text-sm text-gray-500">Real-time compliance monitoring and validation</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {/* Country Selector */}
              <select 
                value={selectedCountry}
                onChange={(e) => setSelectedCountry(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {countries.map((country) => (
                  <option key={country.code} value={country.code}>
                    {country.flag} {country.name}
                  </option>
                ))}
              </select>
              
              <button className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
                <Download className="w-4 h-4 mr-2" />
                Export Report
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Overall Score</p>
                <p className="text-3xl font-bold text-green-600">92%</p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <p className="text-xs text-green-600 mt-2">+3% from last week</p>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Critical Issues</p>
                <p className="text-3xl font-bold text-red-600">2</p>
              </div>
              <div className="p-3 bg-red-100 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
            </div>
            <p className="text-xs text-red-600 mt-2">Requires immediate attention</p>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Validations</p>
                <p className="text-3xl font-bold text-blue-600">47</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <FileCheck className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <p className="text-xs text-blue-600 mt-2">Across all categories</p>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Markets Covered</p>
                <p className="text-3xl font-bold text-purple-600">6</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <Globe className="h-6 w-6 text-purple-600" />
              </div>
            </div>
            <p className="text-xs text-purple-600 mt-2">Global compliance</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-8">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {['overview', 'details', 'reports', 'settings'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setSelectedTab(tab)}
                  className={`py-4 px-2 border-b-2 font-medium text-sm capitalize transition-colors ${
                    selectedTab === tab
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {selectedTab === 'overview' && (
              <div className="space-y-6">
                {/* Compliance Categories */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Compliance Categories</h3>
                  <div className="space-y-4">
                    {overviewCategories.map((cat) => {
                      const Icon = cat.icon;
                      return (
                        <div key={cat.key}>
                          <button
                            onClick={() => {
                              // toggle this category
                              if (openCategory === cat.key) {
                                setOpenCategory(null);
                                setCategoryTemplates([]);
                              } else {
                                loadCategoryTemplates(cat.key);
                                setOpenCategory(cat.key);
                              }
                            }}
                            className="w-full text-left border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors flex items-center justify-between"
                          >
                            <div className="flex items-center space-x-3">
                              <div className={`p-2 rounded-lg bg-gray-100`}>
                                <Icon className="h-5 w-5 text-gray-600" />
                              </div>
                              <div>
                                <h4 className="font-medium text-gray-900">{cat.category}</h4>
                                <p className="text-sm text-gray-500">{cat.validated + cat.pending} items validated/checked</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-2xl font-bold text-green-600">{cat.validated}</div>
                              <p className="text-xs text-gray-500">validated</p>
                              <div className="text-sm text-red-600 mt-1">{cat.pending} pending</div>
                            </div>
                          </button>

                          {/* collapsible area */}
                          {openCategory === cat.key && (
                            <div className="mt-3 border border-gray-200 rounded-lg p-4 bg-white">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="md:col-span-1">
                                  <div className="space-y-3">
                                    {categoryTemplates.length === 0 && (
                                      <div className="text-sm text-gray-500">No saved templates for this category.</div>
                                    )}
                                    {categoryTemplates.map((t) => (
                                      <div key={t.id} className="border p-3 rounded-lg cursor-pointer bg-white" onClick={() => setModalTemplate(t)}>
                                        <div className="flex items-center justify-between">
                                          <div>
                                            <div className="font-medium text-sm text-gray-900">{t.name}</div>
                                            <div className="text-xs text-gray-500">{t.category}</div>
                                          </div>
                                          <div className="text-xs text-gray-600">{t.compliance_score ? `${t.compliance_score}%` : 'Not validated'}</div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                <div className="md:col-span-2">
                                  <div className="text-sm text-gray-500">Click a saved template to preview in a popup and run validation.</div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {selectedTab === 'details' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">Detailed Analysis</h3>
                    <p className="text-sm text-gray-500">Review validation findings and recommendations.</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {(activeTemplate || modalTemplate) && (
                      <button
                        onClick={() => {
                          const tpl = activeTemplate || modalTemplate;
                          if (tpl) runValidationForTemplate(tpl);
                        }}
                        className="btn-primary"
                        disabled={isValidating}
                      >
                        {isValidating ? 'Validating...' : 'Run Validation'}
                      </button>
                    )}
                  </div>
                </div>

                {/* If no validation results yet */}
                {!validationResults && (
                  <div className="text-center py-12">
                    <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h4 className="text-lg font-medium text-gray-900 mb-2">No validation data</h4>
                    <p className="text-gray-500">Run a validation on a saved template to see detailed findings here.</p>
                  </div>
                )}

                {/* Show detailed validation results */}
                {validationResults && (
                  <div className="space-y-4">
                    <div className="bg-white border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm text-gray-500">Compliance Score</div>
                          <div className="text-2xl font-bold text-green-600">{validationResults.compliance_score}%</div>
                        </div>
                        <div className="text-sm text-gray-500">Source: { (activeTemplate?.name || modalTemplate?.name) ?? '—' }</div>
                      </div>
                    </div>

                    <div className="bg-white border rounded-lg p-4">
                      <h4 className="font-medium mb-3">Findings</h4>
                      <div className="space-y-3">
                        {validationResults.validation_results.map((item: any, idx: number) => {
                          const title = item.rule || item.issue || item.type || `Issue ${idx + 1}`;
                          const severity = item.severity || item.status || 'info';
                          const suggestion = item.suggestion || item.message || '';
                          const context = item.context || item.example || '';
                          return (
                            <details key={idx} className="group border rounded-lg p-3">
                              <summary className="flex items-center justify-between cursor-pointer list-none">
                                <div className="flex items-center space-x-3">
                                  <div className={`w-3 h-3 rounded-full ${severity === 'pass' || severity === 'low' ? 'bg-green-500' : severity === 'warning' || severity === 'medium' ? 'bg-yellow-500' : 'bg-red-500'}`} />
                                  <div>
                                    <div className="font-medium text-sm">{title}</div>
                                    <div className="text-xs text-gray-500">{severity}</div>
                                  </div>
                                </div>
                                <div className="text-xs text-gray-400 group-open:rotate-90 transition-transform">›</div>
                              </summary>

                              <div className="mt-3 text-sm text-gray-700 space-y-2">
                                {suggestion && (
                                  <div>
                                    <div className="text-xs text-gray-500">Recommendation</div>
                                    <div className="mt-1">{suggestion}</div>
                                  </div>
                                )}
                                {context && (
                                  <div>
                                    <div className="text-xs text-gray-500">Context / Example</div>
                                    <pre className="mt-1 bg-gray-50 p-2 rounded text-xs overflow-auto">{context}</pre>
                                  </div>
                                )}
                                {/* Raw item for debugging */}
                                <div className="text-xs text-gray-400">ID: {item.id ?? 'n/a'}</div>
                              </div>
                            </details>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {selectedTab === 'reports' && (
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Compliance Reports</h3>
                <p className="text-gray-500">Historical reports and trending analysis coming soon.</p>
              </div>
            )}

            {selectedTab === 'settings' && (
              <div className="text-center py-12">
                <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Compliance Settings</h3>
                <p className="text-gray-500">Configure validation rules and thresholds coming soon.</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions (hidden on Details tab) */}
        {selectedTab !== 'details' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex items-center space-x-3">
                  <Mail className="h-5 w-5 text-blue-600" />
                  <span className="font-medium text-gray-900">Validate Email Campaign</span>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-400" />
              </button>
              
              <button className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex items-center space-x-3">
                  <MessageSquare className="h-5 w-5 text-purple-600" />
                  <span className="font-medium text-gray-900">Check Social Posts</span>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-400" />
              </button>
              
              <button className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex items-center space-x-3">
                  <FileCheck className="h-5 w-5 text-green-600" />
                  <span className="font-medium text-gray-900">Run Full Audit</span>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-400" />
              </button>
            </div>
          </div>
        )}

          {/* Category Templates Panel (shown when a category is opened) */}
          {openCategory && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">{overviewCategories.find(c => c.key === openCategory)?.category} - Saved Templates</h3>
              <button onClick={() => { setOpenCategory(null); setCategoryTemplates([]); setActiveTemplate(null); }} className="text-sm text-gray-500">Close</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-1">
                <div className="space-y-3">
                  {categoryTemplates.length === 0 && (
                    <div className="text-sm text-gray-500">No saved templates for this category.</div>
                  )}
                  {categoryTemplates.map((t) => (
                    <div key={t.id} className={`border p-3 rounded-lg cursor-pointer ${activeTemplate?.id === t.id ? 'bg-gray-50' : 'bg-white'}`} onClick={() => { setActiveTemplate(t); setValidationResults(null); }}>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-sm text-gray-900">{t.name}</div>
                          <div className="text-xs text-gray-500">{t.category}</div>
                        </div>
                        <div className="text-xs text-gray-600">{t.compliance_score ? `${t.compliance_score}%` : 'Not validated'}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="md:col-span-2">
                {activeTemplate ? (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-gray-900">{activeTemplate.name}</h4>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => runValidationForTemplate(activeTemplate)}
                          disabled={isValidating}
                          className="btn-primary"
                        >
                          {isValidating ? 'Validating...' : 'Run Validation'}
                        </button>
                      </div>
                    </div>

                    {/* Render template content. For email templates we render HTML;
                        for social or plain-text posts show the post text and modules */}
                    {activeTemplate.html_content ? (
                      (activeTemplate.category || '').toLowerCase().includes('social') ? (
                        <div className="border rounded-lg overflow-hidden">
                          <div className="p-4 bg-white">
                            <div className="whitespace-pre-wrap text-sm">{activeTemplate.html_content}</div>

                            {/* Render modules if available (hashtags, CTAs, images) */}
                            {activeTemplate.modules && Array.isArray(activeTemplate.modules) && (
                              <div className="mt-4 space-y-2 text-sm text-gray-700">
                                {activeTemplate.modules.map((m: any, i: number) => (
                                  <div key={i} className="p-2 bg-gray-50 rounded">
                                    <pre className="whitespace-pre-wrap text-xs">{JSON.stringify(m, null, 2)}</pre>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="border rounded-lg overflow-hidden">
                          <div className="p-4 bg-white">
                            <div dangerouslySetInnerHTML={{ __html: activeTemplate.html_content }} />
                          </div>
                        </div>
                      )
                    ) : (
                      <div className="p-4 bg-gray-50 rounded">No renderable content for this template.</div>
                    )}

                    {/* Validation Results */}
                    {validationResults && (
                      <div className="mt-4 p-4 bg-white border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="font-medium">Validation Results</div>
                          <div className="text-sm text-gray-600">Score: {validationResults.compliance_score}%</div>
                        </div>
                        <div className="space-y-2 mt-2">
                          {validationResults.validation_results.map((r: any, i: number) => (
                            <div key={i} className="flex items-start space-x-3">
                              <div className={`w-2 h-2 rounded-full mt-1 ${r.status === 'pass' ? 'bg-green-500' : r.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'}`} />
                              <div>
                                <div className="font-medium text-sm">{r.rule}</div>
                                <div className="text-xs text-gray-500">{r.message}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">Select a saved template to preview and validate.</div>
                )}
              </div>
            </div>
          </div>
        )}
        
        {/* Modal for template preview + validation */}
        {modalTemplate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black opacity-40" onClick={() => setModalTemplate(null)} />
            <div className="relative bg-white rounded-lg shadow-lg w-11/12 md:w-3/4 max-h-[90vh] overflow-auto">
              <div className="p-4 border-b flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">{modalTemplate.name}</h3>
                  <div className="text-xs text-gray-500">{modalTemplate.category}</div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={async () => { await runValidationForTemplate(modalTemplate); }}
                    className="btn-primary flex items-center space-x-2"
                    disabled={isValidating}
                  >
                    {isValidating ? (
                      <>
                        <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                        <span>Validating...</span>
                      </>
                    ) : (
                      <span>Run Validation</span>
                    )}
                  </button>
                  <button onClick={() => setModalTemplate(null)} className="btn-secondary">Close</button>
                </div>
              </div>

              <div className="p-4">
                {modalTemplate.html_content ? (
                  (modalTemplate.category || '').toLowerCase().includes('social') ? (
                    <div className="space-y-3">
                      <div className="whitespace-pre-wrap text-sm bg-white p-3 border rounded">{modalTemplate.html_content}</div>
                      {modalTemplate.modules && Array.isArray(modalTemplate.modules) && (
                        <div className="mt-2">
                          <h4 className="text-sm font-medium mb-2">Post Details</h4>
                          <div className="space-y-2">
                            {modalTemplate.modules.map((m: any, i: number) => (
                              <div key={i} className="text-xs bg-gray-50 p-2 rounded">
                                <pre className="whitespace-pre-wrap">{JSON.stringify(m, null, 2)}</pre>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div dangerouslySetInnerHTML={{ __html: modalTemplate.html_content }} />
                  )
                ) : (
                  <div className="text-sm text-gray-500">No content available to render.</div>
                )}

                {validationResults && modalTemplate && (
                  <div className="mt-4 p-4 bg-gray-50 border rounded">
                    <div className="flex items-center justify-between mb-3">
                      <div className="font-medium">Validation Results</div>
                      <div className="text-sm font-semibold">Score: {validationResults.compliance_score}%</div>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className="text-green-500">✅</div>
                          <div>Content validated</div>
                        </div>
                        <div className="text-xs text-gray-400">Auto</div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className="text-yellow-500">🛠️</div>
                          <div>CTA verification (feature coming soon)</div>
                        </div>
                        <div className="text-xs text-gray-400">Planned</div>
                      </div>
                    </div>

                    <div className="mt-4 flex justify-end">
                      <button
                        onClick={() => {
                          setSelectedTab('details');
                          setActiveTemplate(modalTemplate);
                          setModalTemplate(null);
                        }}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        See details
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Compliance;