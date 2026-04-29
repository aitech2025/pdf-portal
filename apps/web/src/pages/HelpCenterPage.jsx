
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Book, PlayCircle, MessageCircle, ExternalLink } from 'lucide-react';
import PageTransition from '@/components/PageTransition.jsx';

const HelpCenterPage = () => {
  return (
    <PageTransition>
      <div className="relative rounded-[var(--radius-xl)] bg-gradient-primary overflow-hidden mb-10 p-12 shadow-soft-lg text-white text-center">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/always-grey.png')] opacity-10 mix-blend-overlay"></div>
        <div className="relative z-10 max-w-2xl mx-auto space-y-6">
          <h1 className="text-4xl font-poppins font-bold text-white">How can we help you?</h1>
          <p className="text-white/80 text-lg">Search our knowledge base or browse categories below.</p>
          <div className="relative max-w-xl mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input 
              placeholder="Search for articles, tutorials, FAQs..." 
              className="pl-12 h-14 text-lg bg-background text-foreground border-transparent rounded-full shadow-soft-xl"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto mb-12">
        <Card className="shadow-soft-sm hover:shadow-soft-lg transition-base border-border/50 cursor-pointer group bg-card text-center p-6">
          <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Book className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-xl font-poppins font-semibold mb-2">Knowledge Base</h3>
          <p className="text-muted-foreground text-sm">Detailed guides and documentation for all features.</p>
        </Card>
        
        <Card className="shadow-soft-sm hover:shadow-soft-lg transition-base border-border/50 cursor-pointer group bg-card text-center p-6">
          <div className="w-16 h-16 mx-auto rounded-full bg-secondary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <PlayCircle className="w-8 h-8 text-secondary" />
          </div>
          <h3 className="text-xl font-poppins font-semibold mb-2">Video Tutorials</h3>
          <p className="text-muted-foreground text-sm">Watch step-by-step video guides for common workflows.</p>
        </Card>

        <Card className="shadow-soft-sm hover:shadow-soft-lg transition-base border-border/50 cursor-pointer group bg-card text-center p-6">
          <div className="w-16 h-16 mx-auto rounded-full bg-accent/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <MessageCircle className="w-8 h-8 text-accent" />
          </div>
          <h3 className="text-xl font-poppins font-semibold mb-2">Contact Support</h3>
          <p className="text-muted-foreground text-sm">Can't find what you need? Reach out to our team.</p>
        </Card>
      </div>
    </PageTransition>
  );
};

export default HelpCenterPage;
