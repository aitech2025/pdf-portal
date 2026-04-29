
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { LogIn, ArrowRight, BookOpen, Users, BarChart3 } from 'lucide-react';
import { motion } from 'framer-motion';

const HomePage = () => {
  const navigate = useNavigate();

  const handleSignIn = () => {
    navigate('/login');
  };

  const handleSignUp = () => {
    navigate('/signup');
  };

  const features = [
    {
      icon: BookOpen,
      title: 'Rich Content Library',
      description: 'Access thousands of educational PDFs and resources'
    },
    {
      icon: Users,
      title: 'School Management',
      description: 'Manage users, teams, and school-wide permissions'
    },
    {
      icon: BarChart3,
      title: 'Analytics & Insights',
      description: 'Track usage, downloads, and engagement metrics'
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="min-h-[90vh] flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 py-20 relative overflow-hidden">
        {/* Gradient Background */}
        <div className="absolute inset-0 bg-gradient-subtle pointer-events-none" />
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative z-10 max-w-4xl mx-auto text-center"
        >
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-6 border border-primary/20"
          >
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-sm font-medium">Welcome to EduPortal</span>
          </motion.div>

          {/* Main Heading */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-5xl sm:text-6xl lg:text-7xl font-poppins font-bold text-foreground mb-6 leading-tight"
            style={{ letterSpacing: '-0.02em' }}
          >
            Empower Education with{' '}
            <span className="bg-gradient-primary bg-clip-text text-transparent">
              Digital Resources
            </span>
          </motion.h1>

          {/* Subheading */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            Access comprehensive educational content, manage school resources, and track student progress all in one unified platform.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12"
          >
            <Button
              onClick={handleSignIn}
              size="lg"
              className="bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95 shadow-soft-lg transition-all duration-200 font-semibold px-8 py-6 text-base group"
              aria-label="Sign in to your account"
            >
              <LogIn className="w-5 h-5 mr-2 group-hover:translate-x-0.5 transition-transform" />
              Sign In
            </Button>

            <Button
              onClick={handleSignUp}
              size="lg"
              variant="outline"
              className="border-border hover:bg-muted active:scale-95 shadow-soft-md transition-all duration-200 font-semibold px-8 py-6 text-base group"
              aria-label="Create a new account"
            >
              Get Started
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </motion.div>

          {/* Trust Indicators */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="text-sm text-muted-foreground"
          >
            <p>Trusted by schools and educators worldwide</p>
          </motion.div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-card/50 border-t border-border">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-poppins font-bold text-foreground mb-4">
              Why Choose EduPortal?
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Everything you need to manage educational content and engage your community
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="p-8 rounded-2xl bg-background border border-border/50 shadow-soft-sm hover:shadow-soft-md hover:-translate-y-1 transition-all duration-300 group"
                >
                  <div className="w-12 h-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="max-w-3xl mx-auto text-center bg-gradient-primary rounded-2xl p-12 shadow-soft-lg"
        >
          <h2 className="text-3xl sm:text-4xl font-poppins font-bold text-primary-foreground mb-4">
            Ready to get started?
          </h2>
          <p className="text-lg text-primary-foreground/90 mb-8">
            Join thousands of educators and administrators using EduPortal to transform education.
          </p>
          <Button
            onClick={handleSignIn}
            size="lg"
            className="bg-primary-foreground text-primary hover:bg-primary-foreground/90 active:scale-95 shadow-soft-lg transition-all duration-200 font-semibold px-8 py-6 text-base"
            aria-label="Sign in to your account"
          >
            Sign In Now
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card/30 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="font-semibold text-foreground mb-4">Product</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Security</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-4">Company</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">About</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Careers</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-4">Resources</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">Documentation</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">API</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-4">Legal</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Terms of Service</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Contact</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border pt-8 flex flex-col sm:flex-row justify-between items-center text-sm text-muted-foreground">
            <p>&copy; 2026 EduPortal. All rights reserved.</p>
            <div className="flex gap-6 mt-4 sm:mt-0">
              <a href="#" className="hover:text-foreground transition-colors">Twitter</a>
              <a href="#" className="hover:text-foreground transition-colors">LinkedIn</a>
              <a href="#" className="hover:text-foreground transition-colors">GitHub</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
