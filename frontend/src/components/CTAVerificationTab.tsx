import React from 'react';

// Types mirrored from parent (kept minimal for now)
interface EmailSummary { locale: string; subject?: string; status?: string }
interface CTAResult {
  cta_text: string;
  cta_url: string;
  error?: string;
  scraped_title?: string;
  scraped_body_snippet?: string;
  status?: string;
  validation_details?: unknown;
  llm_validation?: unknown;
}
interface CTAValidationResponse {
  total_ctas: number;
  processed_ctas: number;
  results: CTAResult[];
  status?: string;
}
interface AuthState {
  isAuthenticated: boolean;
  isCapturing: boolean;
  status: string;
  authData: unknown;
}

interface Props {
  emails: EmailSummary[];
  emailCache: Record<string, { subject: string; content: string }>;
  authState: AuthState;
  authSectionExpanded: boolean;
  setAuthSectionExpanded: (v: boolean) => void;
  captureAuthenticationData: () => void;
  captureStorageData: () => void;
  uploadAuthenticationData: () => void;
  importAuthData: (data: string) => void;
  isStreamingCta: boolean;
  validatingCtaLocale: string | null;
  selectedCtaLocale: string | null;
  ctaValidationResults: Record<string, CTAValidationResponse>;
  setSelectedCtaLocale: (v: string | null) => void; // if needed in future
  validateCtaForLocale: (locale: string) => void;
  downloadCtaValidationReport: (locale: string) => void;
}

const CTAVerificationTab: React.FC<Props> = ({
  emails,
  emailCache,
  authState,
  authSectionExpanded,
  setAuthSectionExpanded,
  captureAuthenticationData,
  captureStorageData,
  uploadAuthenticationData,
  importAuthData,
  isStreamingCta,
  validatingCtaLocale,
  selectedCtaLocale,
  ctaValidationResults,
  validateCtaForLocale,
  downloadCtaValidationReport,
}) => {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
        <h2 style={{ fontSize: 24, fontWeight: 600, margin: 0 }}>CTA Links Verification</h2>
      </div>

      {/* Authentication Section */}
      <div
        style={{
          border: '1px solid #e5e7eb',
          borderRadius: 12,
          marginBottom: 32,
          backgroundColor: authState.isAuthenticated ? '#f0fdf4' : '#f8fafc',
        }}
      >
        <button
          onClick={() => setAuthSectionExpanded(!authSectionExpanded)}
          style={{
            width: '100%',
            padding: '16px 24px',
            background: 'transparent',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            borderRadius: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <h3
              style={{
                fontSize: 16,
                fontWeight: 600,
                margin: 0,
                color: authState.isAuthenticated ? '#166534' : '#374151',
              }}
            >
              🔐 Authentication Setup
            </h3>
            <span
              style={{
                marginLeft: 12,
                padding: '2px 6px',
                backgroundColor: '#e0e7ff',
                color: '#3730a3',
                borderRadius: 4,
                fontSize: 11,
                fontWeight: 500,
              }}
            >
              OPTIONAL
            </span>
            {authState.isAuthenticated && (
              <span
                style={{
                  marginLeft: 8,
                  padding: '2px 6px',
                  backgroundColor: '#dcfce7',
                  color: '#166534',
                  borderRadius: 4,
                  fontSize: 11,
                  fontWeight: 500,
                }}
              >
                ✓ CONFIGURED
              </span>
            )}
          </div>
          <span style={{ fontSize: 18, color: '#9ca3af' }}>{authSectionExpanded ? '▼' : '▶'}</span>
        </button>

        {authSectionExpanded && (
          <div style={{ padding: '0 24px 24px 24px' }}>
            <p style={{ fontSize: 14, color: '#6b7280', margin: '0 0 16px 0', lineHeight: 1.5 }}>
              {authState.isAuthenticated
                ? '✅ Authentication is configured. CTA verification will use your saved login state for authenticated links.'
                : '🔓 Only needed if you have an active booking and want to test CTA links that require login. Skip this step for testing public/non-authenticated links.'}
            </p>
            <div
              style={{
                padding: 12,
                backgroundColor: '#f9fafb',
                borderRadius: 8,
                fontSize: 14,
                color: '#374151',
                lineHeight: 1.4,
                whiteSpace: 'pre-line',
                marginBottom: 16,
              }}
            >
              {authState.status}
            </div>
            {!authState.isAuthenticated && (
              <div
                style={{
                  marginBottom: 16,
                  padding: 12,
                  backgroundColor: '#eff6ff',
                  border: '1px solid #dbeafe',
                  borderRadius: 6,
                  fontSize: 13,
                  color: '#1e40af',
                }}
              >
                <strong>When to use authentication:</strong>
                <br />• You have an active booking/reservation
                <br />• Testing "My Trips", "Manage Booking", or account-specific links
                <br />• CTA links that redirect to authenticated pages
                <br />
                <br />
                <strong>Skip authentication for:</strong> Public links, general booking flows, marketing pages
              </div>
            )}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              <button
                onClick={captureAuthenticationData}
                style={{
                  padding: '8px 14px',
                  background: '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 6,
                  fontWeight: 500,
                  cursor: 'pointer',
                  fontSize: 13,
                }}
              >
                🌐 Open Expedia Login
              </button>
              <button
                onClick={captureStorageData}
                disabled={authState.isCapturing}
                style={{
                  padding: '8px 14px',
                  background: authState.isCapturing ? '#9ca3af' : '#059669',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 6,
                  fontWeight: 500,
                  cursor: authState.isCapturing ? 'not-allowed' : 'pointer',
                  fontSize: 13,
                }}
              >
                {authState.isCapturing ? '🔄 Capturing...' : '📋 Capture Auth Data'}
              </button>
              {authState.authData as any && (
                <button
                  onClick={uploadAuthenticationData}
                  style={{
                    padding: '8px 14px',
                    background: '#dc2626',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 6,
                    fontWeight: 500,
                    cursor: 'pointer',
                    fontSize: 13,
                  }}
                >
                  ⬆️ Upload to Backend
                </button>
              )}
            </div>
            {authState.status.includes('Manual Capture Instructions') && (
              <div style={{ marginTop: 16 }}>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 500, fontSize: 14 }}>
                  📥 Paste Authentication Data:
                </label>
                <textarea
                  placeholder="Paste the authentication data JSON here..."
                  rows={4}
                  style={{
                    width: '100%',
                    padding: 8,
                    border: '1px solid #d1d5db',
                    borderRadius: 6,
                    fontSize: 12,
                    fontFamily: 'monospace',
                    resize: 'vertical',
                    backgroundColor: '#f9fafb',
                  }}
                  onChange={(e) => {
                    if (e.target.value.trim()) {
                      try {
                        JSON.parse(e.target.value.trim());
                        importAuthData(e.target.value.trim());
                        e.target.value = '';
                      } catch (_) {
                        // ignore until valid JSON
                      }
                    }
                  }}
                />
                <p style={{ fontSize: 12, color: '#6b7280', margin: '4px 0 0 0' }}>
                  📋 Paste the JSON data from the console - it will be imported automatically when valid
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Locale Selection */}
      {emails.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          {isStreamingCta && (
            <div
              style={{
                marginBottom: 16,
                padding: '12px 16px',
                backgroundColor: '#dbeafe',
                borderRadius: 8,
                border: '1px solid #3b82f6',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <span
                style={{
                  display: 'inline-block',
                  width: 8,
                  height: 8,
                  backgroundColor: '#3b82f6',
                  borderRadius: '50%',
                  animation: 'pulse 1.5s infinite',
                }}
              ></span>
              <span style={{ fontSize: 14, color: '#1e40af', fontWeight: 500 }}>
                ⚡ Live progress updates - Real-time streaming validation in progress
              </span>
            </div>
          )}
          <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>🔗 Select Locale for CTA Validation</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(250px,1fr))', gap: 16 }}>
            {emails.map((email) => (
              <div
                key={email.locale}
                style={{
                  border: selectedCtaLocale === email.locale ? '2px solid #2563eb' : '1px solid #e5e7eb',
                  borderRadius: 8,
                  padding: 16,
                  backgroundColor: selectedCtaLocale === email.locale ? '#eff6ff' : '#ffffff',
                  cursor: validatingCtaLocale || !emailCache[email.locale] ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                  opacity:
                    validatingCtaLocale && validatingCtaLocale !== email.locale
                      ? 0.5
                      : !emailCache[email.locale]
                        ? 0.6
                        : 1,
                }}
                onClick={() => {
                  if (!validatingCtaLocale && emailCache[email.locale]) {
                    validateCtaForLocale(email.locale);
                  }
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <h4 style={{ fontSize: 16, fontWeight: 600, margin: 0, color: '#374151' }}>{email.locale}</h4>
                  {!emailCache[email.locale] ? (
                    <span style={{ fontSize: 14, color: '#ef4444' }}>📧 Load First</span>
                  ) : validatingCtaLocale === email.locale ? (
                    <span style={{ fontSize: 14, color: '#2563eb' }}>🔄 Validating...</span>
                  ) : ctaValidationResults[email.locale] ? (
                    <span style={{ fontSize: 14, color: '#059669' }}>✅ Validated</span>
                  ) : (
                    <span style={{ fontSize: 14, color: '#6b7280' }}>Click to validate</span>
                  )}
                </div>
                <p style={{ fontSize: 14, color: '#6b7280', margin: 0, lineHeight: 1.4 }}>
                  Subject: {emailCache[email.locale]?.subject || email.subject || 'No subject'}
                </p>
                {!emailCache[email.locale] && (
                  <div style={{ marginTop: 8, padding: 6, backgroundColor: '#fef2f2', borderRadius: 4 }}>
                    <p style={{ fontSize: 11, color: '#ef4444', margin: 0 }}>
                      ⚠️ Please load this email from "Email Viewer" tab first
                    </p>
                  </div>
                )}
                {ctaValidationResults[email.locale] && (
                  <div style={{ marginTop: 12, padding: 8, backgroundColor: '#f0f9ff', borderRadius: 4 }}>
                    <p style={{ fontSize: 12, color: '#1e40af', margin: 0 }}>
                      Found {ctaValidationResults[email.locale].total_ctas} CTAs, processed{' '}
                      {ctaValidationResults[email.locale].processed_ctas}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Results */}
      {selectedCtaLocale && ctaValidationResults[selectedCtaLocale] && (
        <>
          <div style={{ marginBottom: 32 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>🔗 CTA Validation Results - {selectedCtaLocale}</h3>
              <button
                onClick={() => downloadCtaValidationReport(selectedCtaLocale)}
                style={{
                  padding: '8px 16px',
                  background: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: 6,
                  fontWeight: 500,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                📄 Download Report
              </button>
            </div>
            <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 20, backgroundColor: '#ffffff' }}>
              <div style={{ display: 'flex', gap: 20, marginBottom: 20, flexWrap: 'wrap' }}>
                <>
                  <div style={{ padding: 12, backgroundColor: '#f0f9ff', borderRadius: 8, flex: 1, minWidth: 150 }}>
                    <div style={{ fontSize: 24, fontWeight: 700, color: '#1e40af' }}>
                      {ctaValidationResults[selectedCtaLocale].total_ctas}
                    </div>
                    <div style={{ fontSize: 14, color: '#6b7280' }}>Total CTAs</div>
                  </div>
                  <div style={{ padding: 12, backgroundColor: '#f0fdf4', borderRadius: 8, flex: 1, minWidth: 150 }}>
                    <div style={{ fontSize: 24, fontWeight: 700, color: '#166534' }}>
                      {ctaValidationResults[selectedCtaLocale].processed_ctas}
                    </div>
                    <div style={{ fontSize: 14, color: '#6b7280' }}>Processed</div>
                  </div>
                  <div style={{ padding: 12, backgroundColor: '#fef3c7', borderRadius: 8, flex: 1, minWidth: 150 }}>
                    <div style={{ fontSize: 24, fontWeight: 700, color: '#92400e' }}>
                      {ctaValidationResults[selectedCtaLocale].results.filter((r) => r.error).length}
                    </div>
                    <div style={{ fontSize: 14, color: '#6b7280' }}>Errors</div>
                  </div>
                </>
              </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {ctaValidationResults[selectedCtaLocale].results.map((result, index) => (
                <div
                  key={index}
                  style={{
                    border: result.error ? '1px solid #fca5a5' : '1px solid #e5e7eb',
                    borderRadius: 8,
                    padding: 16,
                    backgroundColor: result.error ? '#fef2f2' : '#f9fafb',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                    <span
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        backgroundColor: result.error ? '#dc2626' : '#10b981',
                        flexShrink: 0,
                      }}
                    ></span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                        {result.cta_text || 'No text'}
                      </div>
                      <a
                        href={result.cta_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: '#2563eb', textDecoration: 'none', fontSize: 13, wordBreak: 'break-all' }}
                      >
                        {result.cta_url}
                      </a>
                    </div>
                    <span
                      style={{
                        padding: '4px 8px',
                        background: result.error ? '#fca5a5' : '#dcfce7',
                        color: result.error ? '#991b1b' : '#166534',
                        borderRadius: 4,
                        fontSize: 12,
                        fontWeight: 500,
                      }}
                    >
                      {result.error ? '❌ ERROR' : '✓ SUCCESS'}
                    </span>
                  </div>
                  {result.error ? (
                    <div style={{ padding: '8px 12px', backgroundColor: '#fee2e2', borderRadius: 4, fontSize: 13, color: '#991b1b' }}>
                      <strong>Error:</strong> {result.error}
                    </div>
                  ) : (
                    <div style={{ fontSize: 13, color: '#6b7280' }}>
                      {result.scraped_title && (
                        <div style={{ marginBottom: 4 }}>
                          <strong>Title:</strong> {result.scraped_title}
                        </div>
                      )}
                      {result.scraped_body_snippet && (
                        <div style={{ marginBottom: 4 }}>
                          <strong>Content:</strong> {result.scraped_body_snippet.substring(0, 150)}
                          {result.scraped_body_snippet.length > 150 ? '...' : ''}
                        </div>
                      )}
                      {result.status && (
                        <div style={{ marginBottom: 4 }}>
                          <strong>Status:</strong> {result.status}
                        </div>
                      )}
                      {result.validation_details as any && (
                        <div style={{ marginBottom: 4 }}>
                          <strong>Validation Details:</strong> {JSON.stringify(result.validation_details)}
                        </div>
                      )}
                      {result.llm_validation as any && (
                        <div style={{ marginBottom: 4 }}>
                          <strong>LLM Validation:</strong>{' '}
                          {typeof result.llm_validation === 'object'
                            ? JSON.stringify(result.llm_validation)
                            : String(result.llm_validation)}
                        </div>
                      )}
                      <details style={{ marginTop: 8, fontSize: 12 }}>
                        <summary style={{ cursor: 'pointer', color: '#4b5563', fontWeight: 500 }}>
                          Show Full Backend Response
                        </summary>
                        <pre
                          style={{
                            marginTop: 8,
                            padding: 8,
                            backgroundColor: '#f3f4f6',
                            borderRadius: 4,
                            overflow: 'auto',
                            fontSize: 11,
                            color: '#374151',
                          }}
                        >
                          {JSON.stringify(result, null, 2)}
                        </pre>
                      </details>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
        </>
      )}

      {emails.length === 0 && (
        <div
          style={{
            padding: 40,
            textAlign: 'center',
            border: '2px dashed #d1d5db',
            borderRadius: 12,
            color: '#6b7280',
          }}
        >
          <h3 style={{ fontSize: 18, fontWeight: 500, marginBottom: 8 }}>📧 No Email Content Loaded</h3>
          <p style={{ fontSize: 14, margin: 0 }}>
            Please load email content from the "Email Viewer" tab first to validate CTA links.
          </p>
        </div>
      )}
    </div>
  );
};

export default CTAVerificationTab;
