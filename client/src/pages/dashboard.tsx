import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import BlockList from "@/components/block-list";
import StatsCard from "@/components/stats-card";
import { useToast } from "@/hooks/use-toast";
import { Shield, Users, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { CategoryManager } from "@/components/category-manager";

interface BlockedAccount {
  id: number;
  did: string;
  handle: string;
  reason?: string;
  categoryId?: number;
  createdAt: string;
  blockedBy: {
    handle: string;
  };
}

export default function Dashboard() {
  const { toast } = useToast();
  const [_, navigate] = useLocation();
  const queryClient = useQueryClient();

  const { data: user, isError: isAuthError } = useQuery({
    queryKey: ["/api/me"],
  });

  const { data: personalBlocks, isLoading: isPersonalBlocksLoading } = useQuery<BlockedAccount[]>({
    queryKey: ["/api/blocks"],
    enabled: !!user,
  });

  const { data: communityBlocks, isLoading: isCommunityBlocksLoading } = useQuery<BlockedAccount[]>({
    queryKey: ["/api/blocks/community"],
    enabled: !!user,
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/blocks/sync", {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to sync blocks");
      }
      return res.json();
    },
    onSuccess: (data) => {
      const message = [];
      message.push(`Found ${data.totalFetched} blocks`);

      if (data.selfBlocksFiltered > 0) {
        message.push(`Prevented ${data.selfBlocksFiltered} self-blocks`);
      }

      message.push(`Added ${data.newlyAdded} new blocks`);

      if (data.existing > 0) {
        message.push(`(${data.existing} already existed)`);
      }

      toast({
        title: "Successfully synced blocks",
        description: message.join(". "),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/blocks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/blocks/community"] });
    },
    onError: (error) => {
      toast({
        title: "Failed to sync blocks",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (isAuthError) {
    navigate("/");
    return null;
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Please login to view your dashboard
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isLoading = isPersonalBlocksLoading || isCommunityBlocksLoading;
  const blocks = personalBlocks || [];
  const totalCommunityBlocks = communityBlocks?.length || 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Block List Dashboard</h1>
          <div className="flex gap-4">
            <CategoryManager />
            <Button
              onClick={() => syncMutation.mutate()}
              disabled={syncMutation.isPending}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
              {syncMutation.isPending ? 'Syncing...' : 'Sync Blocks'}
            </Button>
          </div>
        </div>

        <div className="grid gap-6 mb-8 md:grid-cols-2 lg:grid-cols-3">
          <StatsCard
            title="Your Blocks"
            value={blocks.length}
            icon={Shield}
          />
          <StatsCard
            title="Community Blocks"
            value={totalCommunityBlocks}
            icon={Users}
          />
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>S.H.I.E.L.D. Firewall Protection</CardTitle>
            <CardDescription>
              Your account is protected by the S.H.I.E.L.D. firewall. Any accounts blocked by the community
              are automatically blocked for all connected users, creating a safer environment through
              collective moderation.
            </CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Your Block List</CardTitle>
          </CardHeader>
          <CardContent>
            <BlockList blocks={blocks} isLoading={isLoading} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}