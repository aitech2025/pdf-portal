import React, { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { apiFetch } from '@/lib/apiClient';

const VerifyEmailPage = () => {
  const [params] = useSearchParams();
  const initialToken = useMemo(() => params.get('token') || '', [params]);
  const [token, setToken] = useState(initialToken);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const data = await apiFetch('/auth/verify-email', 'POST', { token });
      setMessage(data.message || 'Email verified successfully.');
    } catch (err) {
      setError(err.message || 'Verification failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <h1 className="text-2xl font-semibold mb-1">Verify email</h1>
          <p className="text-sm text-muted-foreground mb-6">Complete account verification to access the platform.</p>
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label htmlFor="token">Verification token</Label>
              <Input id="token" value={token} onChange={(e) => setToken(e.target.value)} required />
            </div>
            {message && <p className="text-sm text-emerald-600">{message}</p>}
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" isLoading={loading}>Verify account</Button>
            <Link className="text-sm text-primary hover:underline block text-center" to="/login">Back to login</Link>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default VerifyEmailPage;
