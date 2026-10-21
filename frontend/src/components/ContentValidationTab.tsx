import React from 'react';

// Lightweight local type mirrors (avoid refactor of parent file interfaces for now)
type Email = { locale: string; subject?: string };
type EmailCache = Record<string, { subject: string; content: string }>;
type ContentValidationIssue = {
  type: string;
  severity: 'high' | 'medium' | 'low';
  location: string;
  issue: string;
  suggestion: string;
  context: string;
};
type ContentValidationResponse = {
  total_issues: number;
  high_severity: number;
  medium_severity: number;
  low_severity: number;
  overall_score: number;
  summary: string;
  validation_type: string;
  issues: ContentValidationIssue[];
};

interface ContentIssueFilter {
  severity: string[];
  type: string[];
  sortBy: 'severity' | 'type' | 'none';
  sortOrder: 'asc' | 'desc';
}

interface Props {
  emails: Email[];
  emailCache: EmailCache;
  validatingLocale: string | null;
  selectedValidationLocale: string | null;
  contentValidationResults: Record<string, ContentValidationResponse>;
  contentIssueFilter: ContentIssueFilter;
  setContentIssueFilter: (f: ContentIssueFilter) => void;
  validateEmailContent: (locale: string) => void;
  downloadValidationReport: (locale: string) => void;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const ContentValidationTab: React.FC<Props> = ({
  emails,
  emailCache,
  validatingLocale,
  selectedValidationLocale,
  contentValidationResults,
  contentIssueFilter,
  setContentIssueFilter,
  validateEmailContent,
  downloadValidationReport,
}) => {
  // Helpers local to component
  const getUniqueIssueTypes = (issues: ContentValidationIssue[]) => Array.from(new Set(issues.map(i => i.type)));
  const severityRank = (s: string) => (s === 'high' ? 3 : s === 'medium' ? 2 : s === 'low' ? 1 : 0);
  const filterAndSortContentIssues = (issues: ContentValidationIssue[]) => {
    let filtered = [...issues];
    if (contentIssueFilter.severity.length) {
      filtered = filtered.filter(i => contentIssueFilter.severity.includes(i.severity));
    }
    if (contentIssueFilter.type.length) {
      filtered = filtered.filter(i => contentIssueFilter.type.includes(i.type));
    }
    if (contentIssueFilter.sortBy !== 'none') {
      filtered.sort((a, b) => {
        let cmp = 0;
        if (contentIssueFilter.sortBy === 'severity') cmp = severityRank(b.severity) - severityRank(a.severity);
        else if (contentIssueFilter.sortBy === 'type') cmp = a.type.localeCompare(b.type);
        return contentIssueFilter.sortOrder === 'desc' ? cmp : -cmp;
      });
    }
    return filtered;
  };

  return (
    <div>
      <h2 style={{ fontSize: 24, fontWeight: 600, marginBottom: 24 }}>Content Validation</h2>
      <p style={{ fontSize: 16, color: '#6b7280', marginBottom: 32 }}>
        AI-powered content analysis for email quality assurance. Click on a locale card to validate email content.
      </p>

      {/* Locale Cards */}
      <div style={{ marginBottom: 32 }}>
        <h3 style={{ fontSize: 18, fontWeight: 500, marginBottom: 16 }}>Available Locales</h3>
        {emails.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', border: '2px dashed #d1d5db', borderRadius: 12, color: '#6b7280' }}>
            <p style={{ fontSize: 18, marginBottom: 8 }}>📧 No triggered locales found</p>
            <p style={{ fontSize: 14, margin: 0 }}>Trigger emails first via Test Send to enable validation.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px,1fr))', gap: 16 }}>
            {emails.map(email => {
              const res = contentValidationResults[email.locale];
              const isSelected = selectedValidationLocale === email.locale;
              const canValidate = !!emailCache[email.locale];
              return (
                <div
                  key={email.locale}
                  onClick={() => {
                    if (!canValidate) {
                      alert(`Please load the email for ${email.locale} first from the Email Viewer tab.`);
                      return;
                    }
                    validateEmailContent(email.locale);
                  }}
                  style={{
                    border: isSelected ? '2px solid #2563eb' : '1px solid #e5e7eb',
                    borderRadius: 12,
                    padding: 16,
                    cursor: canValidate ? 'pointer' : 'not-allowed',
                    opacity: canValidate ? 1 : 0.6,
                    transition: 'all .2s',
                    background: isSelected ? '#f8fafc' : '#fff',
                  }}
                  onMouseEnter={e => {
                    if (canValidate) {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                    }
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontWeight: 500, fontSize: 16 }}>{email.locale}</span>
                    {validatingLocale === email.locale ? (
                      <div style={{ width: 16, height: 16, border: '2px solid #f3f4f6', borderTop: '2px solid #2563eb', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                    ) : canValidate ? (
                      res ? (
                        <span style={{ padding: '4px 8px', borderRadius: 12, fontSize: 12, fontWeight: 500, background: '#dcfce7', color: '#166534' }}>✓ VALIDATED</span>
                      ) : (
                        <span style={{ padding: '4px 8px', borderRadius: 12, fontSize: 12, fontWeight: 500, background: '#fef3c7', color: '#92400e' }}>READY</span>
                      )
                    ) : (
                      <span style={{ padding: '4px 8px', borderRadius: 12, fontSize: 12, fontWeight: 500, background: '#fee2e2', color: '#dc2626' }}>NOT LOADED</span>
                    )}
                  </div>
                  <div style={{ fontSize: 14, color: '#6b7280' }}>
                    {canValidate ? emailCache[email.locale].subject || 'Email loaded - click to validate' : 'Load email first to enable validation'}
                  </div>
                  {res && (
                    <div style={{ marginTop: 8, fontSize: 12 }}>
                      <div style={{ color: '#dc2626' }}>🔴 {res.high_severity} High</div>
                      <div style={{ color: '#f59e0b' }}>🟡 {res.medium_severity} Medium</div>
                      <div style={{ color: '#10b981' }}>🟢 {res.low_severity} Low</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Validation Results */}
      {selectedValidationLocale && contentValidationResults[selectedValidationLocale] && (() => {
        const result = contentValidationResults[selectedValidationLocale];
        const filteredIssues = filterAndSortContentIssues(result.issues);
        return (
          <div style={{ marginTop: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <h3 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>Validation Results - {selectedValidationLocale}</h3>
              <button
                onClick={() => downloadValidationReport(selectedValidationLocale)}
                style={{ padding: '8px 16px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
              >
                📄 Download Report
              </button>
            </div>

            {/* Summary cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 16, marginBottom: 24 }}>
              {[
                { label: 'Total Issues', value: result.total_issues, color: '#dc2626' },
                { label: 'High Severity', value: result.high_severity, color: '#dc2626' },
                { label: 'Medium Severity', value: result.medium_severity, color: '#f59e0b' },
                { label: 'Low Severity', value: result.low_severity, color: '#10b981' },
              ].map(card => (
                <div key={card.label} style={{ padding: 16, border: '1px solid #e5e7eb', borderRadius: 8, textAlign: 'center' }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color: card.color }}>{card.value}</div>
                  <div style={{ fontSize: 14, color: '#6b7280' }}>{card.label}</div>
                </div>
              ))}
            </div>

            {/* AI Summary */}
            <div style={{ padding: 16, background: '#f8fafc', borderRadius: 8, marginBottom: 24 }}>
              <h4 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 8px 0' }}>AI Summary</h4>
              <p style={{ fontSize: 14, color: '#374151', margin: 0 }}>{result.summary}</p>
            </div>

            {/* Filters */}
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 16, marginBottom: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 16, alignItems: 'end' }}>
                {/* Severity filter */}
                <div>
                  <label style={{ display: 'block', marginBottom: 4, fontSize: 12, fontWeight: 500 }}>Filter by Severity</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {['high','medium','low'].map(sev => (
                      <label key={sev} style={{ display: 'flex', alignItems: 'center', fontSize: 12, cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={contentIssueFilter.severity.includes(sev)}
                          onChange={e => {
                            const arr = e.target.checked
                              ? [...contentIssueFilter.severity, sev]
                              : contentIssueFilter.severity.filter(s => s !== sev);
                            setContentIssueFilter({ ...contentIssueFilter, severity: arr });
                          }}
                          style={{ marginRight: 4 }}
                        />
                        <span style={{ fontWeight: 500, color: sev === 'high' ? '#dc2626' : sev === 'medium' ? '#f59e0b' : '#10b981' }}>
                          {sev.charAt(0).toUpperCase() + sev.slice(1)}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
                {/* Type filter */}
                <div>
                  <label style={{ display: 'block', marginBottom: 4, fontSize: 12, fontWeight: 500 }}>Filter by Type</label>
                  <select
                    multiple
                    value={contentIssueFilter.type}
                    onChange={e => {
                      const values = Array.from(e.target.selectedOptions, o => o.value);
                      setContentIssueFilter({ ...contentIssueFilter, type: values });
                    }}
                    style={{ width: '100%', minHeight: 60, padding: 4, border: '1px solid #d1d5db', borderRadius: 4, fontSize: 12 }}
                  >
                    {getUniqueIssueTypes(result.issues).map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                {/* Sort by */}
                <div>
                  <label style={{ display: 'block', marginBottom: 4, fontSize: 12, fontWeight: 500 }}>Sort By</label>
                  <select
                    value={contentIssueFilter.sortBy}
                    onChange={e => setContentIssueFilter({ ...contentIssueFilter, sortBy: e.target.value as any })}
                    style={{ width: '100%', padding: 8, border: '1px solid #d1d5db', borderRadius: 4, fontSize: 12 }}
                  >
                    <option value="none">None</option>
                    <option value="severity">Severity</option>
                    <option value="type">Type</option>
                  </select>
                </div>
                {/* Order */}
                <div>
                  <label style={{ display: 'block', marginBottom: 4, fontSize: 12, fontWeight: 500 }}>Order</label>
                  <select
                    value={contentIssueFilter.sortOrder}
                    disabled={contentIssueFilter.sortBy === 'none'}
                    onChange={e => setContentIssueFilter({ ...contentIssueFilter, sortOrder: e.target.value as any })}
                    style={{ width: '100%', padding: 8, border: '1px solid #d1d5db', borderRadius: 4, fontSize: 12 }}
                  >
                    <option value="desc">High to Low</option>
                    <option value="asc">Low to High</option>
                  </select>
                </div>
              </div>
              <div style={{ marginTop: 12 }}>
                <button
                  onClick={() => setContentIssueFilter({ severity: [], type: [], sortBy: 'none', sortOrder: 'desc' })}
                  style={{ padding: '6px 12px', background: '#6b7280', color: '#fff', border: 'none', borderRadius: 4, fontSize: 12, cursor: 'pointer' }}
                >
                  Clear All Filters
                </button>
              </div>
            </div>

            {/* Issues */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h4 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Detailed Issues</h4>
                <span style={{ fontSize: 14, color: '#6b7280' }}>{filteredIssues.length} of {result.issues.length} issues</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {filteredIssues.map((issue, idx) => (
                  <div
                    key={idx}
                    style={{
                      border: '1px solid #e5e7eb',
                      borderRadius: 8,
                      padding: 16,
                      borderLeft: `4px solid ${issue.severity === 'high' ? '#dc2626' : issue.severity === 'medium' ? '#f59e0b' : '#10b981'}`,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <span style={{ padding: '4px 8px', borderRadius: 12, fontSize: 12, fontWeight: 600, background: issue.severity === 'high' ? '#fef2f2' : issue.severity === 'medium' ? '#fffbeb' : '#f0fdf4', color: issue.severity === 'high' ? '#dc2626' : issue.severity === 'medium' ? '#f59e0b' : '#10b981' }}>{issue.severity.toUpperCase()}</span>
                      <span style={{ padding: '4px 8px', borderRadius: 12, fontSize: 12, fontWeight: 500, background: '#f3f4f6', color: '#374151' }}>{issue.type.toUpperCase()}</span>
                      <span style={{ fontSize: 14, fontWeight: 500, color: '#6b7280' }}>{issue.location}</span>
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <p style={{ fontSize: 14, fontWeight: 500, color: '#374151', margin: '0 0 4px 0' }}>Issue: {issue.issue}</p>
                      <p style={{ fontSize: 14, color: '#10b981', margin: '0 0 4px 0' }}>💡 {issue.suggestion}</p>
                      {issue.context && (
                        <p style={{ fontSize: 12, color: '#6b7280', margin: 0, fontStyle: 'italic' }}>
                          Context: "{issue.context}"
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default ContentValidationTab;
