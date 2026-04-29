
import React from 'react';
import { AlertCircle, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { useNavigate } from 'react-router-dom';

const DeactivatedSchoolModal = ({ message }) => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm px-4">
      <div className="max-w-md w-full bg-card rounded-2xl shadow-xl border p-8 text-center space-y-6 animate-in fade-in zoom-in duration-300">
        <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-6">
          <AlertCircle className="w-8 h-8 text-destructive" />
        </div>
        
        <h2 className="text-2xl font-bold tracking-tight">Access Suspended</h2>
        
        <p className="text-muted-foreground">
          Your institution's profile has been deactivated. You currently do not have access to the educational content portal.
        </p>

        {message && (
          <div className="bg-muted p-4 rounded-lg text-sm text-left border border-border/50">
            <span className="font-semibold block mb-1">Reason provided:</span>
            {message}
          </div>
        )}

        <div className="pt-4 space-y-3">
          <Button className="w-full" variant="default" onClick={() => window.location.href = "mailto:admin@eduportal.com"}>
            Contact Administrator
          </Button>
          <Button className="w-full" variant="outline" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DeactivatedSchoolModal;
