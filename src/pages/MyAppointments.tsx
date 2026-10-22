import { Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ro as roLocale, enUS } from "date-fns/locale";
import { Navbar } from "@/components/layout/Navbar";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { useSalonSettings } from "@/hooks/useSalonSettings";
import { supabase } from "@/integrations/supabase/client";

interface Appt {
  id: string;
  start_time: string;
  end_time: string;
  status: string | null;
  services: { name: string; price: number; duration_minutes: number } | null;
  specialists: { name: string } | null;
}

export default function MyAppointments() {
  const { user, isLoading } = useAuth();
  const { language } = useLanguage();
  const { data: salon } = useSalonSettings();
  const ro = language === "ro";
  const locale = ro ? roLocale : enUS;

  const { data: appts = [], isLoading: loading } = useQuery({
    queryKey: ["my-appointments", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("id,start_time,end_time,status,services(name,price,duration_minutes),specialists(name)")
        .eq("user_id", user!.id)
        .order("start_time", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as Appt[];
    },
  });

  if (!isLoading && !user) return <Navigate to="/auth" replace />;

  const now = new Date();
  const upcoming = appts.filter((a) => new Date(a.end_time) >= now && a.status !== "cancelled").reverse();
  const past = appts.filter((a) => !(new Date(a.end_time) >= now && a.status !== "cancelled"));

  const statusLabel = (a: Appt) => {
    if (a.status === "cancelled") return ro ? "ANULAT" : "CANCELLED";
    if (new Date(a.end_time) < now) return ro ? "FINALIZAT" : "COMPLETED";
    return ro ? "CONFIRMAT" : "CONFIRMED";
  };

  const dateLabel = (d: Date) => {
    const s = format(d, d.getFullYear() === now.getFullYear() ? "EEEEEE. d MMM" : "EEEEEE. d MMM yyyy", { locale });
    return s.charAt(0).toUpperCase() + s.slice(1);
  };

  const Card = ({ a }: { a: Appt }) => {
    const start = new Date(a.start_time);
    const end = new Date(a.end_time);
    const mins = Math.round((end.getTime() - start.getTime()) / 60000);
    return (
      <div className="rounded-lg bg-card border border-border shadow-sm p-4">
        <span className="inline-block text-xs font-semibold px-2 py-1 rounded bg-muted text-muted-foreground">
          {statusLabel(a)}
        </span>
        <h3 className="text-lg font-bold mt-1 text-foreground">{dateLabel(start)}</h3>
        <div className="border-t border-border my-3" />
        <div className="flex justify-between gap-2">
          <span className="font-semibold text-foreground">{a.services?.name}</span>
          <span className="font-bold text-foreground whitespace-nowrap">{a.services?.price} lei</span>
        </div>
        <p className="text-sm text-foreground/80">
          {a.specialists?.name} - {salon?.salon_name || "BarberPro"}
        </p>
        <p className="text-sm text-muted-foreground">
          {format(start, "HH:mm")} - {format(end, "HH:mm")} ({mins} min)
        </p>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold mb-8 text-foreground">{ro ? "Programări" : "Appointments"}</h1>
        {loading ? (
          <p className="text-muted-foreground">{ro ? "Se încarcă..." : "Loading..."}</p>
        ) : appts.length === 0 ? (
          <p className="text-muted-foreground">{ro ? "Nu ai nicio programare încă." : "You have no appointments yet."}</p>
        ) : (
          <>
            {upcoming.length > 0 && (
              <section className="mb-10">
                <h2 className="font-semibold text-muted-foreground mb-4">
                  {ro ? "Viitoare" : "Upcoming"} ({upcoming.length})
                </h2>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {upcoming.map((a) => <Card key={a.id} a={a} />)}
                </div>
              </section>
            )}
            {past.length > 0 && (
              <section>
                <h2 className="font-semibold text-muted-foreground mb-4">
                  {ro ? "În trecut" : "Past"} ({past.length})
                </h2>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {past.map((a) => <Card key={a.id} a={a} />)}
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}
