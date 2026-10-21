import React from 'react';

type Email = { locale: string };
type LocaleComparisonIssue = {
  type: string;
  severity: string;
  location: string;
  issue: string;
  suggestion: string;
};
type LocaleComparisonResponse = {
  overall_score: number;
  total_issues: number;
  high_severity: number;
  medium_severity: number;
  low_severity: number;
  summary: string;
  issues: LocaleComparisonIssue[];
  base_language: string;
  target_language: string;
};

interface IssueFilter {
  severity: string[];
  type: string[];
  sortBy: 'severity' | 'type' | 'none';
  sortOrder: 'asc' | 'desc';
}

interface Props {
  emails: Email[];
  selectedBaseLocale: string | null;
  setSelectedBaseLocale: (v: string | null) => void;
  selectedTargetLocale: string | null;
  setSelectedTargetLocale: (v: string | null) => void;
  compareLocales: () => void;
  isComparingLocales: boolean;
  localeComparisonResults: LocaleComparisonResponse | null;
  downloadComparisonReport: () => void;
  comparisonIssueFilter: IssueFilter;
  setComparisonIssueFilter: (f: IssueFilter) => void;
}

const LocaleComparisonTab: React.FC<Props> = ({
  emails,
  selectedBaseLocale,
  setSelectedBaseLocale,
  selectedTargetLocale,
  setSelectedTargetLocale,
  compareLocales,
  isComparingLocales,
  localeComparisonResults,
  downloadComparisonReport,
  comparisonIssueFilter,
  setComparisonIssueFilter,
}) => {
  const uniqueLocales = Array.from(new Set(emails.map(e => e.locale)));
  const severityRank = (s: string) => (s === 'high' ? 3 : s === 'medium' ? 2 : s === 'low' ? 1 : 0);
  const getUniqueIssueTypes = (issues: LocaleComparisonIssue[]) => Array.from(new Set(issues.map(i => i.type)));
  const filterAndSortComparisonIssues = (issues: LocaleComparisonIssue[]) => {
    let filtered = [...issues];
    if (comparisonIssueFilter.severity.length) {
      filtered = filtered.filter(i => comparisonIssueFilter.severity.includes(i.severity));
    }
    if (comparisonIssueFilter.type.length) {
      filtered = filtered.filter(i => comparisonIssueFilter.type.includes(i.type));
    }
    if (comparisonIssueFilter.sortBy !== 'none') {
      filtered.sort((a, b) => {
        let cmp = 0;
        if (comparisonIssueFilter.sortBy === 'severity') cmp = severityRank(b.severity) - severityRank(a.severity);
        else if (comparisonIssueFilter.sortBy === 'type') cmp = a.type.localeCompare(b.type);
        return comparisonIssueFilter.sortOrder === 'desc' ? cmp : -cmp;
      });
    }
    return filtered;
  };

  return (
    <div>
      <h2 style={{ fontSize: 24, fontWeight: 600, marginBottom: 32 }}>AI-Powered Locale Comparison</h2>
      {emails.length > 1 ? (
        <div>
          {/* selections */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 32 }}>
            <div>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 500, fontSize: 14 }}>Base Locale (Reference)</label>
              <select
                value={selectedBaseLocale || ''}
                onChange={e => setSelectedBaseLocale(e.target.value || null)}
                style={{ width: '100%', padding: 12, border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14, background: '#fff' }}
              >
                <option value="">Select base locale...</option>
                {uniqueLocales.map(l => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 500, fontSize: 14 }}>Target Locale (Comparison)</label>
              <select
                value={selectedTargetLocale || ''}
                onChange={e => setSelectedTargetLocale(e.target.value || null)}
                style={{ width: '100%', padding: 12, border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14, background: '#fff' }}
              >
                <option value="">Select target locale...</option>
                {uniqueLocales.filter(l => l !== selectedBaseLocale).map(l => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>
          </div>

          {/* actions */}
            <div style={{ marginBottom: 32 }}>
              <button
                onClick={compareLocales}
                disabled={!selectedBaseLocale || !selectedTargetLocale || isComparingLocales}
                style={{
                  padding: '12px 24px',
                  background: !selectedBaseLocale || !selectedTargetLocale || isComparingLocales ? '#d1d5db' : '#3b82f6',
                  color: !selectedBaseLocale || !selectedTargetLocale || isComparingLocales ? '#9ca3af' : '#fff',
                  border: 'none', borderRadius: 6, fontSize: 14, fontWeight: 500, cursor: !selectedBaseLocale || !selectedTargetLocale || isComparingLocales ? 'not-allowed' : 'pointer', marginRight: 12,
                }}
              >
                {isComparingLocales ? 'Comparing...' : 'Compare Locales'}
              </button>
              {localeComparisonResults && (
                <button
                  onClick={downloadComparisonReport}
                  style={{ padding: '12px 24px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 6, fontSize: 14, fontWeight: 500, cursor: 'pointer' }}
                >
                  Download PDF Report
                </button>
              )}
            </div>

          {/* results */}
          {localeComparisonResults && (
            <div>
              <h3 style={{ fontSize: 20, fontWeight: 600, marginBottom: 24 }}>
                Comparison Results: {selectedBaseLocale} vs {selectedTargetLocale}
              </h3>
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 24, marginBottom: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <h4 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Overall Comparison Score</h4>
                  <span style={{ fontSize: 24, fontWeight: 700, color: localeComparisonResults.overall_score >= 80 ? '#10b981' : localeComparisonResults.overall_score >= 60 ? '#f59e0b' : '#ef4444' }}>
                    {localeComparisonResults.overall_score}/100
                  </span>
                </div>
                <p style={{ margin: 0, color: '#64748b', fontSize: 14 }}>{localeComparisonResults.summary}</p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 16, marginBottom: 32 }}>
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: 16, textAlign: 'center' }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#dc2626', marginBottom: 4 }}>{localeComparisonResults.high_severity}</div>
                  <div style={{ fontSize: 14, color: '#7f1d1d' }}>High Severity</div>
                </div>
                <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 8, padding: 16, textAlign: 'center' }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#ea580c', marginBottom: 4 }}>{localeComparisonResults.medium_severity}</div>
                  <div style={{ fontSize: 14, color: '#9a3412' }}>Medium Severity</div>
                </div>
                <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: 16, textAlign: 'center' }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#d97706', marginBottom: 4 }}>{localeComparisonResults.low_severity}</div>
                  <div style={{ fontSize: 14, color: '#92400e' }}>Low Severity</div>
                </div>
                <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 8, padding: 16, textAlign: 'center' }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#0284c7', marginBottom: 4 }}>{localeComparisonResults.total_issues}</div>
                  <div style={{ fontSize: 14, color: '#075985' }}>Total Issues</div>
                </div>
              </div>

              {localeComparisonResults.issues?.length > 0 && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <h4 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Detailed Issues</h4>
                    <span style={{ fontSize: 14, color: '#6b7280' }}>
                      {filterAndSortComparisonIssues(localeComparisonResults.issues).length} of {localeComparisonResults.issues.length} issues
                    </span>
                  </div>
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 16, marginBottom: 16 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 16, alignItems: 'end' }}>
                      <div>
                        <label style={{ display: 'block', marginBottom: 4, fontSize: 12, fontWeight: 500 }}>Filter by Severity</label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {['high','medium','low'].map(sev => (
                            <label key={sev} style={{ display: 'flex', alignItems: 'center', fontSize: 12, cursor: 'pointer' }}>
                              <input
                                type="checkbox"
                                checked={comparisonIssueFilter.severity.includes(sev)}
                                onChange={e => {
                                  const arr = e.target.checked ? [...comparisonIssueFilter.severity, sev] : comparisonIssueFilter.severity.filter(s => s !== sev);
                                  setComparisonIssueFilter({ ...comparisonIssueFilter, severity: arr });
                                }}
                                style={{ marginRight: 4 }}
                              />
                              <span style={{ fontWeight: 500, color: sev === 'high' ? '#dc2626' : sev === 'medium' ? '#ea580c' : '#d97706' }}>
                                {sev.charAt(0).toUpperCase()+sev.slice(1)}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: 4, fontSize: 12, fontWeight: 500 }}>Filter by Type</label>
                        <select
                          multiple
                          value={comparisonIssueFilter.type}
                          onChange={e => {
                            const values = Array.from(e.target.selectedOptions, o => o.value);
                            setComparisonIssueFilter({ ...comparisonIssueFilter, type: values });
                          }}
                          style={{ width: '100%', minHeight: 60, padding: 4, border: '1px solid #d1d5db', borderRadius: 4, fontSize: 12 }}
                        >
                          {getUniqueIssueTypes(localeComparisonResults.issues).map(t => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: 4, fontSize: 12, fontWeight: 500 }}>Sort By</label>
                        <select
                          value={comparisonIssueFilter.sortBy}
                          onChange={e => setComparisonIssueFilter({ ...comparisonIssueFilter, sortBy: e.target.value as any })}
                          style={{ width: '100%', padding: 8, border: '1px solid #d1d5db', borderRadius: 4, fontSize: 12 }}
                        >
                          <option value="none">None</option>
                          <option value="severity">Severity</option>
                          <option value="type">Type</option>
                        </select>
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: 4, fontSize: 12, fontWeight: 500 }}>Order</label>
                        <select
                          value={comparisonIssueFilter.sortOrder}
                          disabled={comparisonIssueFilter.sortBy === 'none'}
                          onChange={e => setComparisonIssueFilter({ ...comparisonIssueFilter, sortOrder: e.target.value as any })}
                          style={{ width: '100%', padding: 8, border: '1px solid #d1d5db', borderRadius: 4, fontSize: 12 }}
                        >
                          <option value="desc">High to Low</option>
                          <option value="asc">Low to High</option>
                        </select>
                      </div>
                    </div>
                    <div style={{ marginTop: 12 }}>
                      <button
                        onClick={() => setComparisonIssueFilter({ severity: [], type: [], sortBy: 'none', sortOrder: 'desc' })}
                        style={{ padding: '6px 12px', background: '#6b7280', color: '#fff', border: 'none', borderRadius: 4, fontSize: 12, cursor: 'pointer' }}
                      >
                        Clear All Filters
                      </button>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {filterAndSortComparisonIssues(localeComparisonResults.issues).map((issue, idx) => (
                      <div
                        key={idx}
                        style={{
                          border: `1px solid ${issue.severity === 'high' ? '#fecaca' : issue.severity === 'medium' ? '#fed7aa' : issue.severity === 'low' ? '#fde68a' : '#bae6fd'}`,
                          borderRadius: 8,
                          padding: 16,
                          background: issue.severity === 'high' ? '#fef2f2' : issue.severity === 'medium' ? '#fff7ed' : issue.severity === 'low' ? '#fffbeb' : '#f0f9ff',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                          <h5 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: issue.severity === 'high' ? '#dc2626' : issue.severity === 'medium' ? '#ea580c' : issue.severity === 'low' ? '#d97706' : '#0284c7' }}>{issue.type}</h5>
                          <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: 12, fontWeight: 500, background: issue.severity === 'high' ? '#dc2626' : issue.severity === 'medium' ? '#ea580c' : issue.severity === 'low' ? '#d97706' : '#0284c7', color: '#fff' }}>
                            {issue.severity.toUpperCase()}
                          </span>
                        </div>
                        <p style={{ margin: '0 0 8px 0', fontSize: 14, color: '#374151' }}>{issue.issue}</p>
                        {issue.suggestion && (
                          <p style={{ margin: 0, fontSize: 14, fontStyle: 'italic', color: '#6b7280' }}>💡 {issue.suggestion}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '64px 0', color: '#6b7280', fontSize: 16 }}>
          Need at least 2 different locales to compare. Trigger more emails from Test Send.
        </div>
      )}
    </div>
  );
};

export default LocaleComparisonTab;
