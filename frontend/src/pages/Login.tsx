import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function LoginPage(): JSX.Element {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'Business' | 'Developer'>('Business');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('http://localhost:8000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (res.ok) {
        const body = await res.json();
        // store token and user info
        try {
          localStorage.setItem('access_token', body.access_token);
          const userObj = body.user || { email };
          userObj.role = role;
          localStorage.setItem('user', JSON.stringify(userObj));
          localStorage.setItem('user_role', role);
        } catch (e) {
          localStorage.setItem('user_role', role);
        }

        setLoading(false);
        // route based on role
        if (role === 'Developer') navigate('/dev/dashboard');
        else navigate('/dashboard');
        return;
      }

      // non-200
      const payload = await res.json().catch(() => ({}));
      setError(payload?.message || 'Login failed.');
      setLoading(false);
    } catch (e) {
      // fallback for demo: allow local role without backend
      console.warn('Login request failed, falling back to demo mode.', e);
      localStorage.setItem('access_token', 'demo-token');
      const userObj = { email, role };
      localStorage.setItem('user', JSON.stringify(userObj));
      localStorage.setItem('user_role', role);
      setLoading(false);
      if (role === 'Developer') navigate('/dev/dashboard');
      else navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8">
        <h1 className="text-2xl font-semibold mb-2">Sign in</h1>
        <p className="text-sm text-slate-600 mb-4">Choose a role and sign in to continue as Business or Developer.</p>

        {error && <div className="text-sm text-red-600 mb-3">{error}</div>}

        <form onSubmit={submit} className="space-y-4">
          <label className="block text-sm">
            <span className="text-slate-700">Email</span>
            <input value={email} onChange={(e) => setEmail(e.target.value)} required type="email" className="mt-1 block w-full rounded-md border px-3 py-2" />
          </label>

          <label className="block text-sm">
            <span className="text-slate-700">Password</span>
            <input value={password} onChange={(e) => setPassword(e.target.value)} required type="password" className="mt-1 block w-full rounded-md border px-3 py-2" />
          </label>

          <label className="block text-sm">
            <span className="text-slate-700">Role</span>
            <select value={role} onChange={(e) => setRole(e.target.value as 'Business' | 'Developer')} className="mt-1 block w-full rounded-md border px-3 py-2">
              <option value="Business">Business</option>
              <option value="Developer">Developer</option>
            </select>
          </label>

          <div className="space-y-2">
            <button disabled={loading} type="submit" className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition">
              {loading ? 'Signing in…' : 'Sign in'}
            </button>

            <div className="text-center text-sm text-gray-500">For hackathon/demo, any credentials will work if backend is not available.</div>
          </div>
        </form>
      </div>
    </div>
  );
}
