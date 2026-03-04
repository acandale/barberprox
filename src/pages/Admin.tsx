import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Navbar } from "@/components/layout/Navbar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  parseISO,
  addMonths,
  subMonths,
  addDays,
  startOfWeek,
  endOfWeek,
} from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  User,
  Scissors,
  Calendar,
  X,
  Settings,
  CalendarOff,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { WorkHoursManager } from "@/components/admin/WorkHoursManager";
import { BlockedTimesCalendar } from "@/components/admin/BlockedTimesCalendar";
import { ServicesManager } from "@/components/admin/ServicesManager";
import { VacationsManager } from "@/components/admin/VacationsManager";
import { AdminBookAppointment } from "@/components/admin/AdminBookAppointment";
import { SalonSettingsManager } from "@/components/admin/SalonSettingsManager";

interface ProfileInfo {
  full_name: string;
  email: string;
  phone: string;
}

interface AppointmentWithDetails {
  id: string;
  start_time: string;
  end_time: string;
  status: string;
  notes: string | null;
  user_id: string;
  profiles: ProfileInfo | null;
  services: {
    name: string;
    duration_minutes: number;
    price: number;
  };
}

const SERVICE_COLORS: Record<string, string> = {
  "Premium Haircut": "bg-purple text-white",
  "Standard Haircut": "bg-navy text-white",
  "Beard Trim": "bg-purple-light text-white",
};

type ViewMode = "month" | "week" | "day";
type AdminTab = "appointments" | "work-hours" | "blocked-times" | "services" | "vacations" | "settings";

export default function AdminPage() {
  const { user, isAdmin, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<AdminTab>("appointments");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentWithDetails | null>(null);
  const [bookDialogOpen, setBookDialogOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      navigate("/dashboard");
    }
  }, [user, isAdmin, authLoading, navigate]);

  // Fetch blocked times for day view
  const { data: dayBlockedTimes = [] } = useQuery({
    queryKey: ["admin-day-blocked-times", currentDate.toISOString(), viewMode],
    queryFn: async () => {
      const startDate = new Date(currentDate);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(currentDate);
      endDate.setHours(23, 59, 59, 999);

      const { data, error } = await supabase
        .from("blocked_times")
        .select("*")
        .gte("start_time", startDate.toISOString())
        .lte("start_time", endDate.toISOString())
        .order("start_time", { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!user && isAdmin && viewMode === "day",
  });

  // Fetch appointments
  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ["admin-appointments", currentDate.toISOString(), viewMode],
    queryFn: async () => {
      let startDate: Date;
      let endDate: Date;

      if (viewMode === "month") {
        startDate = startOfMonth(currentDate);
        endDate = endOfMonth(currentDate);
      } else if (viewMode === "week") {
        startDate = startOfWeek(currentDate);
        endDate = endOfWeek(currentDate);
      } else {
        startDate = new Date(currentDate);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(currentDate);
        endDate.setHours(23, 59, 59, 999);
      }

      const { data, error } = await supabase
        .from("appointments")
        .select(`
          id,
          start_time,
          end_time,
          status,
          notes,
          user_id,
          services (
            name,
            duration_minutes,
            price
          )
        `)
        .gte("start_time", startDate.toISOString())
        .lte("start_time", endDate.toISOString())
        .order("start_time", { ascending: true });

      if (error) throw error;
      
      // Fetch profiles for all appointments
      const userIds = [...new Set(data?.map(apt => apt.user_id) || [])];
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, full_name, email, phone")
        .in("id", userIds);
      
      const profilesMap = new Map(
        profilesData?.map(p => [p.id, { full_name: p.full_name, email: p.email, phone: p.phone }]) || []
      );
      
      return (data || []).map(apt => ({
        ...apt,
        profiles: profilesMap.get(apt.user_id) || null
      })) as AppointmentWithDetails[];
    },
    enabled: !!user && isAdmin,
  });

  // Cancel appointment mutation
  const cancelMutation = useMutation({
    mutationFn: async (appointmentId: string) => {
      const { error } = await supabase
        .from("appointments")
        .update({ status: "cancelled" })
        .eq("id", appointmentId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Appointment cancelled" });
      setSelectedAppointment(null);
      queryClient.invalidateQueries({ queryKey: ["admin-appointments"] });
    },
  });

  const getAppointmentsForDay = (date: Date) => {
    return appointments.filter((apt) =>
      isSameDay(parseISO(apt.start_time), date)
    );
  };

  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart);
    const calendarEnd = endOfWeek(monthEnd);

    const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

    return (
      <div className="grid grid-cols-7 gap-1">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div
            key={day}
            className="p-2 text-center text-sm font-medium text-muted-foreground"
          >
            {day}
          </div>
        ))}
        {days.map((day) => {
          const dayAppointments = getAppointmentsForDay(day);
          const isCurrentMonth = isSameMonth(day, currentDate);
          const isToday = isSameDay(day, new Date());

          return (
            <div
              key={day.toISOString()}
              className={cn(
                "min-h-[100px] p-2 border rounded-lg transition-colors",
                isCurrentMonth ? "bg-card" : "bg-muted/30",
                isToday && "ring-2 ring-purple"
              )}
              onClick={() => {
                setCurrentDate(day);
                setViewMode("day");
              }}
            >
              <div
                className={cn(
                  "text-sm font-medium mb-1",
                  !isCurrentMonth && "text-muted-foreground"
                )}
              >
                {format(day, "d")}
              </div>
              <div className="space-y-1">
                {dayAppointments.slice(0, 3).map((apt) => (
                  <div
                    key={apt.id}
                    className={cn(
                      "text-xs p-1 rounded truncate cursor-pointer",
                      SERVICE_COLORS[apt.services.name] || "bg-purple text-white",
                      apt.status === "cancelled" && "opacity-50 line-through"
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedAppointment(apt);
                    }}
                  >
                    {format(parseISO(apt.start_time), "HH:mm")} -{" "}
                    {apt.profiles?.full_name?.split(" ")[0] || "Unknown"}
                  </div>
                ))}
                {dayAppointments.length > 3 && (
                  <div className="text-xs text-muted-foreground">
                    +{dayAppointments.length - 3} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const SLOT_HEIGHT = 40;
  const DAY_START_HOUR = 8;

  const renderDayView = () => {
    const dayAppointments = getAppointmentsForDay(currentDate);
    const slots: { hour: number; minute: number }[] = [];
    for (let h = 8; h < 20; h++) {
      for (let m = 0; m < 60; m += 15) {
        slots.push({ hour: h, minute: m });
      }
    }

    const getSlotIndex = (hour: number, minute: number) =>
      (hour - DAY_START_HOUR) * 4 + minute / 15;

    const isSlotBlocked = (hour: number, minute: number) => {
      const slotTime = new Date(currentDate);
      slotTime.setHours(hour, minute, 0, 0);
      return dayBlockedTimes.find((bt) => {
        const btStart = parseISO(bt.start_time);
        const btEnd = parseISO(bt.end_time);
        return slotTime >= btStart && slotTime < btEnd;
      });
    };

    return (
      <div className="relative">
        {/* Time slots background */}
        {slots.map(({ hour, minute }) => {
          const blocked = isSlotBlocked(hour, minute);
          const isHourMark = minute === 0;

          return (
            <div
              key={`${hour}-${minute}`}
              className="flex gap-4"
              style={{ height: SLOT_HEIGHT }}
            >
              <div className={cn(
                "w-20 text-sm text-muted-foreground text-right pr-2 shrink-0 flex items-start pt-1",
                !isHourMark && "text-xs opacity-60"
              )}>
                {format(new Date(2000, 0, 1, hour, minute), "h:mm a")}
              </div>
              <div className={cn(
                "flex-1 border-l-2 pl-4",
                isHourMark ? "border-muted-foreground/30" : "border-muted"
              )}>
                {blocked && (
                  <div className="bg-destructive/15 text-destructive text-xs p-1.5 rounded border border-destructive/20">
                    🚫 {blocked.reason || "Blocked"}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Appointments overlay */}
        {dayAppointments.map((apt) => {
          const start = parseISO(apt.start_time);
          const end = parseISO(apt.end_time);
          const startSlot = getSlotIndex(start.getHours(), start.getMinutes());
          const durationMinutes = (end.getTime() - start.getTime()) / 60000;
          const spanSlots = durationMinutes / 15;
          const leftOffset = 96;

          return (
            <div
              key={apt.id}
              className="absolute right-0"
              style={{
                top: startSlot * SLOT_HEIGHT + 2,
                height: spanSlots * SLOT_HEIGHT - 4,
                left: leftOffset,
              }}
            >
              <Card
                className={cn(
                  "h-full cursor-pointer overflow-hidden",
                  apt.status === "cancelled" && "opacity-50"
                )}
                onClick={() => setSelectedAppointment(apt)}
              >
                <CardContent className="p-2 h-full flex items-center">
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          "w-2 rounded-full self-stretch min-h-[20px]",
                          SERVICE_COLORS[apt.services.name] || "bg-purple"
                        )}
                      />
                      <div>
                        <p className="font-medium text-sm">{apt.profiles?.full_name || "Unknown Client"}</p>
                        <p className="text-xs text-muted-foreground">
                          {apt.services.name} • {format(start, "h:mm a")} - {format(end, "h:mm a")}
                        </p>
                      </div>
                    </div>
                    <span
                      className={cn(
                        "text-xs px-2 py-1 rounded-full shrink-0",
                        apt.status === "confirmed"
                          ? "bg-green-100 text-green-700"
                          : apt.status === "cancelled"
                          ? "bg-red-100 text-red-700"
                          : "bg-gray-100 text-gray-700"
                      )}
                    >
                      {apt.status}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          );
        })}
      </div>
    );
  };

  if (authLoading || isLoading) {
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
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
            <p className="text-muted-foreground">Manage appointments, work hours, and blocked times</p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as AdminTab)}>
          <TabsList className="mb-6 flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="appointments" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Appointments
            </TabsTrigger>
            <TabsTrigger value="services" className="flex items-center gap-2">
              <Scissors className="h-4 w-4" />
              Services
            </TabsTrigger>
            <TabsTrigger value="work-hours" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Work Hours
            </TabsTrigger>
            <TabsTrigger value="blocked-times" className="flex items-center gap-2">
              <CalendarOff className="h-4 w-4" />
              Block Times
            </TabsTrigger>
            <TabsTrigger value="vacations" className="flex items-center gap-2">
              <CalendarOff className="h-4 w-4" />
              Vacations
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          {/* Appointments Tab */}
          <TabsContent value="appointments">
            {/* Calendar Controls */}
            <Card variant="elevated" className="mb-6">
              <CardContent className="py-4">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => setBookDialogOpen(true)}
                    >
                      <Calendar className="h-4 w-4" />
                      New Appointment
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        setCurrentDate(
                          viewMode === "month"
                            ? subMonths(currentDate, 1)
                            : viewMode === "week"
                            ? addDays(currentDate, -7)
                            : addDays(currentDate, -1)
                        )
                      }
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <h2 className="text-xl font-semibold min-w-[200px] text-center">
                      {viewMode === "month"
                        ? format(currentDate, "MMMM yyyy")
                        : viewMode === "week"
                        ? `Week of ${format(startOfWeek(currentDate), "MMM d")}`
                        : format(currentDate, "EEEE, MMMM d, yyyy")}
                    </h2>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        setCurrentDate(
                          viewMode === "month"
                            ? addMonths(currentDate, 1)
                            : viewMode === "week"
                            ? addDays(currentDate, 7)
                            : addDays(currentDate, 1)
                        )
                      }
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant={viewMode === "month" ? "secondary" : "ghost"}
                      size="sm"
                      onClick={() => setViewMode("month")}
                    >
                      Month
                    </Button>
                    <Button
                      variant={viewMode === "day" ? "secondary" : "ghost"}
                      size="sm"
                      onClick={() => setViewMode("day")}
                    >
                      Day
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentDate(new Date())}
                    >
                      Today
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Calendar View */}
            <Card variant="elevated">
              <CardContent className="p-6">
                {viewMode === "month" ? renderMonthView() : renderDayView()}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Services Tab */}
          <TabsContent value="services">
            <ServicesManager />
          </TabsContent>

          {/* Work Hours Tab */}
          <TabsContent value="work-hours">
            <WorkHoursManager />
          </TabsContent>

          {/* Blocked Times Tab */}
          <TabsContent value="blocked-times">
            <BlockedTimesCalendar />
          </TabsContent>

          {/* Vacations Tab */}
          <TabsContent value="vacations">
            <VacationsManager />
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <SalonSettingsManager />
          </TabsContent>
        </Tabs>

        {/* Appointment Detail Dialog */}
        {selectedAppointment && (
          <Dialog open={!!selectedAppointment} onOpenChange={() => setSelectedAppointment(null)}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Appointment Details</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-purple/10 text-purple">
                    <User className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="font-semibold">{selectedAppointment.profiles?.full_name || "Unknown Client"}</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedAppointment.profiles?.email || "No email"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {selectedAppointment.profiles?.phone || "No phone"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-purple/10 text-purple">
                    <Scissors className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="font-semibold">{selectedAppointment.services.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedAppointment.services.duration_minutes} minutes • $
                      {Number(selectedAppointment.services.price)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-purple/10 text-purple">
                    <Calendar className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="font-semibold">
                      {format(parseISO(selectedAppointment.start_time), "MMMM d, yyyy")}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {format(parseISO(selectedAppointment.start_time), "h:mm a")} -{" "}
                      {format(parseISO(selectedAppointment.end_time), "h:mm a")}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t">
                  <span
                    className={cn(
                      "text-sm px-3 py-1 rounded-full",
                      selectedAppointment.status === "confirmed"
                        ? "bg-green-100 text-green-700"
                        : selectedAppointment.status === "cancelled"
                        ? "bg-red-100 text-red-700"
                        : "bg-gray-100 text-gray-700"
                    )}
                  >
                    {selectedAppointment.status}
                  </span>

                  {selectedAppointment.status === "confirmed" && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => cancelMutation.mutate(selectedAppointment.id)}
                      disabled={cancelMutation.isPending}
                    >
                      {cancelMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <X className="h-4 w-4" />
                          Cancel
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        <AdminBookAppointment open={bookDialogOpen} onOpenChange={setBookDialogOpen} />
      </main>
    </div>
  );
}
