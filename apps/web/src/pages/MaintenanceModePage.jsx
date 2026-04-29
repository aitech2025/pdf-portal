
import React from 'react';
import { Construction, Mail, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const MaintenanceModePage = ({ message }) => {
  const { logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const displayMessage = message || "Our platform is currently undergoing scheduled maintenance to bring you a faster, more reliable experience. We'll be back online shortly.";

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-background p-4 text-center relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-muted/50 via-background to-background" />
      <div className="absolute w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl opacity-50" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="max-w-xl w-full space-y-8 relative z-10 p-8 md:p-12 rounded-3xl border border-border/50 bg-card/50 backdrop-blur-xl shadow-2xl"
      >
        <div className="mx-auto w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mb-4 ring-8 ring-background">
          <Construction className="w-12 h-12 text-primary" />
        </div>

        <div className="space-y-4">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">We're upgrading EduPortal</h1>
          <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-lg mx-auto">
            {displayMessage}
          </p>
        </div>

        <div className="pt-8 flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Button size="lg" className="w-full sm:w-auto h-12 px-8" onClick={() => window.location.href = "mailto:admin@eduportal.com"}>
            <Mail className="w-5 h-5 mr-2" /> Contact Support
          </Button>
          {isAuthenticated && (
            <Button size="lg" variant="outline" className="w-full sm:w-auto h-12" onClick={handleLogout}>
              Sign out <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default MaintenanceModePage;
