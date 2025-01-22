import { BlockedAccount } from "@db/schema";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, X, AlertTriangle } from "lucide-react";

interface ModerationQueueProps {
  reportedBlocks?: BlockedAccount[];
  isLoading: boolean;
}

export function ModerationQueue({ reportedBlocks, isLoading }: ModerationQueueProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { mutate: moderateBlock } = useMutation({
    mutationFn: async ({ 
      blockId, 
      status, 
      notes 
    }: { 
      blockId: number; 
      status: 'approved' | 'rejected'; 
      notes: string;
    }) => {
      const res = await fetch(`/api/blocks/${blockId}/moderate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, notes }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to moderate block");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/blocks/reported"] });
      toast({
        title: "Success",
        description: "Block moderated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to moderate block",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <Card className="p-4">
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-[200px]" />
                <Skeleton className="h-4 w-[150px]" />
              </div>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  if (!reportedBlocks?.length) {
    return (
      <Card className="p-8 text-center">
        <p className="text-gray-600">No reported blocks to review</p>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <ScrollArea className="h-[600px]">
        <div className="space-y-4">
          {reportedBlocks.map((block) => (
            <div
              key={block.id}
              className="p-4 border rounded-lg space-y-4"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    <p className="font-medium">@{block.handle}</p>
                  </div>
                  <p className="text-sm text-gray-600">
                    Added by @{block.blockedByDid} • {block.reportCount} reports
                  </p>
                  <time className="text-sm text-gray-500">
                    Created {new Date(block.createdAt).toLocaleDateString()}
                  </time>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      moderateBlock({
                        blockId: block.id,
                        status: 'rejected',
                        notes: 'Block removed after review'
                      });
                    }}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Reject
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => {
                      moderateBlock({
                        blockId: block.id,
                        status: 'approved',
                        notes: 'Block approved after review'
                      });
                    }}
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Approve
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </Card>
  );
}
