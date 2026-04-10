"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { transportService } from "@/services/transportService";
import { Bus, FileSpreadsheet, Route, Users } from "lucide-react";
import { toast } from "sonner";

export default function TransportReportsPage() {
  const [busOpen, setBusOpen] = useState(false);
  const [routeOpen, setRouteOpen] = useState(false);
  const [busId, setBusId] = useState("");
  const [routeId, setRouteId] = useState("");

  const busesQ = useQuery({
    queryKey: ["transport", "buses"],
    queryFn: () => transportService.listBuses(),
  });

  const routesQ = useQuery({
    queryKey: ["transport", "routes"],
    queryFn: () => transportService.listRoutes(),
  });

  const exportBus = async () => {
    if (!busId) return;
    try {
      await transportService.exportBusStudents(busId);
      toast.success("Download started");
      setBusOpen(false);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Export failed");
    }
  };

  const exportRoute = async () => {
    if (!routeId) return;
    try {
      await transportService.exportRouteStudents(routeId);
      toast.success("Download started");
      setRouteOpen(false);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Export failed");
    }
  };

  const exportContacts = async () => {
    try {
      await transportService.exportContactSheet();
      toast.success("Contact sheet download started");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Export failed");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
        <p className="text-muted-foreground">
          CSV exports for seating lists and emergency contacts.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Bus className="size-5 text-muted-foreground" />
              Bus-wise students
            </CardTitle>
            <CardDescription>Everyone currently assigned to a bus.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button type="button" variant="default" onClick={() => setBusOpen(true)}>
              Export…
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Route className="size-5 text-muted-foreground" />
              Route-wise students
            </CardTitle>
            <CardDescription>All students following a route.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button type="button" variant="default" onClick={() => setRouteOpen(true)}>
              Export…
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="size-5 text-muted-foreground" />
              Contact sheet
            </CardTitle>
            <CardDescription>Driver and helper numbers.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button type="button" variant="outline" onClick={exportContacts}>
              <FileSpreadsheet className="mr-2 size-4" />
              Download contact sheet
            </Button>
          </CardContent>
        </Card>
      </div>

      <Dialog open={busOpen} onOpenChange={setBusOpen}>
        <DialogContent onClose={() => setBusOpen(false)}>
          <DialogHeader>
            <DialogTitle>Export bus students</DialogTitle>
            <DialogDescription>Choose which bus to export.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label>Bus</Label>
            <Select value={busId} onValueChange={setBusId}>
              <SelectTrigger>
                <SelectValue placeholder="Select bus" />
              </SelectTrigger>
              <SelectContent>
                {(busesQ.data ?? []).map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.bus_number}
                    {b.vehicle_number ? ` (${b.vehicle_number})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBusOpen(false)}>
              Cancel
            </Button>
            <Button onClick={exportBus} disabled={!busId}>
              Download CSV
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={routeOpen} onOpenChange={setRouteOpen}>
        <DialogContent onClose={() => setRouteOpen(false)}>
          <DialogHeader>
            <DialogTitle>Export route students</DialogTitle>
            <DialogDescription>Choose a route.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label>Route</Label>
            <Select value={routeId} onValueChange={setRouteId}>
              <SelectTrigger>
                <SelectValue placeholder="Select route" />
              </SelectTrigger>
              <SelectContent>
                {(routesQ.data ?? []).map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRouteOpen(false)}>
              Cancel
            </Button>
            <Button onClick={exportRoute} disabled={!routeId}>
              Download CSV
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
