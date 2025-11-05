import React from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";

interface PublicLayoutProps {
  children: React.ReactNode;
}

const PublicLayout = ({ children }: PublicLayoutProps) => {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-foreground">Artist Influence</h1>
        </div>
      </header>
      
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>

      <Toaster />
      <Sonner />
    </div>
  );
};

export default PublicLayout;