// Custom hook to fetch work_hours for Footer
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface WorkHour {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_working_day: boolean; // Schimbat din is_open în is_working_day
}

export function useWorkHours() {
  return useQuery({
    queryKey: ["work-hours-footer"],
    queryFn: async (): Promise<WorkHour[]> => {
      const { data, error } = await supabase
        .from("work_hours")
        .select("*")
        .order("day_of_week", { ascending: true });
        
      if (error) throw error;
      return data as WorkHour[];
    },
  });
}