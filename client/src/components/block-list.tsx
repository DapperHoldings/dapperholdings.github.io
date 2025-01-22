import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Trash2, Tag } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { CategorySelect } from "./category-manager";
import EditReasonDialog from "./edit-reason-dialog";

interface BlockedAccount {
  id: number;
  did: string;
  handle: string;
  reason?: string;
  categoryId?: number;
  createdAt: string;
}

interface BlockListProps {
  blocks: BlockedAccount[];
  isLoading: boolean;
}

export default function BlockList({ blocks, isLoading }: BlockListProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/blocks/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to remove block");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/blocks"] });
      toast({
        title: "Block removed",
        description: "The account has been unblocked",
      });
    },
  });

  const updateCategoryMutation = useMutation({
    mutationFn: async ({ id, categoryId }: { id: number; categoryId: number }) => {
      const res = await fetch(`/api/blocks/${id}/category`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ categoryId }),
      });
      if (!res.ok) throw new Error("Failed to update category");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/blocks"] });
      toast({
        title: "Category updated",
        description: "The block category has been updated",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Handle</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>Reason</TableHead>
          <TableHead>Date</TableHead>
          <TableHead className="w-[160px]">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {blocks.map((block) => (
          <TableRow key={block.id}>
            <TableCell>{block.handle}</TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-muted-foreground" />
                <CategorySelect
                  value={block.categoryId}
                  onChange={(categoryId) =>
                    updateCategoryMutation.mutate({ id: block.id, categoryId })
                  }
                />
              </div>
            </TableCell>
            <TableCell>
              {block.reason ? (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {block.reason}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  No reason provided
                </p>
              )}
            </TableCell>
            <TableCell>
              {new Date(block.createdAt).toLocaleDateString()}
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                <EditReasonDialog
                  blockId={block.id}
                  currentReason={block.reason}
                />
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => deleteMutation.mutate(block.id)}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}