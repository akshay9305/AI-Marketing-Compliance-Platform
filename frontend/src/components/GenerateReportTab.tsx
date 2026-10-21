import React from 'react';

// Local lightweight type shapes (avoid large interface export refactor for now)
type EmailItem = { locale: string; status: string; subject?: string };
type ContentValidationSummary = {
  total_issues: number;
  high_severity: number;
  medium_severity: number;
  low_severity: number;
  overall_score: number;
  validation_type: string;
  summary: string;
};
type CTAValidationSummary = {
  status: string;
  total_ctas: number;
  processed_ctas: number;
  results: { error?: string }[];
};
type LocaleComparisonSummary = {
  overall_score: number;
  total_issues: number;
  high_severity: number;
  medium_severity: number;
  low_severity: number;
  summary: string;
  base_language: string;
  target_language: string;
};

interface GenerateReportTabProps {
  emails: EmailItem[];
  contentValidationResults: Record<string, ContentValidationSummary>;
  ctaValidationResults: Record<string, CTAValidationSummary>;
  localeComparisonResults: LocaleComparisonSummary | null;
  reportGenerated: boolean;
  onGenerateReport: () => void;
  onDownloadContentReport: (locale: string) => void;
  onDownloadCtaReport: (locale: string) => void;
  onDownloadLocaleComparisonReport: () => void;
  onGenerateConsolidated?: () => void; // future hook
}

const sectionCardStyle: React.CSSProperties = {
  background: 'white',
  border: '1px solid #e5e7eb',
  borderRadius: 12,
  padding: 20,
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
};

const badge = (text: string, color: string) => (
  <span
    style={{
      background: color,
      color: '#fff',
      fontSize: 11,
      fontWeight: 600,
      padding: '2px 8px',
      borderRadius: 999,
      letterSpacing: 0.5,
      display: 'inline-block',
    }}
  >
    {text}
  </span>
);

const statusColor = (status: string) => {
  switch (status) {
    case 'success':
    case 'pass':
      return '#10b981';
    case 'failed':
    case 'fail':
      return '#ef4444';
    case 'pending':
    case 'warning':
      return '#f59e0b';
    case 'loading':
      return '#3b82f6';
    default:
      return '#6b7280';
  }
};

const progressBar = (value: number, total: number) => {
  const pct = total === 0 ? 0 : Math.min(100, (value / total) * 100);
  return (
    <div style={{ width: '100%', background: '#f1f5f9', borderRadius: 6, height: 8, overflow: 'hidden' }}>
      <div style={{ width: pct + '%', height: '100%', background: '#3b82f6', transition: 'width .4s' }} />
    </div>
  );
};

const GenerateReportTab: React.FC<GenerateReportTabProps> = ({
  emails,
  contentValidationResults,
  ctaValidationResults,
  localeComparisonResults,
  reportGenerated,
  onGenerateReport,
  onDownloadContentReport,
  onDownloadCtaReport,
  onDownloadLocaleComparisonReport,
  onGenerateConsolidated,
}) => {
  const totalEmails = emails.length;
  const loadedEmails = emails.filter((e) => e.status === 'success').length;

  const contentLocales = Object.keys(contentValidationResults);
  const ctaLocales = Object.keys(ctaValidationResults);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: 24, fontWeight: 600 }}>Generate Report</h2>
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={onGenerateReport}
            style={{
              background: '#2563eb',
              color: 'white',
              padding: '10px 18px',
              borderRadius: 8,
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            {reportGenerated ? '✅ Report Ready' : '📊 Generate Report'}
          </button>
          {onGenerateConsolidated && (
            <button
              onClick={onGenerateConsolidated}
              style={{
                background: '#0d9488',
                color: 'white',
                padding: '10px 18px',
                borderRadius: 8,
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
              }}
            >
              📄 Download Consolidated
            </button>
          )}
        </div>
      </div>
      <p style={{ color: '#475569', marginTop: -12, fontSize: 14 }}>
        Overview of all QC activities across locales. Each section summarizes progress and offers per-locale report
        downloads.
      </p>

      {/* Email Trigger Status */}
      <div style={sectionCardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Email Trigger Status</h3>
          {badge(`${loadedEmails}/${totalEmails} loaded`, loadedEmails === totalEmails && totalEmails > 0 ? '#10b981' : '#3b82f6')}
        </div>
        {progressBar(loadedEmails, totalEmails || 1)}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 10 }}>
          {emails.map((e) => (
            <div
              key={e.locale}
              style={{
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                padding: 10,
                background: '#f8fafc',
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
              }}
            >
              <span style={{ fontWeight: 600, fontSize: 13 }}>{e.locale.toUpperCase()}</span>
              <span style={{ fontSize: 12, color: '#64748b' }}>{e.subject || '—'}</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: statusColor(e.status) }}>{e.status}</span>
            </div>
          ))}
          {emails.length === 0 && <div style={{ fontSize: 13, color: '#64748b' }}>No triggered locales yet.</div>}
        </div>
      </div>

      {/* Content Validation Status */}
      <div style={sectionCardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Content Validation</h3>
          {badge(`${contentLocales.length} locale${contentLocales.length !== 1 ? 's' : ''}`, '#6366f1')}
        </div>
        {contentLocales.length === 0 && <p style={{ margin: 0, color: '#64748b' }}>No validations run yet.</p>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {contentLocales.map((loc) => {
            const r = contentValidationResults[loc];
            return (
              <div
                key={loc}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  background: '#f1f5f9',
                  padding: '10px 14px',
                  borderRadius: 8,
                }}
              >
                <div style={{ width: 70, fontWeight: 600 }}>{loc.toUpperCase()}</div>
                <div style={{ flex: 1, fontSize: 12, color: '#475569' }}>
                  {r.total_issues} issues | Score {r.overall_score}
                </div>
                <button
                  onClick={() => onDownloadContentReport(loc)}
                  style={{
                    background: '#1d4ed8',
                    color: 'white',
                    border: 'none',
                    padding: '6px 12px',
                    borderRadius: 6,
                    fontSize: 12,
                    cursor: 'pointer',
                  }}
                >
                  Download
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* CTA Verification Status */}
      <div style={sectionCardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>CTA Verification</h3>
          {badge(`${ctaLocales.length} locale${ctaLocales.length !== 1 ? 's' : ''}`, '#0ea5e9')}
        </div>
        {ctaLocales.length === 0 && <p style={{ margin: 0, color: '#64748b' }}>No CTA validations performed.</p>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {ctaLocales.map((loc) => {
            const r = ctaValidationResults[loc];
            const errors = r.results.filter((x) => x.error).length;
            return (
              <div
                key={loc}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  background: '#f1f5f9',
                  padding: '10px 14px',
                  borderRadius: 8,
                }}
              >
                <div style={{ width: 70, fontWeight: 600 }}>{loc.toUpperCase()}</div>
                <div style={{ flex: 1, fontSize: 12, color: '#475569' }}>
                  {r.processed_ctas}/{r.total_ctas} processed | {errors} error{errors !== 1 ? 's' : ''} | Status{' '}
                  <span style={{ color: statusColor(r.status), fontWeight: 600 }}>{r.status}</span>
                </div>
                <button
                  onClick={() => onDownloadCtaReport(loc)}
                  style={{
                    background: '#0369a1',
                    color: 'white',
                    border: 'none',
                    padding: '6px 12px',
                    borderRadius: 6,
                    fontSize: 12,
                    cursor: 'pointer',
                  }}
                >
                  Download
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Locale Comparison Status */}
      <div style={sectionCardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Locale Comparison</h3>
          {localeComparisonResults
            ? badge('completed', '#10b981')
            : badge('pending', '#f59e0b')}
        </div>
        {!localeComparisonResults && (
          <p style={{ margin: 0, color: '#64748b' }}>No comparison has been executed yet.</p>
        )}
        {localeComparisonResults && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              background: '#f1f5f9',
              padding: '14px 16px',
              borderRadius: 10,
            }}
          >
            <div style={{ fontSize: 13, color: '#334155' }}>
              {localeComparisonResults.base_language.toUpperCase()} ➜{' '}
              {localeComparisonResults.target_language.toUpperCase()} | Score {localeComparisonResults.overall_score} |{' '}
              {localeComparisonResults.total_issues} issues (H:{localeComparisonResults.high_severity} M:{
                localeComparisonResults.medium_severity
              } L:{localeComparisonResults.low_severity})
            </div>
            <div style={{ fontSize: 12, color: '#475569' }}>{localeComparisonResults.summary}</div>
            <div>
              <button
                onClick={onDownloadLocaleComparisonReport}
                style={{
                  background: '#1d4ed8',
                  color: 'white',
                  border: 'none',
                  padding: '6px 14px',
                  borderRadius: 6,
                  fontSize: 12,
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                Download Comparison Report
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Future consolidated summary section (placeholder) */}
      {reportGenerated && (
        <div style={{ ...sectionCardStyle, borderStyle: 'dashed' }}>
          <h3 style={{ marginTop: 0 }}>Consolidated Report</h3>
          <p style={{ margin: 0, color: '#64748b', fontSize: 13 }}>
            A consolidated PDF or JSON export will be available here. This can merge all locale-level insights.
          </p>
        </div>
      )}
    </div>
  );
};

export default GenerateReportTab;
