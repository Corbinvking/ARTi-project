import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useSubmissions } from "../../hooks/useSubmissions";
import { motion } from "framer-motion";
import { ScrollReveal } from "../ui/scroll-reveal";
import { InteractiveCard } from "../ui/interactive-card";
import { LoadingSkeleton, StatCardSkeleton } from "../ui/loading-skeleton";
import {
  FileText,
  Clock,
  Users,
  MessageSquare,
  AlertTriangle,
  TrendingUp,
  Calendar,
  Activity,
} from "lucide-react";

export const DashboardOverview = () => {
  const navigate = useNavigate();
  const { stats: submissionStats, loading: statsLoading } = useSubmissions();

  // Real data from database
  const stats = [
    {
      title: "New Submissions",
      value: statsLoading ? "..." : submissionStats.new.toString(),
      description: "Pending review",
      icon: FileText,
      change: `${submissionStats.total} total`,
      changeType: "neutral" as const,
      href: "/dashboard/submissions",
    },
    {
      title: "Today's Queue",
      value: "8",
      description: "Tracks to support",
      icon: Calendar,
      change: "5 completed",
      changeType: "neutral" as const,
      href: "/dashboard/queue",
    },
    {
      title: "Active Members",
      value: "247",
      description: "Total members",
      icon: Users,
      change: "+12",
      changeType: "positive" as const,
      href: "/dashboard/members",
    },
    {
      title: "Health Issues",
      value: "3",
      description: "Need attention",
      icon: AlertTriangle,
      change: "-2",
      changeType: "positive" as const,
      href: "/dashboard/health",
    },
  ];

  const recentActivity = [
    {
      id: 1,
      type: "submission",
      title: "New submission from BeatMaker_X",
      description: "Electronic - Deep House track submitted",
      time: "2 minutes ago",
      status: "pending",
    },
    {
      id: 2,
      type: "approval",
      title: "Track approved for support",
      description: "Hip-Hop track scheduled for tomorrow",
      time: "15 minutes ago",
      status: "approved",
    },
    {
      id: 3,
      type: "inquiry",
      title: "New membership inquiry",
      description: "Producer from London applying to join",
      time: "1 hour ago",
      status: "pending",
    },
    {
      id: 4,
      type: "complaint",
      title: "Complaint resolved",
      description: "Member issue about missing support",
      time: "2 hours ago",
      status: "resolved",
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "new":
        return "bg-primary";
      case "approved":
        return "bg-green-500";
      case "pending":
        return "bg-yellow-500";
      case "resolved":
        return "bg-blue-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <motion.div 
      className="space-y-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
    >
      {/* Welcome Section */}
      <ScrollReveal>
        <motion.div 
          className="bg-gradient-hero rounded-lg p-6 text-white"
          whileHover={{ scale: 1.01 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
        >
          <motion.h1 
            className="text-2xl font-bold mb-2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            Welcome to your Dashboard
          </motion.h1>
          <motion.p 
            className="text-white/80"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            Manage your SoundCloud Groups efficiently with real-time insights and controls.
          </motion.p>
        </motion.div>
      </ScrollReveal>

      {/* Stats Grid */}
      <ScrollReveal direction="up" delay={0.2}>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {statsLoading ? (
            // Loading skeletons
            Array.from({ length: 4 }).map((_, index) => (
              <StatCardSkeleton key={index} />
            ))
          ) : (
            stats.map((stat, index) => (
              <motion.div
                key={stat.title}
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <InteractiveCard 
                  className="hover:shadow-glow transition-all cursor-pointer"
                  onClick={() => navigate(stat.href)}
                  glowOnHover
                  hoverScale={1.03}
                >
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      {stat.title}
                    </CardTitle>
                    <motion.div
                      whileHover={{ rotate: 15, scale: 1.2 }}
                      transition={{ type: "spring", stiffness: 400, damping: 10 }}
                    >
                      <stat.icon className="h-4 w-4 text-muted-foreground" />
                    </motion.div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {stat.title === "New Submissions" ? (
                        {(parseInt(stat.value)).toLocaleString()}
                      ) : (
                        stat.value
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">
                        {stat.description}
                      </p>
                      <Badge 
                        variant={stat.changeType === "positive" ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {stat.change}
                      </Badge>
                    </div>
                  </CardContent>
                </InteractiveCard>
              </motion.div>
            ))
          )}
        </div>
      </ScrollReveal>

      <ScrollReveal direction="up" delay={0.4}>
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Recent Activity */}
          <InteractiveCard glowOnHover>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <motion.div
                  animate={{ rotate: [0, 5, -5, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                >
                  <Activity className="h-5 w-5" />
                </motion.div>
                Recent Activity
              </CardTitle>
              <CardDescription>
                Latest updates across your dashboard
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.map((activity, index) => (
                  <motion.div
                    key={activity.id}
                    className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    whileHover={{ x: 5 }}
                  >
                    <motion.div 
                      className={`w-2 h-2 rounded-full mt-2 ${getStatusColor(activity.status)}`}
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    />
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {activity.title}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {activity.description}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {activity.time}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button variant="outline" className="w-full mt-4">
                  View All Activity
                </Button>
              </motion.div>
            </CardContent>
          </InteractiveCard>

          {/* Quick Actions */}
          <InteractiveCard glowOnHover>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <motion.div
                  animate={{ y: [0, -2, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                >
                  <TrendingUp className="h-5 w-5" />
                </motion.div>
                Quick Actions
              </CardTitle>
              <CardDescription>
                Common tasks and shortcuts
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                {
                  icon: FileText,
                  text: "Review New Submissions",
                  badge: submissionStats.new,
                  onClick: () => navigate("/dashboard/submissions"),
                  className: "bg-gradient-primary hover:shadow-glow"
                },
                {
                  icon: Clock,
                  text: "Check Today's Queue",
                  badge: 8,
                  onClick: () => navigate("/dashboard/queue"),
                  variant: "secondary" as const
                },
                {
                  icon: MessageSquare,
                  text: "Handle Inquiries",
                  onClick: () => navigate("/dashboard/inquiries"),
                  variant: "outline" as const
                },
                {
                  icon: AlertTriangle,
                  text: "Fix Health Issues",
                  badge: 3,
                  onClick: () => navigate("/dashboard/health"),
                  variant: "outline" as const,
                  className: "border-destructive/50 text-destructive hover:bg-destructive/10"
                }
              ].map((action, index) => (
                <motion.div
                  key={action.text}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button 
                    variant={action.variant || "default"}
                    className={`w-full justify-start gap-3 ${action.className || ""}`}
                    onClick={action.onClick}
                  >
                    <motion.div
                      whileHover={{ rotate: 5 }}
                      transition={{ type: "spring", stiffness: 400, damping: 10 }}
                    >
                      <action.icon className="h-4 w-4" />
                    </motion.div>
                    {action.text}
                    {action.badge && (
                      <Badge 
                        variant={action.text.includes("Health") ? "destructive" : "secondary"} 
                        className="ml-auto"
                      >
                        {(action.badge).toLocaleString()}
                      </Badge>
                    )}
                  </Button>
                </motion.div>
              ))}
            </CardContent>
          </InteractiveCard>
        </div>
      </ScrollReveal>
    </motion.div>
  );
};