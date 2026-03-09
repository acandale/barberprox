import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, addMinutes, parseISO, setHours, setMinutes } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Loader2, ChevronsUpDown, Check } from "lucide-react";

interface AdminBookAppointmentProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AdminBookAppointment({ open, onOpenChange }: AdminBookAppointmentProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [selectedServiceId, setSelectedServiceId] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [clientSearchOpen, setClientSearchOpen] = useState(false);

  // Fetch clients
  const { data: clients = [] } = useQuery({
    queryKey: ["admin-clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, phone")
        .order("full_name");
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  // Fetch services
  const { data: services = [] } = useQuery({
    queryKey: ["services"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("*")
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  // Fetch work hours
  const { data: workHours = [] } = useQuery({
    queryKey: ["work-hours"],
    queryFn: async () => {
      const { data, error } = await supabase.from("work_hours").select("*");
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  // Fetch blocked days
  const { data: blockedDays = [] } = useQuery({
    queryKey: ["blocked-days-booking"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blocked_days")
        .select("start_date, end_date")
        .gte("end_date", format(new Date(), "yyyy-MM-dd"));
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  // Fetch existing appointments for the selected date
  const { data: existingAppointments = [] } = useQuery({
    queryKey: ["appointments-for-date", selectedDate?.toISOString()],
    queryFn: async () => {
      if (!selectedDate) return [];
      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(selectedDate);
      endOfDay.setHours(23, 59, 59, 999);

      const { data, error } = await supabase
        .from("appointments")
        .select("start_time, end_time")
        .gte("start_time", startOfDay.toISOString())
        .lte("start_time", endOfDay.toISOString())
        .neq("status", "cancelled");
      if (error) throw error;
      return data;
    },
    enabled: !!selectedDate && open,
  });

  // Fetch blocked times for the selected date
  const { data: blockedTimes = [] } = useQuery({
    queryKey: ["blocked-times", selectedDate?.toISOString()],
    queryFn: async () => {
      if (!selectedDate) return [];
      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(selectedDate);
      endOfDay.setHours(23, 59, 59, 999);

      const { data, error } = await supabase
        .from("blocked_times")
        .select("start_time, end_time")
        .gte("start_time", startOfDay.toISOString())
        .lte("start_time", endOfDay.toISOString());
      if (error) throw error;
      return data;
    },
    enabled: !!selectedDate && open,
  });

  const selectedService = services.find((s) => s.id === selectedServiceId);

  const generateTimeSlots = () => {
    if (!selectedDate || !selectedService) return [];

    const dayOfWeek = selectedDate.getDay();
    const workHour = workHours.find((wh) => wh.day_of_week === dayOfWeek);
    if (!workHour || !workHour.is_working_day) return [];

    const slots: string[] = [];
    const [startH, startM] = workHour.start_time.split(":").map(Number);
    const [endH, endM] = workHour.end_time.split(":").map(Number);

    let currentTime = setMinutes(setHours(selectedDate, startH), startM);
    const endTime = setMinutes(setHours(selectedDate, endH), endM);

    while (currentTime < endTime) {
      const slotEnd = addMinutes(currentTime, selectedService.duration_minutes);
      if (slotEnd <= endTime) {
        const isConflict = existingAppointments.some((apt) => {
          const aptStart = parseISO(apt.start_time);
          const aptEnd = parseISO(apt.end_time);
          return (
            (currentTime >= aptStart && currentTime < aptEnd) ||
            (slotEnd > aptStart && slotEnd <= aptEnd) ||
            (currentTime <= aptStart && slotEnd >= aptEnd)
          );
        });

        const isBlocked = blockedTimes.some((bt) => {
          const btStart = parseISO(bt.start_time);
          const btEnd = parseISO(bt.end_time);
          return (
            (currentTime >= btStart && currentTime < btEnd) ||
            (slotEnd > btStart && slotEnd <= btEnd) ||
            (currentTime <= btStart && slotEnd >= btEnd)
          );
        });

        const isPast = currentTime < new Date();

        if (!isConflict && !isBlocked && !isPast) {
          slots.push(format(currentTime, "HH:mm"));
        }
      }
      currentTime = addMinutes(currentTime, 15);
    }
    return slots;
  };

  const timeSlots = generateTimeSlots();

  const isDateDisabled = (date: Date) => {
    const dayOfWeek = date.getDay();
    const workHour = workHours.find((wh) => wh.day_of_week === dayOfWeek);
    if (!workHour || !workHour.is_working_day) return true;
    if (date < new Date(new Date().setHours(0, 0, 0, 0))) return true;

    const dateStr = format(date, "yyyy-MM-dd");
    const isBlockedDay = blockedDays.some(
      (bd) => dateStr >= bd.start_date && dateStr <= bd.end_date
    );
    if (isBlockedDay) return true;

    return false;
  };

  const bookMutation = useMutation({
    mutationFn: async () => {
      if (!selectedService || !selectedDate || !selectedTime || !selectedClientId) {
        throw new Error("Missing fields");
      }

      const [hours, minutes] = selectedTime.split(":").map(Number);
      const startTime = new Date(selectedDate);
      startTime.setHours(hours, minutes, 0, 0);
      const endTime = addMinutes(startTime, selectedService.duration_minutes);

      const { error } = await supabase.from("appointments").insert({
        user_id: selectedClientId,
        service_id: selectedService.id,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        status: "confirmed",
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Appointment booked",
        description: `Appointment created for ${clients.find((c) => c.id === selectedClientId)?.full_name}`,
      });
      queryClient.invalidateQueries({ queryKey: ["admin-appointments"] });
      queryClient.invalidateQueries({ queryKey: ["appointments-for-date"] });
      // Reset form for next booking
      setSelectedTime(null);
    },
    onError: (error: any) => {
      const isOverlap = error?.message?.includes("overlap");
      toast({
        title: "Booking failed",
        description: isOverlap ? "This time slot is already booked. Please choose another." : "Something went wrong. Please try again.",
        variant: "destructive",
      });
      if (isOverlap) {
        queryClient.invalidateQueries({ queryKey: ["appointments-for-date"] });
      }
    },
  });

  const resetAndClose = () => {
    setSelectedClientId("");
    setSelectedServiceId("");
    setSelectedDate(undefined);
    setSelectedTime(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={resetAndClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Book Appointment (Admin)</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Client */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Client</label>
            <Select value={selectedClientId} onValueChange={setSelectedClientId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a client" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.full_name} — {c.phone || c.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Service */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Service</label>
            <Select
              value={selectedServiceId}
              onValueChange={(v) => {
                setSelectedServiceId(v);
                setSelectedTime(null);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a service" />
              </SelectTrigger>
              <SelectContent>
                {services.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name} — {s.duration_minutes}min — ${Number(s.price)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date */}
          {selectedServiceId && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Date</label>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => {
                  setSelectedDate(date);
                  setSelectedTime(null);
                }}
                disabled={isDateDisabled}
                className={cn("rounded-md border pointer-events-auto")}
              />
            </div>
          )}

          {/* Time */}
          {selectedDate && selectedServiceId && (
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Time — {format(selectedDate, "EEEE, MMMM d")}
              </label>
              {timeSlots.length > 0 ? (
                <div className="grid grid-cols-4 gap-2 max-h-[200px] overflow-y-auto">
                  {timeSlots.map((time) => (
                    <Button
                      key={time}
                      variant={selectedTime === time ? "secondary" : "outline"}
                      size="sm"
                      onClick={() => setSelectedTime(time)}
                      className={cn(selectedTime === time && "ring-2 ring-purple")}
                    >
                      {format(new Date(`2000-01-01T${time}`), "h:mm a")}
                    </Button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No available slots for this date
                </p>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="ghost" onClick={resetAndClose}>
              Close
            </Button>
            <Button
              onClick={() => bookMutation.mutate()}
              disabled={!selectedClientId || !selectedServiceId || !selectedDate || !selectedTime || bookMutation.isPending}
            >
              {bookMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Book Appointment"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
