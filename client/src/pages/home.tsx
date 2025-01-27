import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { BlockList } from "@/components/block-list";
import { AuthButton } from "@/components/auth-button";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ShieldLogo } from "@/components/shield-logo";
import { useToast } from "@/hooks/use-toast";

export default function Home() {
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: session } = useQuery({
    queryKey: ["/api/auth/session"],
  });

  const { data: blocks, isLoading } = useQuery({
    queryKey: ["/api/blocks"],
    enabled: !!session,
  });

  const { mutate: importBlocks } = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/blocks/import", {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to import blocks");
      const data = await res.json();
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/blocks"] });
      toast({
        title: "Success",
        description: `Successfully imported ${data.importedCount} blocks to the community list`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to import blocks. Please try again.",
        variant: "destructive",
      });
    },
  });

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-sky-100 to-white">
        <div className="container mx-auto px-4 py-16">
          <Card className="max-w-lg mx-auto p-8">
            <div className="flex flex-col items-center justify-center mb-8">
              <ShieldLogo className="h-24 w-24 mb-6" />
              <h1 className="text-3xl font-bold text-gray-900 mb-2">S.H.I.E.L.D.</h1>
              <p className="text-gray-600 text-center text-sm mb-4">
                Spam, Hate, Interference, Exploitation, and Liability Defense
              </p>
            </div>
            <AuthButton className="w-full" />
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-100 to-white">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center">
            <ShieldLogo className="h-8 w-8 mr-3" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">S.H.I.E.L.D.</h1>
              <p className="text-sm text-gray-600">
                Spam, Hate, Interference, Exploitation, and Liability Defense
              </p>
            </div>
          </div>
          <div className="flex gap-4">
            <Button 
              variant="outline"
              onClick={() => importBlocks()}
            >
              Import My Blocks
            </Button>
            <AuthButton />
          </div>
        </div>

        <BlockList 
          blocks={blocks} 
          isLoading={isLoading} 
          userId={session.did}
        />
      </div>
    </div>
  );
}