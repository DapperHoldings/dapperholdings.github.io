import { useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { CloudSun } from "lucide-react";

export default function Auth() {
  const [location, navigate] = useLocation();

  const { data: session } = useQuery({
    queryKey: ["/api/auth/session"],
  });

  useEffect(() => {
    if (session) {
      navigate("/");
    }
  }, [session, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-100 to-white flex items-center justify-center">
      <Card className="max-w-md w-full mx-4 p-8">
        <div className="flex items-center justify-center mb-6">
          <CloudSun className="h-12 w-12 text-sky-500 mr-4" />
          <h1 className="text-2xl font-bold text-gray-900">Authenticating...</h1>
        </div>
        <p className="text-center text-gray-600">
          Please wait while we connect to your Bluesky account
        </p>
      </Card>
    </div>
  );
}
