import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowRight, AtSign, Lock, ShieldCheck, Layers, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

const Feature = ({ icon: Icon, title, body }) => (
  <div className="flex items-start gap-3">
    <div className="mt-0.5 w-9 h-9 rounded-xl bg-white/10 text-white/90 flex items-center justify-center backdrop-blur shrink-0">
      <Icon className="w-4 h-4" />
    </div>
    <div>
      <p className="font-semibold text-white text-sm">{title}</p>
      <p className="text-white/70 text-xs mt-0.5 leading-relaxed">{body}</p>
    </div>
  </div>
);

const LoginPage = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const authData = await login(identifier, password);
      const role = authData.record.role;
      const platformRoles = ['admin', 'platform_admin', 'platform_viewer', 'moderator'];
      const schoolRoles = ['school', 'school_admin', 'school_viewer', 'teacher'];
      if (platformRoles.includes(role)) navigate('/admin');
      else if (schoolRoles.includes(role)) navigate('/school/dashboard');
      else navigate(from);
    } catch {
      setError('Invalid credentials. Please check your email / mobile and password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] relative bg-background lg:grid lg:grid-cols-2">
      {/* Decorative left panel (desktop only) */}
      <aside className="hidden lg:flex relative overflow-hidden bg-gradient-primary text-white p-12 flex-col justify-between">
        <div className="absolute inset-0 bg-grid opacity-[0.08]" aria-hidden />
        <div className="absolute -top-40 -right-40 w-[28rem] h-[28rem] rounded-full bg-white/10 blur-3xl" aria-hidden />
        <div className="absolute -bottom-32 -left-32 w-[26rem] h-[26rem] rounded-full bg-white/10 blur-3xl" aria-hidden />

        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center">
              <span className="text-white font-display font-bold text-lg">i</span>
            </div>
            <div>
              <p className="font-display font-bold text-xl tracking-tight">i-icon academy</p>
              <p className="text-white/70 text-xs">EduShare Platform</p>
            </div>
          </div>
        </div>

        <div className="relative z-10 max-w-md">
          <p className="text-white/70 uppercase text-xs font-semibold tracking-[0.18em] mb-3">
            Premium edutech platform
          </p>
          <h1 className="text-white text-[2.25rem] md:text-[2.75rem] font-display font-bold leading-tight">
            Distribute educational PDFs with enterprise-grade security.
          </h1>
          <p className="text-white/80 mt-5 text-base leading-relaxed">
            Category-driven access, watermarking, audit trails and real-time delivery — built for schools at scale.
          </p>

          <div className="grid grid-cols-1 gap-4 mt-10">
            <Feature
              icon={ShieldCheck}
              title="Tenant-isolated security"
              body="Per-school access grants, signed downloads, immutable audit logs."
            />
            <Feature
              icon={Layers}
              title="Category-driven library"
              body="Programs → categories → sub-categories with auto-generated codes."
            />
            <Feature
              icon={Sparkles}
              title="Modern UX, native apps"
              body="Responsive web + iOS + Android shells with offline-friendly delivery."
            />
          </div>
        </div>

        <p className="relative z-10 text-white/60 text-xs">© {new Date().getFullYear()} i-icon academy. All rights reserved.</p>
      </aside>

      {/* Form panel */}
      <div className="relative flex items-center justify-center min-h-[100dvh] lg:min-h-0 p-6 md:p-10">
        {/* Mobile gradient backdrop */}
        <div className="absolute inset-0 lg:hidden bg-gradient-subtle" aria-hidden />

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-[440px] relative z-10"
        >
          {/* Mobile brand */}
          <div className="flex flex-col items-center mb-8 lg:hidden">
            <div className="w-14 h-14 bg-gradient-primary rounded-2xl flex items-center justify-center shadow-glow-primary mb-4">
              <span className="text-white font-display font-bold text-xl">i</span>
            </div>
            <h2 className="text-2xl font-display font-bold tracking-tight text-foreground">
              Welcome back
            </h2>
            <p className="text-muted-foreground mt-1 text-sm">Sign in to your i-icon account</p>
          </div>

          <div className="hidden lg:block mb-8">
            <h2 className="text-3xl font-display font-bold tracking-tight text-foreground">
              Welcome back
            </h2>
            <p className="text-muted-foreground mt-2">Sign in to your i-icon academy account</p>
          </div>

          <Card className="border-border/60 shadow-soft-xl">
            <CardContent className="p-6 md:p-8">
              <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                  <div
                    role="alert"
                    className="p-3.5 text-sm font-medium text-destructive bg-destructive/10 rounded-xl border border-destructive/20 flex items-center gap-3"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-destructive" />
                    {error}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="identifier" className="text-foreground font-medium">
                    Email or Mobile Number
                  </Label>
                  <Input
                    id="identifier"
                    type="text"
                    inputMode="text"
                    autoComplete="username"
                    placeholder="name@iiconacademy.in or 9876543210"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    required
                    icon={AtSign}
                    className="h-12 text-base bg-background/60 border-border"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-foreground font-medium">
                      Password
                    </Label>
                    <Link
                      to="/forgot-password"
                      className="text-sm font-medium text-primary hover:text-primary/80 transition-base"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    icon={Lock}
                    className="h-12 text-base bg-background/60 border-border"
                  />
                </div>

                <div className="flex items-center space-x-3 py-1">
                  <Checkbox
                    id="remember"
                    className="rounded-sm border-muted-foreground data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                  />
                  <Label
                    htmlFor="remember"
                    className="font-normal text-muted-foreground cursor-pointer select-none"
                  >
                    Remember me for 30 days
                  </Label>
                </div>

                <Button
                  type="submit"
                  variant="gradient"
                  className="w-full h-12 text-base font-semibold mt-1 group"
                  isLoading={loading}
                >
                  Sign in
                  {!loading && (
                    <ArrowRight className="ml-1 h-5 w-5 transition-transform group-hover:translate-x-0.5" />
                  )}
                </Button>

                <p className="text-center text-sm text-muted-foreground">
                  Need to verify your account?{' '}
                  <Link to="/verify-email" className="text-primary hover:text-primary/80 font-medium">
                    Verify email
                  </Link>
                </p>
              </form>
            </CardContent>
          </Card>

          <p className="text-center text-muted-foreground mt-6 text-sm">
            Don't have an account?{' '}
            <Link
              to="/signup"
              className="text-foreground font-semibold hover:text-primary transition-base underline decoration-border underline-offset-4 hover:decoration-primary"
            >
              Request access
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default LoginPage;
