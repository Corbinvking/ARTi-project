"use client"

import { useState, useRef, useEffect } from "react";
import { HelpCircle, X, ChevronRight, ChevronLeft } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { useAuth } from "../hooks/useAuth";

interface TooltipData {
  id: string;
  title: string;
  content: string;
  position: 'top' | 'bottom' | 'left' | 'right';
  trigger: 'hover' | 'click';
}

interface TourStep {
  target: string;
  title: string;
  content: string;
  position: 'top' | 'bottom' | 'left' | 'right';
}

const ROLE_TOURS: Record<string, TourStep[]> = {
  admin: [
    {
      target: '[data-tour="dashboard"]',
      title: 'Welcome to the Admin Dashboard',
      content: 'This is your main control center. Here you can monitor all campaigns, manage vendors, and track performance.',
      position: 'bottom'
    },
    {
      target: '[data-tour="quick-actions"]',
      title: 'Quick Actions',
      content: 'Access frequently used actions like creating campaigns, managing clients, and viewing reports.',
      position: 'bottom'
    },
    {
      target: '[data-tour="search"]',
      title: 'Global Search',
      content: 'Search across campaigns, vendors, clients, and playlists. Use Ctrl+K as a shortcut.',
      position: 'bottom'
    },
    {
      target: '[data-tour="navigation"]',
      title: 'Navigation Menu',
      content: 'Navigate between different sections. Each has keyboard shortcuts shown in the settings menu.',
      position: 'bottom'
    }
  ],
  vendor: [
    {
      target: '[data-tour="vendor-portal"]',
      title: 'Welcome to the Vendor Portal',
      content: 'Manage your playlists, respond to campaign requests, and track your earnings.',
      position: 'bottom'
    },
    {
      target: '[data-tour="playlist-management"]',
      title: 'Playlist Management',
      content: 'Add and edit your playlists here. Make sure to keep your playlist data up to date for better campaign matches.',
      position: 'top'
    },
    {
      target: '[data-tour="campaign-requests"]',
      title: 'Campaign Requests',
      content: 'Review and respond to campaign participation requests. You can accept or decline based on your availability.',
      position: 'top'
    }
  ],
  salesperson: [
    {
      target: '[data-tour="salesperson-dashboard"]',
      title: 'Welcome to the Salesperson Dashboard',
      content: 'Track your commissions, submitted campaigns, and performance metrics.',
      position: 'bottom'
    },
    {
      target: '[data-tour="submit-campaign"]',
      title: 'Submit Campaign',
      content: 'Use this button to submit new campaigns for client approval and processing.',
      position: 'left'
    },
    {
      target: '[data-tour="commission-tracking"]',
      title: 'Commission Tracking',
      content: 'Monitor your earnings and commission status for all submitted campaigns.',
      position: 'top'
    }
  ]
};

export function HelpTooltip({ 
  content, 
  title, 
  children, 
  position = 'top',
  trigger = 'hover' 
}: {
  content: string;
  title?: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  trigger?: 'hover' | 'click';
}) {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const updatePosition = () => {
    if (!triggerRef.current || !tooltipRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const spacing = 8;

    let x = 0, y = 0;

    switch (position) {
      case 'top':
        x = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2;
        y = triggerRect.top - tooltipRect.height - spacing;
        break;
      case 'bottom':
        x = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2;
        y = triggerRect.bottom + spacing;
        break;
      case 'left':
        x = triggerRect.left - tooltipRect.width - spacing;
        y = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2;
        break;
      case 'right':
        x = triggerRect.right + spacing;
        y = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2;
        break;
    }

    // Keep tooltip within viewport
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    x = Math.max(8, Math.min(x, viewportWidth - tooltipRect.width - 8));
    y = Math.max(8, Math.min(y, viewportHeight - tooltipRect.height - 8));

    setCoords({ x, y });
  };

  useEffect(() => {
    if (isVisible) {
      updatePosition();
      window.addEventListener('scroll', updatePosition);
      window.addEventListener('resize', updatePosition);
      
      return () => {
        window.removeEventListener('scroll', updatePosition);
        window.removeEventListener('resize', updatePosition);
      };
    }
  }, [isVisible]);

  const handleMouseEnter = () => {
    if (trigger === 'hover') setIsVisible(true);
  };

  const handleMouseLeave = () => {
    if (trigger === 'hover') setIsVisible(false);
  };

  const handleClick = () => {
    if (trigger === 'click') setIsVisible(!isVisible);
  };

  return (
    <>
      <div
        ref={triggerRef}
        className="relative inline-block"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
      >
        {children}
      </div>

      {isVisible && (
        <>
          <div 
            className="fixed inset-0 z-40"
            onClick={() => trigger === 'click' && setIsVisible(false)}
          />
          <div
            ref={tooltipRef}
            className="fixed z-50 max-w-xs"
            style={{ left: coords.x, top: coords.y }}
          >
            <Card className="shadow-lg border bg-popover">
              <CardContent className="p-3">
                {title && (
                  <h4 className="font-medium text-sm mb-1">{title}</h4>
                )}
                <p className="text-xs text-muted-foreground">{content}</p>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </>
  );
}

export function GuidedTour() {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [hasSeenTour, setHasSeenTour] = useState(false);
  const { currentRole } = useAuth();

  const tour = currentRole ? ROLE_TOURS[currentRole] || [] : [];

  useEffect(() => {
    // Check if user has seen the tour for this role
    const tourKey = `tour_seen_${currentRole}`;
    const seen = localStorage.getItem(tourKey);
    
    if (!seen && tour.length > 0) {
      // Show tour after a short delay to let the page load
      setTimeout(() => {
        setIsActive(true);
      }, 1000);
    }
    
    setHasSeenTour(!!seen);
  }, [currentRole, tour.length]);

  const nextStep = () => {
    if (currentStep < tour.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      finishTour();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const finishTour = () => {
    setIsActive(false);
    setCurrentStep(0);
    if (currentRole) {
      localStorage.setItem(`tour_seen_${currentRole}`, 'true');
      setHasSeenTour(true);
    }
  };

  const restartTour = () => {
    setCurrentStep(0);
    setIsActive(true);
  };

  const currentTourStep = tour[currentStep];

  if (!currentTourStep) return null;

  return (
    <>
      {/* Tour restart button */}
      {hasSeenTour && !isActive && (
        <div className="fixed bottom-4 right-4 z-40">
          <Button
            onClick={restartTour}
            variant="outline"
            size="sm"
            className="shadow-lg"
          >
            <HelpCircle className="h-4 w-4 mr-2" />
            Help Tour
          </Button>
        </div>
      )}

      {/* Tour overlay */}
      {isActive && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" />
          
          {/* Tour step card */}
          <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-md mx-4">
            <Card className="shadow-xl">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <Badge variant="outline">
                    Step {currentStep + 1} of {tour.length}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={finishTour}
                    className="h-6 w-6 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <CardTitle className="text-lg">{currentTourStep.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <CardDescription>{currentTourStep.content}</CardDescription>
                
                <div className="flex justify-between">
                  <Button
                    variant="outline"
                    onClick={prevStep}
                    disabled={currentStep === 0}
                    size="sm"
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      onClick={finishTour}
                      size="sm"
                    >
                      Skip Tour
                    </Button>
                    <Button
                      onClick={nextStep}
                      size="sm"
                    >
                      {currentStep === tour.length - 1 ? 'Finish' : 'Next'}
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Highlight target element */}
          <style>{`
            ${currentTourStep.target} {
              position: relative;
              z-index: 41;
              box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.5);
              border-radius: 4px;
            }
          `}</style>
        </>
      )}
    </>
  );
}









