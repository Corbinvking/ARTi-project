"use client"

import { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "../integrations/supabase/client";
import { useToast } from "../hooks/use-toast";

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: "info" | "warning" | "error" | "success";
  role?: string;
  isRead: boolean;
  createdAt: Date;
  actionUrl?: string;
}

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { currentRole } = useAuth();
  const { toast } = useToast();

  // Generate role-based notifications
  useEffect(() => {
    const generateNotifications = () => {
      const baseNotifications: Notification[] = [];

      if (currentRole === 'admin' || currentRole === 'manager') {
        baseNotifications.push(
          {
            id: '1',
            title: 'Weekly Performance Report',
            message: 'Campaign performance summary for this week is ready',
            type: 'info',
            role: 'manager',
            isRead: false,
            createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
            actionUrl: '/reports'
          },
          {
            id: '2',
            title: 'Payment Processing Complete',
            message: '15 vendor payments have been processed successfully',
            type: 'success',
            role: 'admin',
            isRead: false,
            createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
            actionUrl: '/payments'
          }
        );
      }

      if (currentRole === 'vendor') {
        baseNotifications.push(
          {
            id: '3',
            title: 'New Campaign Request',
            message: 'You have 2 new campaign requests to review',
            type: 'info',
            role: 'vendor',
            isRead: false,
            createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
            actionUrl: '/vendor/requests'
          },
          {
            id: '4',
            title: 'Payment Received',
            message: 'Payment of $250.00 has been processed',
            type: 'success',
            role: 'vendor',
            isRead: true,
            createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
            actionUrl: '/vendor/payments'
          }
        );
      }

      if (currentRole === 'salesperson') {
        baseNotifications.push(
          {
            id: '5',
            title: 'Campaign Approved',
            message: 'Your submitted campaign "Summer Vibes 2024" has been approved',
            type: 'success',
            role: 'salesperson',
            isRead: false,
            createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000)
          }
        );
      }

      setNotifications(baseNotifications);
      setUnreadCount(baseNotifications.filter(n => !n.isRead).length);
    };

    generateNotifications();
  }, [currentRole]);

  const markAsRead = (notificationId: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    setUnreadCount(0);
  };

  const addNotification = (notification: Omit<Notification, "id" | "createdAt" | "isRead">) => {
    const newNotification: Notification = {
      ...notification,
      id: Math.random().toString(36).substr(2, 9),
      createdAt: new Date(),
      isRead: false
    };
    
    setNotifications(prev => [newNotification, ...prev]);
    setUnreadCount(prev => prev + 1);
    
    // Show toast for new notification
    toast({
      title: notification.title,
      description: notification.message,
      variant: notification.type === 'error' ? 'destructive' : 'default'
    });
  };

  return {
    notifications: notifications.filter(n => !n.role || n.role === currentRole),
    unreadCount,
    markAsRead,
    markAllAsRead,
    addNotification
  };
};








