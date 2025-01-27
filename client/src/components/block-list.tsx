import { BlockedAccount } from "@db/schema";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { TrashIcon, Flag } from "lucide-react";

interface BlockListProps {
  blocks?: BlockedAccount[];
  isLoading: boolean;
  userId?: string;
}

export function BlockList({ blocks, isLoading, userId }: BlockListProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { mutate: removeBlock } = useMutation({
    mutationFn: async (blockId: number) => {
      const res = await fetch(`/api/blocks/${blockId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to remove block");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/blocks"] });
      toast({
        title: "Success",
        description: "Block removed from community list",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to remove block",
        variant: "destructive",
      });
    },
  });

  const { mutate: reportBlock } = useMutation({
    mutationFn: async (blockId: number) => {
      const res = await fetch(`/api/blocks/${blockId}/report`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to report block");
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Block reported for review",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to report block",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <Card className="p-4">
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
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

  if (!blocks?.length) {
    return (
      <Card className="p-8 text-center">
        <p className="text-gray-600">No blocked accounts yet</p>
      </Card>
    );
  }

  // Count unique blocked accounts and contributors
  const uniqueBlocks = new Set(blocks.map(block => block.did)).size;
  const uniqueContributors = new Set(blocks.map(block => block.blockedByDid)).size;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-sky-600">{uniqueBlocks}</p>
          <p className="text-sm text-gray-600">Total Blocked Accounts</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-sky-600">{uniqueContributors}</p>
          <p className="text-sm text-gray-600">Contributors</p>
        </Card>
      </div>

      <Card className="p-4">
        <ScrollArea className="h-[600px]">
          <div className="space-y-4">
            {blocks.map((block) => (
              <div
                key={block.id}
                className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-lg"
              >
                <div>
                  <p className="font-medium">@{block.handle}</p>
                  <p className="text-sm text-gray-600">
                    Blocked by @{block.blockedByDid}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <time className="text-sm text-gray-500 mr-4">
                    {new Date(block.createdAt).toLocaleDateString()}
                  </time>

                  {/* Report Block Dialog */}
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <Flag className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Report Block</DialogTitle>
                        <DialogDescription>
                          Are you sure you want to report this block? This will flag it for review by moderators.
                        </DialogDescription>
                      </DialogHeader>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => {}}>Cancel</Button>
                        <Button onClick={() => reportBlock(block.id)}>
                          Report
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  {/* Remove Block Dialog - Only shown if user is the one who added the block */}
                  {userId === block.blockedByDid && (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <TrashIcon className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Remove Block</DialogTitle>
                          <DialogDescription>
                            Are you sure you want to remove this block from the community list?
                          </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => {}}>Cancel</Button>
                          <Button variant="destructive" onClick={() => removeBlock(block.id)}>
                            Remove
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </Card>
    </div>
  );
}