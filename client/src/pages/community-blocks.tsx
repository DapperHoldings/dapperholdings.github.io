import { CommunityBlockList } from "@/components/community-block-list";
import { AuthButton } from "@/components/auth-button";
import { ShieldLogo } from "@/components/shield-logo";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";

export default function CommunityBlocks() {
  const [location, navigate] = useLocation();

  const { data: session } = useQuery({
    queryKey: ["/api/auth/session"],
  });

  if (!session) {
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
              <h1 className="text-2xl font-bold text-gray-900">Community Blocks</h1>
              <p className="text-sm text-gray-600">
                View and sync community-curated block list
              </p>
            </div>
          </div>
          <AuthButton />
        </div>

        <CommunityBlockList />
      </div>
    </div>
  );
}
