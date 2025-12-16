import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Navbar } from "@/components/layout/Navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  Plus,
  Clock,
  User,
  Scissors,
  Calendar,
  X,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface AppointmentWithDetails {
  id: string;
  start_time: string;
  end_time: string;
  status: string;
  notes: string | null;
  profiles: {
    full_name: string;
    email: string;
    phone: string;
  };
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

export default function AdminPage() {
  const { user, isAdmin, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentWithDetails | null>(null);
  const [blockTimeDialog, setBlockTimeDialog] = useState(false);
  const [blockTimeData, setBlockTimeData] = useState({
    date: "",
    startTime: "",
    endTime: "",
    reason: "",
  });

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      navigate("/dashboard");
    }
  }, [user, isAdmin, authLoading, navigate]);

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
      return data as AppointmentWithDetails[];
    },
    enabled: !!user && isAdmin,
  });

  // Fetch blocked times
  const { data: blockedTimes = [] } = useQuery({
    queryKey: ["admin-blocked-times", currentDate.toISOString()],
    queryFn: async () => {
      const startDate = startOfMonth(currentDate);
      const endDate = endOfMonth(currentDate);

      const { data, error } = await supabase
        .from("blocked_times")
        .select("*")
        .gte("start_time", startDate.toISOString())
        .lte("start_time", endDate.toISOString());

      if (error) throw error;
      return data;
    },
    enabled: !!user && isAdmin,
  });

  // Block time mutation
  const blockTimeMutation = useMutation({
    mutationFn: async () => {
      const startTime = new Date(`${blockTimeData.date}T${blockTimeData.startTime}`);
      const endTime = new Date(`${blockTimeData.date}T${blockTimeData.endTime}`);

      const { error } = await supabase.from("blocked_times").insert({
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        reason: blockTimeData.reason || null,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Time blocked successfully" });
      setBlockTimeDialog(false);
      setBlockTimeData({ date: "", startTime: "", endTime: "", reason: "" });
      queryClient.invalidateQueries({ queryKey: ["admin-blocked-times"] });
    },
    onError: () => {
      toast({ title: "Failed to block time", variant: "destructive" });
    },
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
                    {apt.profiles.full_name.split(" ")[0]}
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

  const renderDayView = () => {
    const dayAppointments = getAppointmentsForDay(currentDate);
    const hours = Array.from({ length: 12 }, (_, i) => i + 8); // 8 AM to 7 PM

    return (
      <div className="space-y-2">
        {hours.map((hour) => {
          const hourAppointments = dayAppointments.filter((apt) => {
            const aptHour = parseISO(apt.start_time).getHours();
            return aptHour === hour;
          });

          return (
            <div key={hour} className="flex gap-4">
              <div className="w-20 text-sm text-muted-foreground py-2">
                {format(new Date().setHours(hour, 0), "h:mm a")}
              </div>
              <div className="flex-1 min-h-[60px] border-l-2 border-muted pl-4">
                {hourAppointments.map((apt) => (
                  <Card
                    key={apt.id}
                    className={cn(
                      "cursor-pointer mb-2",
                      apt.status === "cancelled" && "opacity-50"
                    )}
                    onClick={() => setSelectedAppointment(apt)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              "w-2 h-full min-h-[40px] rounded-full",
                              SERVICE_COLORS[apt.services.name] || "bg-purple"
                            )}
                          />
                          <div>
                            <p className="font-medium">{apt.profiles.full_name}</p>
                            <p className="text-sm text-muted-foreground">
                              {apt.services.name} •{" "}
                              {format(parseISO(apt.start_time), "h:mm a")} -{" "}
                              {format(parseISO(apt.end_time), "h:mm a")}
                            </p>
                          </div>
                        </div>
                        <span
                          className={cn(
                            "text-xs px-2 py-1 rounded-full",
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
                ))}
              </div>
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
            <h1 className="text-3xl font-bold text-foreground">Admin Calendar</h1>
            <p className="text-muted-foreground">Manage all appointments</p>
          </div>

          <div className="flex items-center gap-2">
            <Dialog open={blockTimeDialog} onOpenChange={setBlockTimeDialog}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Plus className="h-4 w-4" />
                  Block Time
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Block Time</DialogTitle>
                  <DialogDescription>
                    Block off time for breaks or personal appointments
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div>
                    <Label>Date</Label>
                    <Input
                      type="date"
                      value={blockTimeData.date}
                      onChange={(e) =>
                        setBlockTimeData({ ...blockTimeData, date: e.target.value })
                      }
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Start Time</Label>
                      <Input
                        type="time"
                        value={blockTimeData.startTime}
                        onChange={(e) =>
                          setBlockTimeData({ ...blockTimeData, startTime: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <Label>End Time</Label>
                      <Input
                        type="time"
                        value={blockTimeData.endTime}
                        onChange={(e) =>
                          setBlockTimeData({ ...blockTimeData, endTime: e.target.value })
                        }
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Reason (optional)</Label>
                    <Input
                      value={blockTimeData.reason}
                      onChange={(e) =>
                        setBlockTimeData({ ...blockTimeData, reason: e.target.value })
                      }
                      placeholder="e.g., Lunch break"
                    />
                  </div>
                  <Button
                    className="w-full"
                    variant="hero"
                    onClick={() => blockTimeMutation.mutate()}
                    disabled={
                      !blockTimeData.date ||
                      !blockTimeData.startTime ||
                      !blockTimeData.endTime ||
                      blockTimeMutation.isPending
                    }
                  >
                    {blockTimeMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Block Time"
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Calendar Controls */}
        <Card variant="elevated" className="mb-6">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
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
                    <p className="font-semibold">{selectedAppointment.profiles.full_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedAppointment.profiles.email}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {selectedAppointment.profiles.phone}
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
      </main>
    </div>
  );
}
