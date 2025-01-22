import { Button } from "@/components/ui/button";
import { loginWithBlueSky } from "@/lib/bluesky";
import { useMutation } from "@tanstack/react-query";
import { LogIn } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AuthButtonProps {
  onSuccess?: () => void;
}

export default function AuthButton({ onSuccess }: AuthButtonProps) {
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: async () => {
      const credentials = await loginWithBlueSky();
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
        credentials: "include",
      });
      
      if (!res.ok) throw new Error("Failed to authenticate");
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Successfully authenticated",
        description: `Welcome, ${data.handle}!`,
      });
      onSuccess?.();
    },
    onError: (error) => {
      toast({
        title: "Authentication failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <Button
      size="lg"
      onClick={() => mutation.mutate()}
      disabled={mutation.isPending}
    >
      <LogIn className="mr-2 h-5 w-5" />
      {mutation.isPending ? "Connecting..." : "Connect with BlueSky"}
    </Button>
  );
}
