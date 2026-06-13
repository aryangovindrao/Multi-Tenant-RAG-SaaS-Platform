"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateOrganization } from "@/hooks/use-organizations";

export default function OnboardingPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const createOrg = useCreateOrganization();

  const handleCreate = () => {
    if (name.trim().length < 2) return;
    createOrg.mutate(
      { name: name.trim() },
      { onSuccess: () => router.push("/dashboard") },
    );
  };

  return (
    <div className="flex min-h-[70svh] items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="bg-primary text-primary-foreground mx-auto mb-2 flex size-10 items-center justify-center rounded-xl">
            <Sparkles className="size-5" />
          </div>
          <CardTitle>Set up your workspace</CardTitle>
          <CardDescription>
            Create an organization to start uploading documents and chatting
            with your knowledge base.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="onboarding-org">Organization name</Label>
            <Input
              id="onboarding-org"
              placeholder="Acme Inc."
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              autoFocus
            />
          </div>
          <Button
            className="w-full"
            onClick={handleCreate}
            disabled={name.trim().length < 2 || createOrg.isPending}
          >
            {createOrg.isPending && <Loader2 className="size-4 animate-spin" />}
            Create workspace
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
