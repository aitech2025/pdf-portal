import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { apiFetch } from '@/lib/apiClient';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [debugToken, setDebugToken] = useState('');
  const [error, setError] = useState('');

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    setDebugToken('');
    try {
      const data = await apiFetch('/auth/forgot-password', 'POST', { email });
      setMessage(data.message || 'If your account exists, a reset email has been sent.');
      if (data.debugToken) {
        setDebugToken(data.debugToken);
      }
    } catch (err) {
      setError(err.message || 'Failed to submit request.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <h1 className="text-2xl font-semibold mb-1">Forgot password</h1>
          <p className="text-sm text-muted-foreground mb-6">Enter your email to receive reset instructions.</p>
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            {message && <p className="text-sm text-emerald-600">{message}</p>}
            {debugToken && <p className="text-xs text-muted-foreground break-all">Debug token: {debugToken}</p>}
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" isLoading={loading}>Send reset instructions</Button>
            <Link className="text-sm text-primary hover:underline block text-center" to="/login">Back to login</Link>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ForgotPasswordPage;
