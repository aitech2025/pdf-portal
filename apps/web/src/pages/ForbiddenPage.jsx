import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ShieldOff, ArrowLeft, Home } from 'lucide-react';

const ForbiddenPage = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="mx-auto w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center">
          <ShieldOff className="w-10 h-10 text-destructive" />
        </div>
        <div>
          <p className="text-sm font-semibold text-destructive tracking-widest uppercase">Error 403</p>
          <h1 className="text-3xl md:text-4xl font-poppins font-bold mt-2 text-foreground">Access denied</h1>
          <p className="text-muted-foreground mt-3">
            You don't have permission to view this page. If you think this is a mistake, contact your
            administrator.
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

export default ForbiddenPage;
