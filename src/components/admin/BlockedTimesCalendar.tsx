import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
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
  startOfWeek,
  endOfWeek,
} from "date-fns";
import { ChevronLeft, ChevronRight, Loader2, Plus, Trash2, Clock } from "lucide-react";

interface BlockedTime {
  id: string;
  start_time: string;
  end_time: string;
  reason: string | null;
}

export function BlockedTimesCalendar() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [blockTimeDialog, setBlockTimeDialog] = useState(false);
  const [blockTimeData, setBlockTimeData] = useState({
    startTime: "",
    endTime: "",
    reason: "",
  });

  const { data: blockedTimes = [], isLoading } = useQuery({
    queryKey: ["admin-blocked-times-calendar", currentDate.toISOString()],
    queryFn: async () => {
      const startDate = startOfMonth(currentDate);
      const endDate = endOfMonth(currentDate);

      const { data, error } = await supabase
        .from("blocked_times")
        .select("*")
        .gte("start_time", startDate.toISOString())
        .lte("start_time", endDate.toISOString())
        .order("start_time", { ascending: true });

      if (error) throw error;
      return data as BlockedTime[];
    },
  });

  const blockTimeMutation = useMutation({
    mutationFn: async () => {
      if (!selectedDay) return;
      
      const dateStr = format(selectedDay, "yyyy-MM-dd");
      const startTime = new Date(`${dateStr}T${blockTimeData.startTime}`);
      const endTime = new Date(`${dateStr}T${blockTimeData.endTime}`);

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
      setBlockTimeData({ startTime: "", endTime: "", reason: "" });
      queryClient.invalidateQueries({ queryKey: ["admin-blocked-times-calendar"] });
    },
    onError: () => {
      toast({ title: "Failed to block time", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("blocked_times").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Blocked time removed" });
      queryClient.invalidateQueries({ queryKey: ["admin-blocked-times-calendar"] });
    },
    onError: () => {
      toast({ title: "Failed to remove blocked time", variant: "destructive" });
    },
  });

  const getBlockedTimesForDay = (date: Date) => {
    return blockedTimes.filter((bt) => isSameDay(parseISO(bt.start_time), date));
  };

  const renderCalendar = () => {
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
          const dayBlockedTimes = getBlockedTimesForDay(day);
          const isCurrentMonth = isSameMonth(day, currentDate);
          const isToday = isSameDay(day, new Date());
          const isSelected = selectedDay && isSameDay(day, selectedDay);

          return (
            <div
              key={day.toISOString()}
              className={cn(
                "min-h-[80px] p-2 border rounded-lg transition-colors cursor-pointer hover:bg-muted/50",
                isCurrentMonth ? "bg-card" : "bg-muted/30",
                isToday && "ring-2 ring-purple",
                isSelected && "bg-purple/10"
              )}
              onClick={() => setSelectedDay(day)}
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
                {dayBlockedTimes.slice(0, 2).map((bt) => (
                  <div
                    key={bt.id}
                    className="text-xs p-1 rounded bg-red-100 text-red-700 truncate"
                  >
                    {format(parseISO(bt.start_time), "HH:mm")} - {format(parseISO(bt.end_time), "HH:mm")}
                  </div>
                ))}
                {dayBlockedTimes.length > 2 && (
                  <div className="text-xs text-muted-foreground">
                    +{dayBlockedTimes.length - 2} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const selectedDayBlockedTimes = selectedDay ? getBlockedTimesForDay(selectedDay) : [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-purple" />
      </div>
    );
  }

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      {/* Calendar */}
      <Card variant="elevated" className="lg:col-span-2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Blocked Time Slots</CardTitle>
              <CardDescription>
                Block specific times to prevent customer bookings
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCurrentDate(subMonths(currentDate, 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium min-w-[120px] text-center">
                {format(currentDate, "MMMM yyyy")}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCurrentDate(addMonths(currentDate, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>{renderCalendar()}</CardContent>
      </Card>

      {/* Selected Day Details */}
      <Card variant="elevated">
        <CardHeader>
          <CardTitle className="text-lg">
            {selectedDay
              ? format(selectedDay, "EEEE, MMM d")
              : "Select a Day"}
          </CardTitle>
          <CardDescription>
            {selectedDay
              ? "Manage blocked times for this day"
              : "Click on a day to view or add blocked times"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {selectedDay ? (
            <div className="space-y-4">
              {/* Add Block Time Button */}
              <Dialog open={blockTimeDialog} onOpenChange={setBlockTimeDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full">
                    <Plus className="h-4 w-4" />
                    Block Time Slot
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Block Time</DialogTitle>
                    <DialogDescription>
                      Block off time for {format(selectedDay, "MMMM d, yyyy")}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
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
                        placeholder="e.g., Lunch break, Personal"
                      />
                    </div>
                    <Button
                      className="w-full"
                      variant="hero"
                      onClick={() => blockTimeMutation.mutate()}
                      disabled={
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

              {/* List of Blocked Times */}
              {selectedDayBlockedTimes.length > 0 ? (
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Blocked Times</Label>
                  {selectedDayBlockedTimes.map((bt) => (
                    <div
                      key={bt.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-red-50"
                    >
                      <div className="flex items-center gap-3">
                        <Clock className="h-4 w-4 text-red-600" />
                        <div>
                          <p className="font-medium text-sm">
                            {format(parseISO(bt.start_time), "h:mm a")} -{" "}
                            {format(parseISO(bt.end_time), "h:mm a")}
                          </p>
                          {bt.reason && (
                            <p className="text-xs text-muted-foreground">{bt.reason}</p>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-600 hover:text-red-700 hover:bg-red-100"
                        onClick={() => deleteMutation.mutate(bt.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No blocked times for this day
                </p>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Select a day from the calendar</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
