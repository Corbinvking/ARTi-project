"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../integrations/supabase/client";
import { useToast } from "../hooks/use-toast";

interface SalesGoal {
  id: string;
  salesperson_email: string;
  goal_period_start: string;
  goal_period_end: string;
  revenue_target: number;
  campaigns_target: number;
  commission_target: number;
  created_by?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface TeamGoal {
  id: string;
  goal_name: string;
  goal_period_start: string;
  goal_period_end: string;
  target_value: number;
  current_value: number;
  goal_type: string;
  created_by?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface SalesPerformance {
  id: string;
  salesperson_email: string;
  tracking_period_start: string;
  tracking_period_end: string;
  actual_revenue: number;
  actual_campaigns: number;
  actual_commission: number;
  calculated_at: string;
}

export const useSalesGoals = (salespersonEmail?: string) => {
  return useQuery({
    queryKey: ["sales-goals", salespersonEmail],
    queryFn: async () => {
      let query = supabase
        .from("sales_goals")
        .select("*")
        .eq("is_active", true)
        .order("goal_period_start", { ascending: false });

      if (salespersonEmail) {
        query = query.eq("salesperson_email", salespersonEmail);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as SalesGoal[];
    },
  });
};

export const useTeamGoals = () => {
  return useQuery({
    queryKey: ["team-goals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_goals")
        .select("*")
        .eq("is_active", true)
        .order("goal_period_start", { ascending: false });

      if (error) throw error;
      return data as TeamGoal[];
    },
  });
};

export const useSalesPerformance = (salespersonEmail?: string) => {
  return useQuery({
    queryKey: ["sales-performance", salespersonEmail],
    queryFn: async () => {
      let query = supabase
        .from("sales_performance_tracking")
        .select("*")
        .order("tracking_period_start", { ascending: false });

      if (salespersonEmail) {
        query = query.eq("salesperson_email", salespersonEmail);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as SalesPerformance[];
    },
  });
};

export const useCreateSalesGoal = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (goalData: Omit<SalesGoal, "id" | "created_at" | "updated_at" | "created_by">) => {
      const { data, error } = await supabase
        .from("sales_goals")
        .insert([goalData])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales-goals"] });
      toast({
        title: "Goal created",
        description: "Sales goal has been successfully created.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create sales goal.",
        variant: "destructive",
      });
    },
  });
};

export const useCreateTeamGoal = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (goalData: Omit<TeamGoal, "id" | "created_at" | "updated_at" | "created_by">) => {
      const { data, error } = await supabase
        .from("team_goals")
        .insert([goalData])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-goals"] });
      toast({
        title: "Team goal created",
        description: "Team goal has been successfully created.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create team goal.",
        variant: "destructive",
      });
    },
  });
};








