import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useState } from "react";

interface Block {
  id: number;
  handle: string;
  did: string;
  blockedByDid: string;
  reason?: string;
  category: string;
}

interface CommunityBlockListProps {
  userId?: string;
}

export function CommunityBlockList({ userId }: CommunityBlockListProps) {
  const { toast } = useToast();
  const [selectedBlocks, setSelectedBlocks] = useState<number[]>([]);

  // Fetch community blocks directly from the JSON file
  const { data: communityBlocks, isLoading } = useQuery<Block[]>({
    queryKey: ["/community-blocklist.json"],
    queryFn: async () => {
      const res = await fetch("/community-blocklist.json");
      if (!res.ok) throw new Error("Failed to load community blocks");
      const data = await res.json();
      return data.blocks;
    }
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

  if (!communityBlocks?.length) {
    return (
      <Card className="p-8 text-center">
        <p className="text-gray-600">No community blocks available</p>
      </Card>
    );
  }

  const blocksByCategory = communityBlocks.reduce((acc, block) => {
    const category = block.category || 'spam';
    if (!acc[category]) acc[category] = [];
    acc[category].push(block);
    return acc;
  }, {} as Record<string, Block[]>);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Community Block List</h2>
          <p className="text-sm text-gray-600">
            Select accounts to block on your Bluesky account
          </p>
        </div>
        {selectedBlocks.length > 0 && (
          <Button 
            onClick={() => console.log('Selected blocks:', selectedBlocks)}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Sync {selectedBlocks.length} to Bluesky
          </Button>
        )}
      </div>

      <div className="grid gap-4">
        {Object.entries(blocksByCategory).map(([category, blocks]) => (
          <Card key={category} className="p-4">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              {category.charAt(0).toUpperCase() + category.slice(1)}
              <Badge variant="secondary">{blocks.length}</Badge>
            </h3>
            <ScrollArea className="h-[300px] pr-4">
              <div className="space-y-4">
                {blocks.map((block) => (
                  <div
                    key={block.id}
                    className="flex items-center gap-4 p-4 border rounded-lg hover:bg-gray-50"
                  >
                    <Checkbox
                      id={`block-${block.id}`}
                      checked={selectedBlocks.includes(block.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedBlocks(prev => [...prev, block.id]);
                        } else {
                          setSelectedBlocks(prev => prev.filter(id => id !== block.id));
                        }
                      }}
                    />
                    <div>
                      <label 
                        htmlFor={`block-${block.id}`}
                        className="block font-medium cursor-pointer"
                      >
                        @{block.handle}
                      </label>
                      <p className="text-sm text-gray-600">
                        Added by @{block.blockedByDid}
                      </p>
                      {block.reason && (
                        <p className="text-sm text-gray-500 mt-1">
                          {block.reason}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </Card>
        ))}
      </div>
    </div>
  );
}