import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../integrations/supabase/client';

export interface UserPreference {
  id: string;
  userId: string;
  category: string;
  key: string;
  value: any;
  createdAt: string;
  updatedAt: string;
}

export interface SmartNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  userId: string;
  read: boolean;
  actionUrl?: string;
  metadata: Record<string, any>;
  createdAt: string;
  scheduledFor?: string;
  digestType?: 'none' | 'daily' | 'weekly';
}

export interface NotificationSchedule {
  userId: string;
  timeZone: string;
  preferredTime: string; // "HH:mm" format
  quietHours: {
    start: string;
    end: string;
  };
  enableDigest: boolean;
  digestFrequency: 'daily' | 'weekly';
}

export interface NotificationInsights {
  totalSent: number;
  readRate: number;
  clickRate: number;
  optimalSendTime: string;
  fatigueScore: number;
  preferredTypes: string[];
}

export const useSmartNotifications = () => {
  const [preferences, setPreferences] = useState<UserPreference[]>([]);
  const [notifications, setNotifications] = useState<SmartNotification[]>([]);
  const [schedule, setSchedule] = useState<NotificationSchedule | null>(null);
  const [insights, setInsights] = useState<NotificationInsights | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch user preferences
  const fetchPreferences = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error: fetchError } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (fetchError) throw fetchError;
      
      // Map database fields to interface properties
      const mappedPreferences: UserPreference[] = (data || []).map(pref => ({
        id: pref.id,
        userId: pref.user_id,
        category: pref.preference_category,
        key: pref.preference_key,
        value: pref.preference_value,
        createdAt: pref.created_at,
        updatedAt: pref.updated_at
      }));
      
      setPreferences(mappedPreferences);

      // Extract notification schedule from preferences
      const schedulePrefs = mappedPreferences.filter(p => p.category === 'notifications');
      if (schedulePrefs.length > 0) {
        const scheduleData = schedulePrefs.reduce((acc, pref) => ({
          ...acc,
          [pref.key]: pref.value
        }), {} as Record<string, any>);

        setSchedule({
          userId: user.id,
          timeZone: scheduleData.timeZone || 'UTC',
          preferredTime: scheduleData.preferredTime || '09:00',
          quietHours: scheduleData.quietHours || { start: '22:00', end: '07:00' },
          enableDigest: scheduleData.enableDigest || false,
          digestFrequency: scheduleData.digestFrequency || 'daily'
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch preferences');
    } finally {
      setLoading(false);
    }
  }, []);

  // Update user preference
  const updatePreference = useCallback(async (
    category: string,
    key: string,
    value: any
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: user.id,
          preference_category: category,
          preference_key: key,
          preference_value: value
        }, {
          onConflict: 'user_id,preference_category,preference_key'
        });

      if (error) throw error;
      await fetchPreferences();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update preference');
    }
  }, [fetchPreferences]);

  // Fetch smart notifications
  const fetchNotifications = useCallback(async (limit = 50) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      const smartNotifications: SmartNotification[] = (data || []).map(notification => {
        const metadata = notification.metadata as Record<string, any> || {};
        
        // Map notification type to smart notification type
        let mappedType: SmartNotification['type'] = 'info';
        if (['info', 'success', 'warning', 'error'].includes(notification.type)) {
          mappedType = notification.type as SmartNotification['type'];
        }
        
        return {
          id: notification.id,
          title: notification.title,
          message: notification.message,
          type: mappedType,
          priority: metadata.priority || 'medium',
          userId: notification.user_id,
          read: notification.read,
          actionUrl: notification.action_url,
          metadata,
          createdAt: notification.created_at,
          scheduledFor: metadata.scheduledFor,
          digestType: metadata.digestType || 'none'
        };
      });

      setNotifications(smartNotifications);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch notifications');
    }
  }, []);

  // Send smart notification
  const sendSmartNotification = useCallback(async (
    title: string,
    message: string,
    type: SmartNotification['type'] = 'info',
    priority: SmartNotification['priority'] = 'medium',
    actionUrl?: string,
    metadata: Record<string, any> = {}
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Determine optimal send time based on user preferences and insights
      const optimalTime = await calculateOptimalSendTime(user.id, priority);
      
      // Check if should be included in digest
      const shouldDigest = await shouldIncludeInDigest(priority, type);

      const notificationData = {
        user_id: user.id,
        title,
        message,
        type,
        action_url: actionUrl,
        metadata: {
          ...metadata,
          priority,
          scheduledFor: optimalTime,
          digestType: shouldDigest ? schedule?.digestFrequency || 'daily' : 'none',
          smartDelivery: true
        }
      };

      const { error } = await supabase.from('notifications').insert(notificationData);
      if (error) throw error;

      await fetchNotifications();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send smart notification');
    }
  }, [schedule?.digestFrequency, fetchNotifications]);

  // Calculate optimal send time
  const calculateOptimalSendTime = useCallback(async (
    userId: string,
    priority: SmartNotification['priority']
  ): Promise<string> => {
    try {
      // For urgent notifications, send immediately
      if (priority === 'urgent') {
        return new Date().toISOString();
      }

      // Check user's notification schedule
      if (schedule) {
        const now = new Date();
        const quietStart = new Date(`${now.toDateString()} ${schedule.quietHours.start}`);
        const quietEnd = new Date(`${now.toDateString()} ${schedule.quietHours.end}`);
        
        // If we're in quiet hours, schedule for after quiet hours
        if (now >= quietStart || now <= quietEnd) {
          const nextSendTime = new Date(`${now.toDateString()} ${schedule.preferredTime}`);
          if (nextSendTime <= now) {
            nextSendTime.setDate(nextSendTime.getDate() + 1);
          }
          return nextSendTime.toISOString();
        }
      }

      // Default to preferred time or immediate for high priority
      if (priority === 'high') {
        return new Date().toISOString();
      }

      // Medium/low priority - use preferred time
      const nextPreferredTime = new Date();
      if (schedule?.preferredTime) {
        const [hours, minutes] = schedule.preferredTime.split(':');
        nextPreferredTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        
        if (nextPreferredTime <= new Date()) {
          nextPreferredTime.setDate(nextPreferredTime.getDate() + 1);
        }
      }

      return nextPreferredTime.toISOString();
    } catch (err) {
      // Fallback to immediate delivery
      return new Date().toISOString();
    }
  }, [schedule]);

  // Check if notification should be included in digest
  const shouldIncludeInDigest = useCallback(async (
    priority: SmartNotification['priority'],
    type: SmartNotification['type']
  ): Promise<boolean> => {
    // Never digest urgent or high priority notifications
    if (priority === 'urgent' || priority === 'high') {
      return false;
    }

    // Don't digest error notifications
    if (type === 'error') {
      return false;
    }

    // Include in digest if user has it enabled
    return schedule?.enableDigest || false;
  }, [schedule?.enableDigest]);

  // Get notification insights
  const getNotificationInsights = useCallback(async (days = 30): Promise<NotificationInsights | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', startDate);

      if (error) throw error;

      const totalSent = data.length;
      const readCount = data.filter(n => n.read).length;
      const clickCount = data.filter(n => {
        const metadata = n.metadata as Record<string, any> || {};
        return metadata.clicked === true;
      }).length;

      // Calculate optimal send time based on read rates
      const hourlyStats = data.reduce((acc, notification) => {
        const hour = new Date(notification.created_at).getHours();
        if (!acc[hour]) acc[hour] = { sent: 0, read: 0 };
        acc[hour].sent++;
        if (notification.read) acc[hour].read++;
        return acc;
      }, {} as Record<number, { sent: number; read: number }>);

      const optimalHour = Object.entries(hourlyStats)
        .map(([hour, stats]) => ({
          hour: parseInt(hour),
          readRate: stats.read / stats.sent
        }))
        .sort((a, b) => b.readRate - a.readRate)[0]?.hour || 9;

      // Calculate fatigue score (0-100, higher = more fatigued)
      const recentNotifications = data.filter(n => 
        new Date(n.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      );
      const fatigueScore = Math.min(100, recentNotifications.length * 2);

      // Get preferred notification types
      const typeStats = data.reduce((acc, notification) => {
        if (!acc[notification.type]) acc[notification.type] = { sent: 0, read: 0 };
        acc[notification.type].sent++;
        if (notification.read) acc[notification.type].read++;
        return acc;
      }, {} as Record<string, { sent: number; read: number }>);

      const preferredTypes = Object.entries(typeStats)
        .map(([type, stats]) => ({
          type,
          readRate: stats.read / stats.sent
        }))
        .sort((a, b) => b.readRate - a.readRate)
        .map(item => item.type);

      const insightsData: NotificationInsights = {
        totalSent,
        readRate: totalSent > 0 ? (readCount / totalSent) * 100 : 0,
        clickRate: totalSent > 0 ? (clickCount / totalSent) * 100 : 0,
        optimalSendTime: `${optimalHour.toString().padStart(2, '0')}:00`,
        fatigueScore,
        preferredTypes
      };

      setInsights(insightsData);
      return insightsData;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get notification insights');
      return null;
    }
  }, []);

  // Update notification schedule
  const updateNotificationSchedule = useCallback(async (newSchedule: Partial<NotificationSchedule>) => {
    try {
      const updates = Object.entries(newSchedule);
      
      for (const [key, value] of updates) {
        await updatePreference('notifications', key, value);
      }

      // Update local state
      setSchedule(prev => prev ? { ...prev, ...newSchedule } : null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update notification schedule');
    }
  }, [updatePreference]);

  useEffect(() => {
    fetchPreferences();
    fetchNotifications();
    getNotificationInsights();
  }, [fetchPreferences, fetchNotifications, getNotificationInsights]);

  return {
    preferences,
    notifications,
    schedule,
    insights,
    loading,
    error,
    updatePreference,
    fetchNotifications,
    sendSmartNotification,
    getNotificationInsights,
    updateNotificationSchedule
  };
};