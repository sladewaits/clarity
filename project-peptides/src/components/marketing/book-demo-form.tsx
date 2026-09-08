"use client";
import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/misc";

export function BookDemoForm() {
  const [sent, setSent] = useState(false);

  if (sent) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-20 text-center">
          <CheckCircle2 className="size-12 text-success" />
          <h2 className="mt-4 text-xl font-semibold">Thanks — we&apos;ll be in touch.</h2>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">This is a demo form and nothing was submitted. In production this would create a lead and notify our team.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form
          onSubmit={(e) => { e.preventDefault(); setSent(true); }}
          className="space-y-4"
        >
          <div className="grid grid-cols-2 gap-4">
            <div><Label>First name</Label><Input className="mt-1" required placeholder="Alex" /></div>
            <div><Label>Last name</Label><Input className="mt-1" required placeholder="Rivera" /></div>
          </div>
          <div><Label>Work email</Label><Input className="mt-1" type="email" required placeholder="alex@clinic.health" /></div>
          <div><Label>Clinic / organization</Label><Input className="mt-1" required placeholder="Apex Longevity" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Locations</Label>
              <Select className="mt-1" defaultValue="1"><option value="1">1</option><option value="2-4">2–4</option><option value="5+">5+</option></Select>
            </div>
            <div>
              <Label>Primary program</Label>
              <Select className="mt-1" defaultValue="weight"><option value="weight">Weight management</option><option value="hormone">Hormone</option><option value="recovery">Recovery</option><option value="longevity">Longevity</option><option value="other">Other</option></Select>
            </div>
          </div>
          <div><Label>What would you like to see?</Label><Textarea className="mt-1" placeholder="Tell us about your clinic and goals…" /></div>
          <Button type="submit" className="w-full">Request my demo</Button>
          <p className="text-center text-xs text-muted-foreground">Demo form · no data is submitted or stored.</p>
        </form>
      </CardContent>
    </Card>
  );
}
