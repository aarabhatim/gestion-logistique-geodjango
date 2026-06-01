import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Truck, Lock, User, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/contexts/I18nContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function Login() {
  const { login } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(form.username, form.password);
      if (user.role === 'ADMIN' || user.role === 'FONDATEUR') navigate('/');
      else if (user.role === 'CLIENT') navigate('/client');
      else if (user.role === 'TRANSPORTEUR') navigate('/chauffeur');
      else navigate('/');
    } catch (err) {
      setError(err.response?.data?.non_field_errors?.[0] || t('login_error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-4">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_hsl(var(--primary)/0.15),_transparent_50%)]" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-[500px] w-[500px] bg-[radial-gradient(circle,_hsl(var(--primary)/0.08),_transparent_70%)]" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary shadow-glow">
            <Truck className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight">
            <span className="text-gradient">DeliverMap</span>
          </h1>
          <p className="text-sm text-muted-foreground">{t('login_platform')}</p>
        </div>

        <Card className="border-border/80 shadow-card backdrop-blur">
          <CardHeader>
            <CardTitle>{t('login_title')}</CardTitle>
            <CardDescription>{t('login_tagline')}</CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div role="alert" aria-live="assertive" className="mb-4 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4" aria-label={t('login_title') || 'Connexion'} noValidate>
              <div className="space-y-2">
                <label htmlFor="login-username" className="flex items-center gap-2 text-sm font-medium">
                  <User className="h-4 w-4 text-muted-foreground" aria-hidden="true" /> {t('login_username')}
                </label>
                <Input
                  id="login-username"
                  value={form.username}
                  onChange={e => setForm({ ...form, username: e.target.value })}
                  placeholder={t('login_username_placeholder')}
                  required
                  aria-required="true"
                  aria-label={t('login_username')}
                  autoComplete="username"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="login-password" className="flex items-center gap-2 text-sm font-medium">
                  <Lock className="h-4 w-4 text-muted-foreground" aria-hidden="true" /> {t('login_password')}
                </label>
                <Input
                  id="login-password"
                  type="password"
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  placeholder="••••••••"
                  required
                  aria-required="true"
                  aria-label={t('login_password')}
                  autoComplete="current-password"
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading} aria-busy={loading}>
                {loading ? t('login_connecting') : t('login_btn')}
              </Button>
              <p className="mt-2 text-center text-sm">
                <Link to="/forgot-password" className="text-muted-foreground hover:text-primary underline-offset-4 hover:underline text-xs">
                  Mot de passe oublié ?
                </Link>
              </p>
            </form>
            <p className="mt-4 text-center text-sm text-muted-foreground">
              {t('login_no_account')}{' '}
              <Link to="/register" className="font-medium text-primary hover:underline">
                {t('login_create_account')}
              </Link>
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
