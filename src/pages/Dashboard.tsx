import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { Navbar } from "@/components/layout/Navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Scissors, Plus, Loader2, DollarSign } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, isFuture, isToday, parseISO } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface Appointment {
  id: string;
  start_time: string;
  end_time: string;
  status: string;
  user_id?: string;
  services: {
    name: string;
    duration_minutes: number;
    price: number;
  };
  profiles?: {
    full_name: string;
  };
}

export default function Dashboard() {
  const { user, profile, isLoading: authLoading, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  const { data: appointments = [], isLoading: appointmentsLoading, refetch } = useQuery({
    queryKey: ["my-appointments", user?.id, isAdmin],
    queryFn: async () => {
      if (!user) return [];
      
      let query = supabase
        .from("appointments")
        .select(`
          id,
          start_time,
          end_time,
          status,
          user_id,
          services (
            name,
            duration_minutes,
            price
          )
        `)
        .order("start_time", { ascending: true });

      if (!isAdmin) {
        query = query.eq("user_id", user.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      if (isAdmin && data.length > 0) {
        const userIds = [...new Set(data.map(a => a.user_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", userIds);
        
        const profileMap = new Map(profiles?.map(p => [p.id, p.full_name]) || []);
        return data.map(a => ({ ...a, profiles: { full_name: profileMap.get(a.user_id) || "Unknown" } })) as Appointment[];
      }
      
      return data as Appointment[];
    },
    enabled: !!user,
  });

  const { data: services = [] } = useQuery({
    queryKey: ["admin-services"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("*")
        .order("price", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const upcomingAppointments = appointments.filter(
    (apt) => isFuture(parseISO(apt.start_time)) && apt.status === "confirmed"
  );

  const todayAppointments = isAdmin
    ? appointments.filter(
        (apt) => isToday(parseISO(apt.start_time)) && apt.status === "confirmed"
      )
    : [];

  const nextAppointment = upcomingAppointments[0];

  const handleCancelAppointment = async (appointmentId: string) => {
    const { error } = await supabase
      .from("appointments")
      .update({ status: "cancelled" })
      .eq("id", appointmentId);

    if (error) {
      toast({
        title: t("dashboard.error"),
        description: t("dashboard.cancelFailed"),
        variant: "destructive",
      });
    } else {
      toast({
        title: t("dashboard.cancelled"),
        description: t("dashboard.cancelledDesc"),
      });
      refetch();
    }
  };

  if (authLoading || appointmentsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-purple" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <Navbar />
      
      <main className="container mx-auto px-4 pt-24 pb-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">
            {t("dashboard.welcome")} {profile?.full_name?.split(" ")[0] || "there"}!
          </h1>
          <p className="text-muted-foreground mt-1">
            {t("dashboard.manage")}
          </p>
        </div>

        {isAdmin && (
          <Card className="mb-6 border-purple/30 bg-purple/5">
            <CardContent className="py-4 flex items-center justify-between">
              <p className="text-sm font-medium text-purple">
                {t("dashboard.adminAccess")}
              </p>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigate("/admin")}
              >
                {t("dashboard.goAdmin")}
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Next Appointment Card */}
          <Card variant="elevated" className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-purple" />
                {t("dashboard.nextAppointment")}
              </CardTitle>
              <CardDescription>
                {isAdmin ? t("dashboard.nextAllClients") : t("dashboard.nextYour")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {nextAppointment ? (
                <div className="p-6 rounded-xl bg-gradient-to-br from-navy to-navy-light text-white">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="text-purple-light text-sm font-medium mb-1">
                        {format(parseISO(nextAppointment.start_time), "EEEE, MMMM d")}
                      </p>
                      <p className="text-2xl font-bold">
                        {format(parseISO(nextAppointment.start_time), "h:mm a")}
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-white/10">
                      <Scissors className="h-6 w-6 text-purple-light" />
                    </div>
                  </div>
                  
                  <div className="space-y-2 mb-4">
                    <p className="text-lg font-semibold">
                      {nextAppointment.services.name}
                    </p>
                    {isAdmin && nextAppointment.profiles?.full_name && (
                      <p className="text-white/80 text-sm">{t("dashboard.client")}: {nextAppointment.profiles.full_name}</p>
                    )}
                    <div className="flex items-center gap-4 text-white/70 text-sm">
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {nextAppointment.services.duration_minutes} min
                      </span>
                      <span>{Number(nextAppointment.services.price)} RON</span>
                    </div>
                  </div>

                  <Button
                    variant="hero-outline"
                    size="sm"
                    onClick={() => handleCancelAppointment(nextAppointment.id)}
                  >
                    {t("dashboard.cancelAppointment")}
                  </Button>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                    <Calendar className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground mb-4">
                    {t("dashboard.noUpcoming")}
                  </p>
                  <Button variant="hero" onClick={() => navigate("/book")}>
                    <Plus className="h-4 w-4" />
                    {t("dashboard.bookNow")}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card variant="elevated">
            <CardHeader>
              <CardTitle>{t("dashboard.quickActions")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                variant="hero"
                className="w-full justify-start"
                onClick={() => navigate("/book")}
              >
                <Plus className="h-4 w-4" />
                {t("dashboard.bookNew")}
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => document.getElementById("services")?.scrollIntoView({ behavior: "smooth" })}
              >
                <Scissors className="h-4 w-4" />
                {t("dashboard.viewServices")}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* All Appointments */}
        {isAdmin ? (
          todayAppointments.length > 0 && (
            <div className="mt-8">
              <h2 className="text-xl font-semibold mb-4">{t("dashboard.todayAppointments")}</h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {todayAppointments.map((apt) => (
                  <Card key={apt.id} variant="default">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-semibold">{apt.services.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {format(parseISO(apt.start_time), "h:mm a")} - {format(parseISO(apt.end_time), "h:mm a")}
                          </p>
                          {apt.profiles?.full_name && (
                            <p className="text-xs text-purple mt-1">{t("dashboard.client")}: {apt.profiles.full_name}</p>
                          )}
                        </div>
                        <span className="text-sm font-medium text-purple">
                          {Number(apt.services.price)} RON
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleCancelAppointment(apt.id)}
                      >
                        {t("dashboard.cancel")}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )
        ) : (
          upcomingAppointments.length > 1 && (
            <div className="mt-8">
              <h2 className="text-xl font-semibold mb-4">{t("dashboard.allUpcoming")}</h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {upcomingAppointments.slice(1).map((apt) => (
                  <Card key={apt.id} variant="default">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-semibold">{apt.services.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {format(parseISO(apt.start_time), "MMM d, h:mm a")}
                          </p>
                        </div>
                        <span className="text-sm font-medium text-purple">
                          {Number(apt.services.price)} RON
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleCancelAppointment(apt.id)}
                      >
                        {t("dashboard.cancel")}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )
        )}
      </main>
    </div>
  );
}
