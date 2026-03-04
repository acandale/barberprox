import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SalonSettings {
  id: string;
  salon_name: string;
  hero_title: string;
  hero_subtitle: string;
  hero_badge_text: string;
  hero_image_url: string | null;
  about_title: string;
  about_description: string;
  about_features: string[];
  about_cards: { icon: string; title: string; description: string }[];
  footer_address: string;
  footer_phone: string;
  footer_email: string;
  footer_hours: { label: string }[];
  quick_links: { label: string; href: string }[];
  hero_stats: { value: string; label: string }[];
}

export function useSalonSettings() {
  return useQuery({
    queryKey: ["salon-settings"],
    queryFn: async (): Promise<SalonSettings> => {
      const { data, error } = await supabase
        .from("salon_settings")
        .select("*")
        .limit(1)
        .single();

      if (error) throw error;
      return {
        ...data,
        about_features: data.about_features as unknown as string[],
        about_cards: data.about_cards as unknown as SalonSettings["about_cards"],
        footer_hours: data.footer_hours as unknown as SalonSettings["footer_hours"],
        quick_links: data.quick_links as unknown as SalonSettings["quick_links"],
        hero_stats: data.hero_stats as unknown as SalonSettings["hero_stats"],
      };
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdateSalonSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: Partial<Omit<SalonSettings, "id">>) => {
      // Get the current settings ID first
      const { data: current } = await supabase
        .from("salon_settings")
        .select("id")
        .limit(1)
        .single();

      if (!current) throw new Error("No salon settings found");

      const { error } = await supabase
        .from("salon_settings")
        .update(updates as any)
        .eq("id", current.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["salon-settings"] });
    },
  });
}
