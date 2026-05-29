import { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

const ERROR_MESSAGES = {
  no_account:      'No operator account is linked to this Google address.',
  oauth_cancelled: 'Google sign-in was cancelled.',
  oauth_failed:    'Google sign-in failed. Please try again.',
};

export default function OAuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate       = useNavigate();

  useEffect(() => {
    const d     = searchParams.get('d');
    const error = searchParams.get('error');

    if (error) {
      const msg = ERROR_MESSAGES[error] || 'Sign-in failed.';
      navigate(`/login?oauthError=${encodeURIComponent(msg)}`, { replace: true });
      return;
    }

    if (d) {
      try {
        const data = JSON.parse(atob(d.replace(/-/g, '+').replace(/_/g, '/')));
        localStorage.setItem('admin_user', JSON.stringify(data.admin));
        navigate('/', { replace: true });
      } catch {
        navigate('/login?oauthError=Sign-in+failed.', { replace: true });
      }
      return;
    }

    navigate('/login', { replace: true });
  }, []);

  return (
    <div
      className="flex min-h-screen items-center justify-center"
      style={{ background: 'var(--paper-2)' }}
    >
      <Loader2 size={22} className="animate-spin" style={{ color: 'var(--mute)' }} />
    </div>
  );
}
