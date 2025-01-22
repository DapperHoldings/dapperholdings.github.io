import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { MessagesSquare } from "lucide-react";

interface EditReasonDialogProps {
  blockId: number;
  currentReason?: string;
}

export default function EditReasonDialog({ blockId, currentReason }: EditReasonDialogProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(currentReason || "");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateReasonMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/blocks/${blockId}/reason`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) throw new Error("Failed to update reason");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/blocks"] });
      setOpen(false);
      toast({
        title: "Reason updated",
        description: "The block reason has been updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to update reason",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    updateReasonMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <MessagesSquare className="h-4 w-4 mr-2" />
          {currentReason ? "Edit Reason" : "Add Reason"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {currentReason ? "Edit Block Reason" : "Add Block Reason"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Why was this account blocked?"
            className="min-h-[100px]"
          />
          <Button
            type="submit"
            disabled={updateReasonMutation.isPending}
            className="w-full"
          >
            {updateReasonMutation.isPending ? "Saving..." : "Save Reason"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
