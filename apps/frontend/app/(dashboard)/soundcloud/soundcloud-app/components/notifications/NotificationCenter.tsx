"use client"

import { useState } from 'react';
import { Bell, Check, CheckCheck, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNotifications } from '../../hooks/useNotifications';
import { formatDistanceToNow } from 'date-fns';

export const NotificationCenter = () => {
  const { notifications, loading, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [activeTab, setActiveTab] = useState('all');

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'submission':
        return '📝';
      case 'inquiry':
        return '💬';
      case 'queue':
        return '📋';
      case 'support':
        return '🎵';
      case 'success':
        return '✅';
      case 'warning':
        return '⚠️';
      case 'error':
        return '❌';
      default:
        return 'ℹ️';
    }
  };

  const getNotificationVariant = (type: string) => {
    switch (type) {
      case 'success':
        return 'default';
      case 'warning':
        return 'secondary';
      case 'error':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const filteredNotifications = notifications.filter(notification => {
    if (activeTab === 'unread') return !notification.read;
    if (activeTab === 'read') return notification.read;
    return true;
  });

  const handleNotificationAction = (notification: any) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
    
    if (notification.action_url) {
      window.open(notification.action_url, '_blank');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifications
            {unreadCount > 0 && (
              <Badge variant="secondary">{unreadCount} new</Badge>
            )}
          </CardTitle>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllAsRead}>
              <CheckCheck className="h-4 w-4 mr-1" />
              Mark all read
            </Button>
          )}
        </div>
        <CardDescription>
          Stay updated with your submissions, queues, and support activities
        </CardDescription>
      </CardHeader>
      
      <CardContent className="p-0">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 mx-4 mb-4">
            <TabsTrigger value="all">
              All ({notifications.length})
            </TabsTrigger>
            <TabsTrigger value="unread">
              Unread ({unreadCount})
            </TabsTrigger>
            <TabsTrigger value="read">
              Read ({notifications.length - unreadCount})
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value={activeTab} className="mt-0">
            {filteredNotifications.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">No notifications</p>
                <p className="text-sm">
                  {activeTab === 'unread' 
                    ? "You're all caught up!" 
                    : "Notifications will appear here when you receive them."
                  }
                </p>
              </div>
            ) : (
              <ScrollArea className="h-[400px]">
                <div className="space-y-2 p-4">
                  {filteredNotifications.map((notification) => (
                    <Card 
                      key={notification.id} 
                      className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                        !notification.read ? 'border-primary/50 bg-primary/5' : ''
                      }`}
                      onClick={() => handleNotificationAction(notification)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="text-xl">
                            {getNotificationIcon(notification.type)}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <p className={`font-medium ${!notification.read ? 'text-primary' : ''}`}>
                                  {notification.title}
                                </p>
                                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                  {notification.message}
                                </p>
                              </div>
                              
                              <div className="flex items-center gap-2 ml-2">
                                <Badge variant={getNotificationVariant(notification.type)}>
                                  {notification.type}
                                </Badge>
                                {!notification.read && (
                                  <Badge variant="secondary" className="h-2 w-2 rounded-full p-0" />
                                )}
                              </div>
                            </div>
                            
                            <div className="flex items-center justify-between mt-2">
                              <span className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                              </span>
                              
                              {notification.action_url && (
                                <Button variant="ghost" size="sm">
                                  <ExternalLink className="h-3 w-3 mr-1" />
                                  View
                                </Button>
                              )}
                              
                              {!notification.read && (
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    markAsRead(notification.id);
                                  }}
                                >
                                  <Check className="h-3 w-3 mr-1" />
                                  Mark read
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};