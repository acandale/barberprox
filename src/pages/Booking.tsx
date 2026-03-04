import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { Navbar } from "@/components/layout/Navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, addMinutes, parseISO, isSameDay, isWithinInterval, setHours, setMinutes } from "date-fns";
import { Scissors, Clock, DollarSign, ArrowLeft, ArrowRight, Loader2, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Service {
  id: string;
  name: string;
  duration_minutes: number;
  price: number;
  description: string;
}

interface WorkHour {
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_working_day: boolean;
}

export default function BookingPage() {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();

  const [step, setStep] = useState(1);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [isBooking, setIsBooking] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const channel = supabase
      .channel('appointments-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => {
        queryClient.invalidateQueries({ queryKey: ["appointments-for-date"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  const { data: services = [] } = useQuery({
    queryKey: ["services"],
    queryFn: async () => {
      const { data, error } = await supabase.from("services").select("*").order("duration_minutes", { ascending: false });
      if (error) throw error;
      return data as Service[];
    },
  });

  const { data: workHours = [] } = useQuery({
    queryKey: ["work-hours"],
    queryFn: async () => {
      const { data, error } = await supabase.from("work_hours").select("*");
      if (error) throw error;
      return data as WorkHour[];
    },
  });

  const { data: existingAppointments = [] } = useQuery({
    queryKey: ["appointments-for-date", selectedDate?.toISOString()],
    queryFn: async () => {
      if (!selectedDate) return [];
      const startOfDay = new Date(selectedDate); startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(selectedDate); endOfDay.setHours(23, 59, 59, 999);
      const { data, error } = await supabase.from("appointments").select("start_time, end_time").gte("start_time", startOfDay.toISOString()).lte("start_time", endOfDay.toISOString()).neq("status", "cancelled");
      if (error) throw error;
      return data;
    },
    enabled: !!selectedDate,
  });

  const { data: blockedTimes = [] } = useQuery({
    queryKey: ["blocked-times", selectedDate?.toISOString()],
    queryFn: async () => {
      if (!selectedDate) return [];
      const startOfDay = new Date(selectedDate); startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(selectedDate); endOfDay.setHours(23, 59, 59, 999);
      const { data, error } = await supabase.from("blocked_times").select("start_time, end_time").gte("start_time", startOfDay.toISOString()).lte("start_time", endOfDay.toISOString());
      if (error) throw error;
      return data;
    },
    enabled: !!selectedDate,
  });

  const { data: blockedDays = [] } = useQuery({
    queryKey: ["blocked-days-booking"],
    queryFn: async () => {
      const { data, error } = await supabase.from("blocked_days").select("start_date, end_date").gte("end_date", format(new Date(), "yyyy-MM-dd"));
      if (error) throw error;
      return data;
    },
  });

  const generateTimeSlots = () => {
    if (!selectedDate || !selectedService) return [];
    const dayOfWeek = selectedDate.getDay();
    const workHour = workHours.find((wh) => wh.day_of_week === dayOfWeek);
    if (!workHour || !workHour.is_working_day) return [];
    const slots: string[] = [];
    const [startHour, startMin] = workHour.start_time.split(":").map(Number);
    const [endHour, endMin] = workHour.end_time.split(":").map(Number);
    let currentTime = setMinutes(setHours(selectedDate, startHour), startMin);
    const endTime = setMinutes(setHours(selectedDate, endHour), endMin);
    while (currentTime < endTime) {
      const slotEnd = addMinutes(currentTime, selectedService.duration_minutes);
      if (slotEnd <= endTime) {
        const isConflict = existingAppointments.some((apt) => {
          const aptStart = parseISO(apt.start_time); const aptEnd = parseISO(apt.end_time);
          return (currentTime >= aptStart && currentTime < aptEnd) || (slotEnd > aptStart && slotEnd <= aptEnd) || (currentTime <= aptStart && slotEnd >= aptEnd);
        });
        const isBlocked = blockedTimes.some((bt) => {
          const btStart = parseISO(bt.start_time); const btEnd = parseISO(bt.end_time);
          return (currentTime >= btStart && currentTime < btEnd) || (slotEnd > btStart && slotEnd <= btEnd) || (currentTime <= btStart && slotEnd >= btEnd);
        });
        const isPast = currentTime < new Date();
        if (!isConflict && !isBlocked && !isPast) { slots.push(format(currentTime, "HH:mm")); }
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
    const isBlockedDay = blockedDays.some((bd) => dateStr >= bd.start_date && dateStr <= bd.end_date);
    if (isBlockedDay) return true;
    return false;
  };

  const handleBooking = async () => {
    if (!selectedService || !selectedDate || !selectedTime || !user) return;
    setIsBooking(true);
    try {
      const [hours, minutes] = selectedTime.split(":").map(Number);
      const startTime = new Date(selectedDate); startTime.setHours(hours, minutes, 0, 0);
      const endTime = addMinutes(startTime, selectedService.duration_minutes);
      const { error } = await supabase.from("appointments").insert({ user_id: user.id, service_id: selectedService.id, start_time: startTime.toISOString(), end_time: endTime.toISOString(), status: "confirmed" });
      if (error) throw error;
      toast({ title: t("booking.confirmed"), description: `${selectedService.name} - ${format(startTime, "MMMM d 'at' h:mm a")}` });
      navigate("/dashboard");
    } catch (error) {
      toast({ title: t("booking.failed"), description: t("booking.failedDesc"), variant: "destructive" });
    } finally {
      setIsBooking(false);
    }
  };

  if (authLoading) {
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
        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-4 mb-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all", step >= s ? "bg-purple text-white" : "bg-muted text-muted-foreground")}>
                {step > s ? <Check className="h-4 w-4" /> : s}
              </div>
              <span className={cn("text-sm hidden sm:block", step >= s ? "text-foreground" : "text-muted-foreground")}>
                {s === 1 ? t("booking.service") : s === 2 ? t("booking.dateTime") : t("booking.confirm")}
              </span>
              {s < 3 && <div className={cn("w-12 h-0.5 mx-2", step > s ? "bg-purple" : "bg-muted")} />}
            </div>
          ))}
        </div>

        {/* Step 1: Select Service */}
        {step === 1 && (
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-foreground">{t("booking.selectService")}</h1>
              <p className="text-muted-foreground">{t("booking.selectServiceDesc")}</p>
            </div>
            <div className="grid gap-4">
              {services.map((service) => (
                <Card key={service.id} variant={selectedService?.id === service.id ? "elevated" : "default"} className={cn("cursor-pointer transition-all", selectedService?.id === service.id && "ring-2 ring-purple")} onClick={() => setSelectedService(service)}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-3 rounded-lg bg-purple/10 text-purple"><Scissors className="h-6 w-6" /></div>
                        <div>
                          <h3 className="font-semibold text-lg">{service.name}</h3>
                          <p className="text-sm text-muted-foreground">{service.description}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-purple">${Number(service.price)}</p>
                        <p className="text-sm text-muted-foreground flex items-center gap-1"><Clock className="h-4 w-4" />{service.duration_minutes} {t("services.min")}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="flex justify-between mt-8">
              <Button variant="ghost" onClick={() => navigate("/dashboard")}><ArrowLeft className="h-4 w-4" />{t("booking.back")}</Button>
              <Button variant="hero" disabled={!selectedService} onClick={() => setStep(2)}>{t("booking.continue")}<ArrowRight className="h-4 w-4" /></Button>
            </div>
          </div>
        )}

        {/* Step 2: Select Date & Time */}
        {step === 2 && (
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-foreground">{t("booking.selectDateTime")}</h1>
              <p className="text-muted-foreground">{t("booking.selectDateTimeDesc")}</p>
            </div>
            <div className="grid md:grid-cols-2 gap-8">
              <Card variant="elevated">
                <CardHeader><CardTitle>{t("booking.selectDate")}</CardTitle></CardHeader>
                <CardContent>
                  <Calendar mode="single" selected={selectedDate} onSelect={(date) => { setSelectedDate(date); setSelectedTime(null); }} disabled={isDateDisabled} className="rounded-md" />
                </CardContent>
              </Card>
              <Card variant="elevated">
                <CardHeader>
                  <CardTitle>{t("booking.selectTime")}</CardTitle>
                  <CardDescription>{selectedDate ? format(selectedDate, "EEEE, MMMM d") : t("booking.selectDateFirst")}</CardDescription>
                </CardHeader>
                <CardContent>
                  {selectedDate ? (
                    timeSlots.length > 0 ? (
                      <div className="grid grid-cols-3 gap-2 max-h-[300px] overflow-y-auto">
                        {timeSlots.map((time) => (
                          <Button key={time} variant={selectedTime === time ? "secondary" : "outline"} size="sm" onClick={() => setSelectedTime(time)} className={cn(selectedTime === time && "ring-2 ring-purple")}>
                            {format(new Date(`2000-01-01T${time}`), "h:mm a")}
                          </Button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-muted-foreground py-8">{t("booking.noSlots")}</p>
                    )
                  ) : (
                    <p className="text-center text-muted-foreground py-8">{t("booking.selectDateToSee")}</p>
                  )}
                </CardContent>
              </Card>
            </div>
            <div className="flex justify-between mt-8">
              <Button variant="ghost" onClick={() => setStep(1)}><ArrowLeft className="h-4 w-4" />{t("booking.back")}</Button>
              <Button variant="hero" disabled={!selectedDate || !selectedTime} onClick={() => setStep(3)}>{t("booking.continue")}<ArrowRight className="h-4 w-4" /></Button>
            </div>
          </div>
        )}

        {/* Step 3: Confirm */}
        {step === 3 && selectedService && selectedDate && selectedTime && (
          <div className="max-w-lg mx-auto">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-foreground">{t("booking.confirmBooking")}</h1>
              <p className="text-muted-foreground">{t("booking.reviewDetails")}</p>
            </div>
            <Card variant="elevated">
              <CardContent className="p-8">
                <div className="space-y-6">
                  <div className="p-6 rounded-xl bg-gradient-to-br from-navy to-navy-light text-white">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="p-3 rounded-lg bg-white/10"><Scissors className="h-6 w-6 text-purple-light" /></div>
                      <div>
                        <p className="font-bold text-xl">{selectedService.name}</p>
                        <p className="text-white/70">{selectedService.description}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/20">
                      <div>
                        <p className="text-white/60 text-sm">{t("booking.date")}</p>
                        <p className="font-semibold">{format(selectedDate, "MMMM d, yyyy")}</p>
                      </div>
                      <div>
                        <p className="text-white/60 text-sm">{t("booking.time")}</p>
                        <p className="font-semibold">{format(new Date(`2000-01-01T${selectedTime}`), "h:mm a")}</p>
                      </div>
                      <div>
                        <p className="text-white/60 text-sm">{t("booking.duration")}</p>
                        <p className="font-semibold">{selectedService.duration_minutes} {t("services.min")}</p>
                      </div>
                      <div>
                        <p className="text-white/60 text-sm">{t("booking.price")}</p>
                        <p className="font-semibold text-purple-light text-xl">${Number(selectedService.price)}</p>
                      </div>
                    </div>
                  </div>
                  <Button variant="hero" size="xl" className="w-full" onClick={handleBooking} disabled={isBooking}>
                    {isBooking ? (<><Loader2 className="h-5 w-5 animate-spin" />{t("booking.confirming")}</>) : (<><Check className="h-5 w-5" />{t("booking.confirmBtn")}</>)}
                  </Button>
                </div>
              </CardContent>
            </Card>
            <div className="flex justify-center mt-6">
              <Button variant="ghost" onClick={() => setStep(2)}><ArrowLeft className="h-4 w-4" />{t("booking.back")}</Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
