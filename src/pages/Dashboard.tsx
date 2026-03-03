import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
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
        title: "Error",
        description: "Failed to cancel appointment",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Appointment cancelled",
        description: "Your appointment has been cancelled successfully",
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
            Welcome back, {profile?.full_name?.split(" ")[0] || "there"}!
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your appointments and bookings
          </p>
        </div>

        {isAdmin && (
          <Card className="mb-6 border-purple/30 bg-purple/5">
            <CardContent className="py-4 flex items-center justify-between">
              <p className="text-sm font-medium text-purple">
                You have admin access
              </p>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigate("/admin")}
              >
                Go to Admin Panel
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
                Next Appointment
              </CardTitle>
              <CardDescription>
                {isAdmin ? "Next upcoming appointment (all clients)" : "Your upcoming scheduled appointment"}
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
                      <p className="text-white/80 text-sm">Client: {nextAppointment.profiles.full_name}</p>
                    )}
                    <div className="flex items-center gap-4 text-white/70 text-sm">
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {nextAppointment.services.duration_minutes} min
                      </span>
                      <span>${Number(nextAppointment.services.price)}</span>
                    </div>
                  </div>

                  <Button
                    variant="hero-outline"
                    size="sm"
                    onClick={() => handleCancelAppointment(nextAppointment.id)}
                  >
                    Cancel Appointment
                  </Button>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                    <Calendar className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground mb-4">
                    No upcoming appointments
                  </p>
                  <Button variant="hero" onClick={() => navigate("/book")}>
                    <Plus className="h-4 w-4" />
                    Book Now
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card variant="elevated">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                variant="hero"
                className="w-full justify-start"
                onClick={() => navigate("/book")}
              >
                <Plus className="h-4 w-4" />
                Book New Appointment
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => document.getElementById("services")?.scrollIntoView({ behavior: "smooth" })}
              >
                <Scissors className="h-4 w-4" />
                View Services
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* All Appointments */}
        {upcomingAppointments.length > 1 && (
          <div className="mt-8">
            <h2 className="text-xl font-semibold mb-4">All Upcoming Appointments</h2>
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
                        ${Number(apt.services.price)}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleCancelAppointment(apt.id)}
                    >
                      Cancel
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Services Section */}
        <section id="services" className="mt-16 scroll-mt-24">
          <div className="mb-6">
            <span className="text-sm font-semibold text-purple uppercase tracking-wider">Our Services</span>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mt-2">
              Premium Grooming Services
            </h2>
            <p className="text-muted-foreground mt-2">
              Choose from our range of professional services tailored to your needs
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {services.map((service) => (
              <Card key={service.id} variant="elevated">
                <CardHeader>
                  <div className="p-3 rounded-lg bg-purple/10 text-purple w-fit mb-2">
                    <Scissors className="h-6 w-6" />
                  </div>
                  <CardTitle>{service.name}</CardTitle>
                  <CardDescription>{service.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm mb-4">
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="h-4 w-4" /> {service.duration_minutes} min
                    </span>
                    <span className="flex items-center gap-1 font-bold text-xl text-purple">
                      <DollarSign className="h-4 w-4" />{Number(service.price)}
                    </span>
                  </div>
                  <Button variant="secondary" className="w-full" onClick={() => navigate("/book")}>
                    Book Now
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* About Section */}
        <section id="about" className="mt-16 scroll-mt-24 pb-8">
          <div className="mb-6">
            <span className="text-sm font-semibold text-purple uppercase tracking-wider">About Us</span>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mt-2">
              Crafting Confidence, One Cut at a Time
            </h2>
          </div>
          <div className="grid lg:grid-cols-2 gap-8">
            <div>
              <p className="text-muted-foreground leading-relaxed mb-6">
                With over a decade of experience in the industry, BarberPro has become synonymous with excellence in men's grooming. Our skilled barbers combine traditional techniques with modern trends to deliver results that exceed expectations.
              </p>
              <ul className="space-y-3">
                <li className="flex items-center gap-3 text-foreground">
                  <div className="h-2 w-2 rounded-full bg-purple" />
                  Premium quality products
                </li>
                <li className="flex items-center gap-3 text-foreground">
                  <div className="h-2 w-2 rounded-full bg-purple" />
                  Appointment flexibility
                </li>
                <li className="flex items-center gap-3 text-foreground">
                  <div className="h-2 w-2 rounded-full bg-purple" />
                  Satisfaction guaranteed
                </li>
              </ul>
            </div>
            <div className="grid gap-4">
              <Card className="p-4">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-purple/10 text-purple shrink-0">
                    <Scissors className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">Expert Barbers</h3>
                    <p className="text-sm text-muted-foreground">Our team consists of certified professionals with years of experience</p>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-purple/10 text-purple shrink-0">
                    <Calendar className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">Easy Booking</h3>
                    <p className="text-sm text-muted-foreground">Book your appointment online anytime, anywhere</p>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
