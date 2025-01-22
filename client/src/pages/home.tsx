import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Shield } from "lucide-react";
import AuthButton from "@/components/auth-button";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

export default function Home() {
  const { toast } = useToast();
  const [_, navigate] = useLocation();

  const handleSuccess = () => {
    toast({
      title: "Successfully authenticated",
      description: "Redirecting to dashboard...",
    });
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-3xl mx-auto text-center">
          <div className="flex justify-center mb-8">
            <Shield className="h-16 w-16 text-primary" />
          </div>

          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
            S.H.I.E.L.D.
          </h1>

          <p className="text-lg text-muted-foreground mb-8">
            Social, Harmony, Innovation, Empowerment, Liberty and Decentralization
          </p>

          <p className="text-lg text-gray-600 mb-8">
            Protect your BlueSky experience with community-driven block lists
          </p>

          <div className="grid gap-8 md:grid-cols-2 mb-8">
            <Card>
              <CardHeader>
                <CardTitle>Import Blocks</CardTitle>
                <CardDescription>
                  Import your existing blocked accounts
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Auto-Update</CardTitle>
                <CardDescription>
                  Stay protected with automatic updates
                </CardDescription>
              </CardHeader>
            </Card>
          </div>

          <AuthButton onSuccess={handleSuccess} />
        </div>
      </div>
    </div>
  );
}