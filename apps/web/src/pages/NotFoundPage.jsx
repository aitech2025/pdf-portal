import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Compass, ArrowLeft, Home } from 'lucide-react';

const NotFoundPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="mx-auto w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
          <Compass className="w-10 h-10 text-primary" />
        </div>
        <div>
          <p className="text-sm font-semibold text-primary tracking-widest uppercase">Error 404</p>
          <h1 className="text-3xl md:text-4xl font-poppins font-bold mt-2 text-foreground">
            Page not found
          </h1>
          <p className="text-muted-foreground mt-3">
            We couldn't find{' '}
            <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
              {location.pathname}
            </code>
            . It may have been moved or deleted.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Go back
          </Button>
          <Link to="/">
            <Button>
              <Home className="w-4 h-4 mr-2" /> Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;
