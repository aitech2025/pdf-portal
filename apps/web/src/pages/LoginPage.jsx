
import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Zap, ArrowRight, Mail, Lock } from 'lucide-react';
import { motion } from 'framer-motion';

const LoginPage = () => {
  const [email, setEmail] = useState('');
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
      const authData = await login(email, password);
      const role = authData.record.role;
      const platformRoles = ['admin', 'platform_admin', 'platform_viewer', 'moderator'];
      const schoolRoles = ['school', 'school_admin', 'school_viewer', 'teacher'];
      if (platformRoles.includes(role)) {
        navigate('/admin');
      } else if (schoolRoles.includes(role)) {
        navigate('/school/dashboard');
      } else {
        navigate(from);
      }
    } catch (err) {
      setError('Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center relative overflow-hidden bg-background">
      {/* Dribbble-quality Gradient Background */}
      <div className="absolute inset-0 bg-gradient-subtle" />
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-40 mix-blend-soft-light">
        <svg viewBox="0 0 100vw 100vh" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          <filter id="noiseFilter">
            <feTurbulence type="fractalNoise" baseFrequency="0.6" numOctaves="3" stitchTiles="stitch" />
          </filter>
          <rect width="100%" height="100%" filter="url(#noiseFilter)" />
        </svg>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[440px] px-6 z-10"
      >
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 bg-gradient-primary rounded-2xl flex items-center justify-center shadow-soft-lg shadow-primary/30 mb-6">
            <Zap className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-[2.25rem] font-poppins font-bold tracking-tight text-foreground text-center">Welcome back</h2>
          <p className="text-muted-foreground mt-2 text-center text-lg">Sign in to your EduPortal account</p>
        </div>

        <Card className="border-none shadow-soft-xl bg-card/80 backdrop-blur-2xl">
          <CardContent className="p-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="p-4 text-sm font-medium text-destructive bg-destructive/10 rounded-[var(--radius-md)] border border-destructive/20 flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-destructive" />
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground font-medium">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@school.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  icon={Mail}
                  className="h-12 text-base text-foreground bg-background/50 border-border"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-foreground font-medium">Password</Label>
                  <a href="#" className="text-sm font-medium text-primary hover:text-primary/80 transition-base">
                    Forgot password?
                  </a>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  icon={Lock}
                  className="h-12 text-base text-foreground bg-background/50 border-border"
                />
              </div>

              <div className="flex items-center space-x-3 py-2">
                <Checkbox id="remember" className="rounded-sm border-muted-foreground data-[state=checked]:bg-primary data-[state=checked]:border-primary" />
                <Label htmlFor="remember" className="font-normal text-muted-foreground cursor-pointer select-none">
                  Remember me for 30 days
                </Label>
              </div>

              <Button
                type="submit"
                variant="gradient"
                className="w-full h-12 text-base font-semibold mt-2 group"
                isLoading={loading}
              >
                Sign In
                {!loading && <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-muted-foreground mt-8">
          Don't have an account?{' '}
          <Link to="/signup" className="text-foreground font-semibold hover:text-primary transition-base underline decoration-border underline-offset-4 hover:decoration-primary">
            Request access
          </Link>
        </p>
      </motion.div>
    </div>
  );
};

export default LoginPage;
