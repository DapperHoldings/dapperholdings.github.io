import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ModerationQueue } from "@/components/moderation-queue";
import { AuthButton } from "@/components/auth-button";
import { ShieldLogo } from "@/components/shield-logo";
import { User, BlockedAccount } from "@db/schema";

export default function Moderation() {
  const [location, navigate] = useLocation();

  const { data: session } = useQuery({
    queryKey: ["/api/auth/session"],
  });

  const { data: user } = useQuery<User>({
    queryKey: ["/api/users/me"],
    enabled: !!session,
  });

  const { data: reportedBlocks, isLoading } = useQuery<BlockedAccount[]>({
    queryKey: ["/api/blocks/reported"],
    enabled: !!session && !!user?.isModerator,
  });

  if (!session) {
    navigate("/");
    return null;
  }

  if (!user?.isModerator) {
    navigate("/");
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-100 to-white">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center">
            <ShieldLogo className="h-8 w-8 mr-3" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Moderation Queue</h1>
              <p className="text-sm text-gray-600">
                Review reported blocks
              </p>
            </div>
          </div>
          <AuthButton />
        </div>

        <ModerationQueue 
          reportedBlocks={reportedBlocks} 
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}