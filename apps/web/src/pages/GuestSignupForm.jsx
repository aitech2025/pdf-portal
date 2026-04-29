
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Zap, Building, User, Mail, Phone, CheckCircle2, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import pb from '@/lib/apiClient';
import { toast } from 'sonner';

const GuestSignupForm = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    schoolName: '',
    pointOfContactName: '',
    email: '',
    mobileNumber: ''
  });

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await pb.collection('onboardingRequests').create({
        ...formData,
        status: 'pending'
      }, { $autoCancel: false });
      
      setIsSubmitted(true);
      toast.success('Request submitted successfully!');
    } catch (err) {
      console.error('Error submitting request:', err);
      toast.error('Failed to submit request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center relative overflow-hidden bg-background py-12 px-4 sm:px-6">
      {/* Dribbble-quality Gradient Background */}
      <div className="absolute inset-0 bg-gradient-subtle pointer-events-none" />
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-40 mix-blend-soft-light">
        <svg viewBox="0 0 100vw 100vh" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          <filter id="noiseFilter">
            <feTurbulence type="fractalNoise" baseFrequency="0.6" numOctaves="3" stitchTiles="stitch"/>
          </filter>
          <rect width="100%" height="100%" filter="url(#noiseFilter)"/>
        </svg>
      </div>

      {/* Prominent Back Button positioned in the top left */}
      <div className="absolute top-4 left-4 sm:top-8 sm:left-8 z-50">
        <Button
          variant="ghost"
          onClick={() => navigate('/')}
          className="text-muted-foreground hover:text-foreground hover:bg-card/50 transition-all duration-200 group gap-2 rounded-full sm:rounded-[var(--radius-md)] px-3 sm:px-4 h-10 shadow-sm border border-transparent hover:border-border/50 bg-background/30 backdrop-blur-sm"
          aria-label="Go back to home page"
        >
          <ArrowLeft className="h-5 w-5 transition-transform group-hover:-translate-x-1" />
          <span className="hidden sm:inline-block font-medium">Back</span>
        </Button>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[480px] z-10"
      >
        {!isSubmitted ? (
          <>
            <div className="flex flex-col items-center mb-10 text-center">
              <div className="w-16 h-16 bg-gradient-primary rounded-2xl flex items-center justify-center shadow-soft-lg shadow-primary/30 mb-6">
                <Zap className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-3xl sm:text-4xl font-poppins font-bold tracking-tight text-foreground">
                Request Access
              </h1>
              <p className="text-muted-foreground mt-3 text-lg max-w-[360px]">
                Join EduPortal to manage your school's digital resources seamlessly.
              </p>
            </div>

            <Card className="border-border/50 shadow-soft-xl bg-card/80 backdrop-blur-2xl">
              <CardContent className="p-6 sm:p-8">
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="schoolName" className="text-foreground font-medium">School / Organization Name</Label>
                    <div className="relative">
                      <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <Input
                        id="schoolName"
                        type="text"
                        placeholder="e.g. Springfield High"
                        value={formData.schoolName}
                        onChange={handleChange}
                        required
                        className="pl-10 h-12 text-base text-foreground bg-background/50 border-border transition-colors focus-visible:ring-primary/20"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="pointOfContactName" className="text-foreground font-medium">Your Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <Input
                        id="pointOfContactName"
                        type="text"
                        placeholder="John Doe"
                        value={formData.pointOfContactName}
                        onChange={handleChange}
                        required
                        className="pl-10 h-12 text-base text-foreground bg-background/50 border-border transition-colors focus-visible:ring-primary/20"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-foreground font-medium">Work Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="john@school.edu"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        className="pl-10 h-12 text-base text-foreground bg-background/50 border-border transition-colors focus-visible:ring-primary/20"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="mobileNumber" className="text-foreground font-medium">Phone Number</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <Input
                        id="mobileNumber"
                        type="tel"
                        placeholder="(555) 123-4567"
                        value={formData.mobileNumber}
                        onChange={handleChange}
                        className="pl-10 h-12 text-base text-foreground bg-background/50 border-border transition-colors focus-visible:ring-primary/20"
                      />
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full h-12 text-base font-semibold mt-4 bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.98] transition-all shadow-soft-md group" 
                    disabled={loading}
                  >
                    {loading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                        <span>Submitting...</span>
                      </div>
                    ) : (
                      <>
                        Submit Request
                        <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
            
            <p className="text-center text-muted-foreground mt-8">
              Already have an account?{' '}
              <Link to="/login" className="text-foreground font-semibold hover:text-primary transition-base underline decoration-border underline-offset-4 hover:decoration-primary">
                Sign in
              </Link>
            </p>
          </>
        ) : (
          <Card className="border-border/50 shadow-soft-xl bg-card/80 backdrop-blur-2xl text-center py-12 px-6">
            <CardContent className="flex flex-col items-center p-0">
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", bounce: 0.5, duration: 0.6 }}
                className="w-20 h-20 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mb-6"
              >
                <CheckCircle2 className="w-10 h-10" />
              </motion.div>
              <h2 className="text-2xl font-bold text-foreground mb-3">Request Received!</h2>
              <p className="text-muted-foreground text-lg mb-8 max-w-[320px] mx-auto">
                Thank you for your interest. Our team will review your application and get back to you shortly at <span className="font-medium text-foreground">{formData.email}</span>.
              </p>
              <Button 
                onClick={() => navigate('/')} 
                variant="outline"
                className="h-12 px-8 text-base font-medium shadow-sm transition-all hover:bg-muted"
              >
                <ArrowLeft className="mr-2 h-5 w-5" />
                Return to Home
              </Button>
            </CardContent>
          </Card>
        )}
      </motion.div>
    </div>
  );
};

export default GuestSignupForm;
