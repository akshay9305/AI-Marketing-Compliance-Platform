import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, LogIn } from 'lucide-react';

type AnimatedWordsProps = {
  words: string[];
  interval?: number;
};

function AnimatedWords({ words, interval = 2200 }: AnimatedWordsProps) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % words.length), interval);
    return () => clearInterval(id);
  }, [words.length, interval]);

  const getWordStyle = (word: string) => {
    const styles = {
      Design: 'text-blue-400 font-bold',
      Modification: 'text-green-400 font-bold',
      Compliance: 'text-red-400 font-bold',
      Validation: 'text-purple-400 font-bold',
      Migration: 'text-orange-400 font-bold',
      Localization: 'text-teal-400 font-bold',
    };
    return styles[word as keyof typeof styles] || 'text-white font-bold';
  };

  const getGlowStyle = (word: string, isActive: boolean) => {
    if (!isActive) return {};
    const glows = {
      Design: { textShadow: '0 0 20px rgba(59, 130, 246, 0.8)' },
      Modification: { textShadow: '0 0 20px rgba(34, 197, 94, 0.8)' },
      Compliance: { textShadow: '0 0 20px rgba(239, 68, 68, 0.8)' },
      Validation: { textShadow: '0 0 20px rgba(147, 51, 234, 0.8)' },
      Migration: { textShadow: '0 0 20px rgba(249, 115, 22, 0.8)' },
      Localization: { textShadow: '0 0 20px rgba(20, 184, 166, 0.8)' },
    };
    return glows[word as keyof typeof glows] || {};
  };

  return (
    <span aria-live="polite" className="inline-block align-middle ml-2">
      {words.map((w, i) => (
        <span
          key={w}
          className={`inline-block transform transition-all duration-600 ${getWordStyle(w)} ${i === index ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 absolute'}`}
          style={{ position: i === index ? 'static' : 'absolute', ...getGlowStyle(w, i === index) }}
          aria-hidden={i !== index}
        >
          {w}
        </span>
      ))}
    </span>
  );
}

export default function Homepage(): JSX.Element {
  const [showLogin, setShowLogin] = useState(false);
  const [selectedRole, setSelectedRole] = useState('Business');
  const navigate = useNavigate();

  const animatedTerms = ['Design', 'Modification', 'Compliance', 'Validation', 'Migration', 'Localization'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-black text-white">
      <div className="max-w-7xl mx-auto px-6 py-16">
        <header className="mb-16 flex items-center justify-between">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight" style={{ fontFamily: "'Inter', sans-serif" }}>CreatiVal-AI</h1>
            <p className="mt-2 text-lg text-gray-300">AI-Powered unified platform that provides</p>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowLogin(true)}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
            >
              <LogIn className="w-5 h-5" /> Get Started
            </button>
          </div>
        </header>

        {/* Hero */}
        <main className="relative overflow-hidden rounded-3xl p-12 md:p-16 bg-gradient-to-r from-gray-800/50 to-slate-800/50 backdrop-blur-sm border border-gray-700/50 shadow-2xl">
          {/* background decorative */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-purple-600/5 to-indigo-600/10 rounded-3xl"></div>
          <div className="absolute -right-32 -top-32 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl"></div>
          <div className="absolute -left-32 -bottom-32 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl"></div>

          <div className="md:flex md:items-center md:justify-between relative z-10">
            <div className="md:flex-1 md:pr-12">
              <h2 className="text-6xl md:text-7xl font-extrabold leading-tight text-white mb-8" style={{ fontFamily: "'Inter', sans-serif" }}>
                AI-Powered unified platform that provides
                <AnimatedWords words={animatedTerms} interval={2000} />
              </h2>

              <p className="text-xl text-gray-300 max-w-3xl leading-relaxed mb-10">
                Build and ship compliant marketing templates faster. Our LLM-first validations and deterministic rules catch regulatory issues early, while our migration tools modernize legacy templates to MJML with preserved placeholders.
              </p>

              <div className="mb-12">
                <button
                  onClick={() => setShowLogin(true)}
                  className="inline-flex items-center gap-3 px-8 py-4 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold text-lg shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105"
                >
                  Get Started
                </button>
              </div>
            </div>
          </div>

          {/* Marketing standards row */}
          <div className="border-t border-gray-700/50 pt-8">
            <div className="flex flex-row flex-wrap gap-4 items-center">
              {['CAN-SPAM', 'CASL', 'GDPR', 'CCPA', 'TCPA', 'FTC', 'Accessibility'].map((s) => (
                <div key={s} className="inline-flex items-center gap-2 bg-gray-800/80 backdrop-blur-sm px-4 py-3 rounded-full shadow-lg border border-gray-600/50 hover:bg-gray-700/80 transition-colors duration-200">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <span className="text-sm font-semibold text-gray-200">{s}</span>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>

      {/* Login modal */}
      {showLogin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" aria-hidden onClick={() => setShowLogin(false)} />
          <div className="relative bg-gray-800 rounded-2xl p-8 w-full max-w-md mx-4 shadow-2xl border border-gray-700">
            <h3 className="text-xl font-semibold text-white">Sign in to CreatiVal-AI</h3>
            <p className="text-sm text-gray-400 mt-2">Enter your email to continue. For the hackathon demo, use any email — this is a local UI flow.</p>

            <form className="mt-6 space-y-4" onSubmit={(e) => { e.preventDefault(); localStorage.setItem('user_role', selectedRole); localStorage.setItem('access_token', 'demo-token-' + Date.now()); setShowLogin(false); navigate(selectedRole === 'Business' ? '/dashboard' : '/dev/dashboard'); }}>
              <label className="block text-sm">
                <span className="text-gray-300 font-medium">Email</span>
                <input required type="email" className="mt-2 block w-full rounded-lg border border-gray-600 bg-gray-700 px-4 py-3 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors" />
              </label>

              <label className="block text-sm">
                <span className="text-gray-300 font-medium">Password</span>
                <input required type="password" className="mt-2 block w-full rounded-lg border border-gray-600 bg-gray-700 px-4 py-3 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors" />
              </label>

              <label className="block text-sm">
                <span className="text-gray-300 font-medium">Role</span>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="mt-2 block w-full rounded-lg border border-gray-600 bg-gray-700 px-4 py-3 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors"
                >
                  <option value="Business">Business</option>
                  <option value="Developer">Developer</option>
                </select>
              </label>

              <div className="flex items-center justify-between mt-6">
                <button type="submit" className="px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors">Sign in</button>
                <button type="button" onClick={() => setShowLogin(false)} className="text-sm text-gray-400 hover:text-gray-300 transition-colors">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}