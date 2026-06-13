import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowRight, AtSign, Lock } from 'lucide-react';
import { motion } from 'framer-motion';

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
          <div className="inline-flex items-center bg-white rounded-2xl px-6 py-4 shadow-xl">
            <img
              src="/logo-mark.png"
              alt="i-iCON Academy"
              className="h-20 w-auto object-contain"
            />
          </div>
        </div>

        <div className="relative z-10 max-w-md">
          <p className="text-white/70 uppercase text-xs font-semibold tracking-[0.18em] mb-3">
            About I-ICON Academy
          </p>
          <h1 className="text-white text-[2rem] md:text-[2.5rem] font-display font-bold leading-tight">
            A trusted pioneer in IIT Foundation &amp; JEE preparation.
          </h1>
          <p className="text-white/85 mt-6 text-base leading-relaxed">
            Headquartered in Hyderabad, I-ICON Academy has been a trusted pioneer in delivering a
            systematic, integrated IIT Foundation and JEE preparation curriculum.
          </p>
          <p className="text-white/75 mt-4 text-base leading-relaxed">
            For over a decade, we have partnered with students, parents, and premier school
            institutions across India to bridge the gap between school education and competitive
            excellence.
          </p>
          <div className="mt-8 p-4 rounded-2xl bg-white/10 backdrop-blur border border-white/15">
            <p className="text-white/90 text-sm leading-relaxed">
              Log in to access your digital learning portal, track exam progress, and unlock your
              academic potential.
            </p>
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
            <div className="inline-flex items-center bg-white rounded-2xl px-6 py-4 shadow-soft-xl mb-5">
              <img
                src="/logo-mark.png"
                alt="i-iCON Academy"
                className="h-28 w-auto object-contain"
              />
            </div>
            <p className="text-muted-foreground text-sm text-center">Sign in to your learning portal</p>
          </div>

          <div className="hidden lg:block mb-8">
            <h2 className="text-3xl font-display font-bold tracking-tight text-foreground">
              Welcome back
            </h2>
            <p className="text-muted-foreground mt-2">Sign in to your i-iCON Academy portal</p>
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
