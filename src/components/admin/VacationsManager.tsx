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
import { format, parseISO, isBefore, isAfter, isSameDay } from "date-fns";
import { Loader2, Plus, Trash2, Palmtree, CalendarRange } from "lucide-react";

interface BlockedDay {
  id: string;
  start_date: string;
  end_date: string;
  reason: string | null;
  created_at: string | null;
}

export function VacationsManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    startDate: "",
    endDate: "",
    reason: "",
  });

  const { data: blockedDays = [], isLoading } = useQuery({
    queryKey: ["admin-blocked-days"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blocked_days")
        .select("*")
        .order("start_date", { ascending: true });

      if (error) throw error;
      return data as BlockedDay[];
    },
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("blocked_days").insert({
        start_date: formData.startDate,
        end_date: formData.endDate,
        reason: formData.reason || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Vacation days blocked successfully" });
      setDialogOpen(false);
      setFormData({ startDate: "", endDate: "", reason: "" });
      queryClient.invalidateQueries({ queryKey: ["admin-blocked-days"] });
    },
    onError: () => {
      toast({ title: "Failed to block days", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("blocked_days").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Vacation period removed" });
      queryClient.invalidateQueries({ queryKey: ["admin-blocked-days"] });
    },
    onError: () => {
      toast({ title: "Failed to remove vacation period", variant: "destructive" });
    },
  });

  const today = format(new Date(), "yyyy-MM-dd");

  // Split into upcoming and past
  const upcoming = blockedDays.filter(
    (bd) => !isBefore(parseISO(bd.end_date), new Date()) || isSameDay(parseISO(bd.end_date), new Date())
  );
  const past = blockedDays.filter(
    (bd) => isBefore(parseISO(bd.end_date), new Date()) && !isSameDay(parseISO(bd.end_date), new Date())
  );

  const getDayCount = (start: string, end: string) => {
    const s = parseISO(start);
    const e = parseISO(end);
    const diff = Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return diff;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-purple" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card variant="elevated">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Palmtree className="h-5 w-5" />
                Vacation / Days Off
              </CardTitle>
              <CardDescription>
                Block full days or date ranges when no appointments can be made
              </CardDescription>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Plus className="h-4 w-4" />
                  Add Vacation
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Block Days Off</DialogTitle>
                  <DialogDescription>
                    Block a date range — no bookings will be available during this period
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Start Date</Label>
                      <Input
                        type="date"
                        min={today}
                        value={formData.startDate}
                        onChange={(e) =>
                          setFormData({ ...formData, startDate: e.target.value, endDate: formData.endDate && formData.endDate < e.target.value ? e.target.value : formData.endDate })
                        }
                      />
                    </div>
                    <div>
                      <Label>End Date</Label>
                      <Input
                        type="date"
                        min={formData.startDate || today}
                        value={formData.endDate}
                        onChange={(e) =>
                          setFormData({ ...formData, endDate: e.target.value })
                        }
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Reason (optional)</Label>
                    <Input
                      value={formData.reason}
                      onChange={(e) =>
                        setFormData({ ...formData, reason: e.target.value })
                      }
                      placeholder="e.g., Annual vacation, Holiday, Personal leave"
                    />
                  </div>
                  <Button
                    className="w-full"
                    variant="hero"
                    onClick={() => addMutation.mutate()}
                    disabled={
                      !formData.startDate ||
                      !formData.endDate ||
                      addMutation.isPending
                    }
                  >
                    {addMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Block Days"
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {upcoming.length > 0 ? (
            <div className="space-y-3">
              <Label className="text-muted-foreground">Upcoming / Active</Label>
              {upcoming.map((bd) => (
                <div
                  key={bd.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-orange-50 dark:bg-orange-950/20"
                >
                  <div className="flex items-center gap-3">
                    <CalendarRange className="h-5 w-5 text-orange-600" />
                    <div>
                      <p className="font-medium">
                        {format(parseISO(bd.start_date), "MMM d, yyyy")} –{" "}
                        {format(parseISO(bd.end_date), "MMM d, yyyy")}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {getDayCount(bd.start_date, bd.end_date)} day{getDayCount(bd.start_date, bd.end_date) > 1 ? "s" : ""}
                        {bd.reason && ` • ${bd.reason}`}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-red-600 hover:text-red-700 hover:bg-red-100"
                    onClick={() => deleteMutation.mutate(bd.id)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Palmtree className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No upcoming vacation days</p>
              <p className="text-sm">Add days off to prevent bookings during that period</p>
            </div>
          )}

          {past.length > 0 && (
            <div className="space-y-3 mt-6">
              <Label className="text-muted-foreground">Past</Label>
              {past.map((bd) => (
                <div
                  key={bd.id}
                  className="flex items-center justify-between p-4 rounded-lg border opacity-60"
                >
                  <div className="flex items-center gap-3">
                    <CalendarRange className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">
                        {format(parseISO(bd.start_date), "MMM d, yyyy")} –{" "}
                        {format(parseISO(bd.end_date), "MMM d, yyyy")}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {getDayCount(bd.start_date, bd.end_date)} day{getDayCount(bd.start_date, bd.end_date) > 1 ? "s" : ""}
                        {bd.reason && ` • ${bd.reason}`}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-red-600 hover:text-red-700 hover:bg-red-100"
                    onClick={() => deleteMutation.mutate(bd.id)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
