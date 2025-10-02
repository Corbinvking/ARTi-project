"use client"

import { useState, useEffect } from "react";
import { supabase } from "../integrations/supabase/client";
import { useAuth } from "../hooks/useAuth";
import { toast } from "./ui/use-toast";
import { Bell, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { ScrollArea } from "./ui/scroll-area";

interface Notification {
  id: string;
  type: 'campaign_status' | 'payment' | 'request' | 'system';
  title: string;
  message: string;
  data?: any;
  read: boolean;
  created_at: string;
}

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { user, currentRole } = useAuth();

  useEffect(() => {
    if (!user) return;

    // Set up real-time listening for relevant changes based on user role
    const channels: any[] = [];

    if (currentRole === 'vendor') {
      // Listen for campaign vendor requests
      const requestsChannel = supabase
        .channel('vendor-notifications')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'campaign_vendor_requests'
        }, (payload) => {
          // Check if this request is for the current vendor
          checkAndAddNotification({
            type: 'request',
            title: 'New Campaign Request',
            message: 'You have received a new campaign participation request',
            data: payload.new
          });
        })
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'payment_history'
        }, (payload) => {
          // Check if this payment is for the current vendor
          checkAndAddNotification({
            type: 'payment',
            title: 'Payment Processed',
            message: `Payment of $${payload.new.amount} has been processed`,
            data: payload.new
          });
        })
        .subscribe();

      channels.push(requestsChannel);
    }

    if (currentRole === 'admin' || currentRole === 'manager') {
      // Listen for campaign submissions
      const campaignsChannel = supabase
        .channel('admin-notifications')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'campaigns'
        }, (payload) => {
          if (payload.new.pending_operator_review) {
            addNotification({
              type: 'campaign_status',
              title: 'New Campaign Submission',
              message: `Campaign "${payload.new.name}" submitted for review`,
              data: payload.new
            });
          }
        })
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'campaigns'
        }, (payload) => {
          if (payload.new.status !== payload.old.status) {
            addNotification({
              type: 'campaign_status',
              title: 'Campaign Status Updated',
              message: `Campaign "${payload.new.name}" status changed to ${payload.new.status}`,
              data: payload.new
            });
          }
        })
        .subscribe();

      channels.push(campaignsChannel);
    }

    if (currentRole === 'salesperson') {
      // Listen for campaign status updates for their campaigns
      const salespersonChannel = supabase
        .channel('salesperson-notifications')
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'campaigns',
          filter: `salesperson=eq.${user.email}`
        }, (payload) => {
          if (payload.new.status !== payload.old.status) {
            addNotification({
              type: 'campaign_status',
              title: 'Your Campaign Updated',
              message: `Campaign "${payload.new.name}" status changed to ${payload.new.status}`,
              data: payload.new
            });
          }
        })
        .subscribe();

      channels.push(salespersonChannel);
    }

    return () => {
      channels.forEach(channel => supabase.removeChannel(channel));
    };
  }, [user, currentRole]);

  const checkAndAddNotification = async (notification: Omit<Notification, 'id' | 'read' | 'created_at'>) => {
    // Add additional checks here based on user permissions
    addNotification(notification);
  };

  const addNotification = (notification: Omit<Notification, 'id' | 'read' | 'created_at'>) => {
    const newNotification: Notification = {
      ...notification,
      id: crypto.randomUUID(),
      read: false,
      created_at: new Date().toISOString()
    };

    setNotifications(prev => [newNotification, ...prev.slice(0, 49)]); // Keep only 50 notifications
    setUnreadCount(prev => prev + 1);

    // Show toast for immediate feedback
    toast({
      title: notification.title,
      description: notification.message,
    });
  };

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const clearNotification = (id: string) => {
    const notification = notifications.find(n => n.id === id);
    if (notification && !notification.read) {
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotification,
    addNotification
  };
};

export function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearNotification } = useNotifications();

  const getNotificationIcon = (type: Notification['type']) => {
    const baseClasses = "w-4 h-4 mr-2";
    switch (type) {
      case 'campaign_status': return <span className={`${baseClasses} text-blue-500`}>📊</span>;
      case 'payment': return <span className={`${baseClasses} text-green-500`}>💰</span>;
      case 'request': return <span className={`${baseClasses} text-orange-500`}>📝</span>;
      case 'system': return <span className={`${baseClasses} text-gray-500`}>⚙️</span>;
      default: return <span className={`${baseClasses} text-gray-500`}>🔔</span>;
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="relative"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <Badge 
            variant="destructive" 
            className="absolute -top-1 -right-1 px-1 min-w-[1.2rem] h-5 flex items-center justify-center text-xs"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </Button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          <Card className="absolute right-0 top-full mt-2 w-80 z-50 shadow-lg">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Notifications</CardTitle>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={markAllAsRead}
                      className="text-xs h-6 px-2"
                    >
                      Mark all read
                    </Button>
                  )}
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setIsOpen(false)}
                    className="h-6 w-6 p-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {notifications.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No notifications yet
                </div>
              ) : (
                <ScrollArea className="h-80">
                  <div className="space-y-1 p-3">
                    {notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`flex items-start gap-2 p-3 rounded-lg cursor-pointer transition-colors ${
                          notification.read 
                            ? 'bg-muted/30 hover:bg-muted/50' 
                            : 'bg-primary/10 hover:bg-primary/20 border border-primary/20'
                        }`}
                        onClick={() => !notification.read && markAsRead(notification.id)}
                      >
                        {getNotificationIcon(notification.type)}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <p className="text-sm font-medium text-foreground truncate">
                              {notification.title}
                            </p>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                clearNotification(notification.id);
                              }}
                              className="h-4 w-4 p-0 opacity-0 group-hover:opacity-100"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {notification.message}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatTime(notification.created_at)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}








