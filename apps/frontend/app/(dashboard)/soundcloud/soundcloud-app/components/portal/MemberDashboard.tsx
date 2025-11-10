import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { useAuth } from '../../contexts/AuthContext';
import { useMemberSubmissions } from '../../hooks/useMemberSubmissions';
import { motion } from 'framer-motion';
import { ScrollReveal } from '../ui/scroll-reveal';
import { InteractiveCard } from '../ui/interactive-card';
import { ProgressRing } from '@/components/ui/progress-ring';
import { FloatingActionButton } from '@/components/ui/floating-action-button';
import { Music, Upload, TrendingUp, Coins, ArrowRight, Clock, CheckCircle, XCircle, AlertTriangle, Users, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SimilarArtists } from './SimilarArtists';
import { CreditHistory } from './CreditHistory';

export const MemberDashboard = () => {
  const { member } = useAuth();
  const { stats, loading } = useMemberSubmissions();
  const navigate = useNavigate();

  if (!member) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Loading member data...
      </div>
    );
  }

  const submissionProgress = (stats.thisMonthSubmissions / member.monthly_repost_limit) * 100;
  const remainingSubmissions = member.monthly_repost_limit - stats.thisMonthSubmissions;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'rejected': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'pending': return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'qa_flag': return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      default: return <Clock className="h-4 w-4 text-blue-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'text-green-600';
      case 'rejected': return 'text-red-600';
      case 'pending': return 'text-yellow-600';
      case 'qa_flag': return 'text-orange-600';
      default: return 'text-blue-600';
    }
  };

  return (
    <motion.div 
      className="p-6 space-y-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
    >
      {/* Welcome Header */}
      <ScrollReveal>
        <motion.div 
          className="flex items-center justify-between"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <div>
            <motion.h1 
              className="text-2xl font-bold text-foreground"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              Welcome back, {member.name}!
            </motion.h1>
            <motion.p 
              className="text-muted-foreground"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              Track your submissions and performance
            </motion.p>
          </div>
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Badge variant={member.status === 'active' ? 'default' : 'secondary'} className="px-3 py-1">
              {member.status.charAt(0).toUpperCase() + member.status.slice(1)}
            </Badge>
          </motion.div>
        </motion.div>
      </ScrollReveal>

      {/* Key Stats Grid */}
      <ScrollReveal direction="up" delay={0.2}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              title: "This Month",
              icon: Upload,
              value: `${stats.thisMonthSubmissions}/${member.monthly_repost_limit}`,
              description: "submissions used",
              progress: submissionProgress,
              color: "hsl(var(--primary))"
            },
            {
              title: "Pending",
              icon: Clock,
              value: stats.pendingSubmissions,
              description: "awaiting review",
              color: "hsl(var(--accent))"
            },
            {
              title: "Approved",
              icon: CheckCircle,
              value: stats.approvedSubmissions,
              description: "total approved",
              color: "hsl(22 92% 53%)" // Success green
            },
            {
              title: "Credits",
              icon: Coins,
              value: member.net_credits,
              description: "available balance",
              color: "hsl(var(--secondary))"
            }
          ].map((stat, index) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <InteractiveCard hoverScale={1.03} glowOnHover>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                  <motion.div
                    whileHover={{ rotate: 15, scale: 1.2 }}
                    transition={{ type: "spring", stiffness: 400, damping: 10 }}
                  >
                    <stat.icon className="h-4 w-4 text-muted-foreground" />
                  </motion.div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {(typeof stat.value === 'string' ? parseInt(stat.value.split('/')[0]) : stat.value).toLocaleString()}
                    {typeof stat.value === 'string' && stat.value.includes('/') && 
                      `/${stat.value.split('/')[1]}`
                    }
                  </div>
                  <p className="text-xs text-muted-foreground">{stat.description}</p>
                  {stat.progress !== undefined && (
                    <Progress value={stat.progress} className="mt-2" />
                  )}
                </CardContent>
              </InteractiveCard>
            </motion.div>
          ))}
        </div>
      </ScrollReveal>

      {/* Quick Actions */}
      <ScrollReveal direction="up" delay={0.4}>
        <InteractiveCard hoverScale={1.01} glowOnHover>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              {
                icon: Upload,
                title: "Submit New Track",
                description: "Upload your latest SoundCloud link",
                badge: remainingSubmissions > 0 ? `${remainingSubmissions} left` : 'Limit reached',
                onClick: () => navigate('/portal/submit'),
                disabled: remainingSubmissions <= 0,
                bgColor: "bg-primary/10",
                iconColor: "text-primary"
              },
              {
                icon: Music,
                title: "View History",
                description: "Check your submission status",
                badge: `${stats.totalSubmissions} total`,
                onClick: () => navigate('/portal/history'),
                bgColor: "bg-secondary/10",
                iconColor: "text-secondary"
              },
              {
                icon: Users,
                title: "Support Queue",
                description: "View your support assignments",
                onClick: () => navigate('/portal/queue'),
                bgColor: "bg-accent/10",
                iconColor: "text-accent"
              }
            ].map((action, index) => (
              <motion.div
                key={action.title}
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{ scale: 1.02, x: 5 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button 
                  variant="outline" 
                  className="w-full justify-between h-auto p-4"
                  onClick={action.onClick}
                  disabled={action.disabled}
                >
                  <div className="flex items-center gap-3">
                    <motion.div 
                      className={`w-10 h-10 ${action.bgColor} rounded-lg flex items-center justify-center`}
                      whileHover={{ rotate: 5 }}
                    >
                      <action.icon className={`h-5 w-5 ${action.iconColor}`} />
                    </motion.div>
                    <div className="text-left">
                      <h3 className="font-medium">{action.title}</h3>
                      <p className="text-sm text-muted-foreground">{action.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {action.badge && (
                      <Badge variant="outline">
                        {action.badge}
                      </Badge>
                    )}
                    <ArrowRight className="h-4 w-4" />
                  </div>
                </Button>
              </motion.div>
            ))}
          </CardContent>
        </InteractiveCard>
      </ScrollReveal>

      {/* Credit History */}
      <ScrollReveal direction="up" delay={0.6}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CreditHistory />
          <SimilarArtists />
        </div>
      </ScrollReveal>

      {/* Recent Submissions */}
      {stats.recentSubmissions.length > 0 && (
        <ScrollReveal direction="up" delay={0.8}>
          <InteractiveCard hoverScale={1.01} glowOnHover>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Recent Submissions</CardTitle>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => navigate('/portal/history')}
                  >
                    View All <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </motion.div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats.recentSubmissions.slice(0, 3).map((submission, index) => (
                  <motion.div 
                    key={submission.id} 
                    className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    whileHover={{ x: 5 }}
                  >
                    <div className="flex items-center gap-3">
                      <motion.div
                        whileHover={{ scale: 1.2 }}
                        transition={{ type: "spring", stiffness: 400, damping: 10 }}
                      >
                        {getStatusIcon(submission.status)}
                      </motion.div>
                      <div>
                        <h4 className="font-medium text-sm">{submission.artist_name}</h4>
                        <p className="text-xs text-muted-foreground">
                          {new Date(submission.submitted_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className={getStatusColor(submission.status)}>
                      {submission.status.replace('_', ' ')}
                    </Badge>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </InteractiveCard>
        </ScrollReveal>
      )}

      {/* Floating Action Button */}
      {remainingSubmissions > 0 && (
        <FloatingActionButton
          icon={Upload}
          onClick={() => navigate('/portal/submit')}
          label="Submit New Track"
        />
      )}
    </motion.div>
  );
};