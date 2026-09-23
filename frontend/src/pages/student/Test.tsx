import { useEffect, useState } from "react";
import { getCurrentUser } from "@/services/api";

export default function Test() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getCurrentUser()
      .then((data) => {
        setUser(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-2"></div>
        <p className="ml-2">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="text-center">
          <div className="rounded-full h-8 w-8 border-b-2 border-destructive mb-2">
            {/* Error icon */}
          </div>
          <p className="text-foreground">Error: {error}</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <p className="text-foreground">No user data available</p>
      </div>
    );
  }

  return (
    <div>
      <p>{user.id}</p>
    </div>
  );
}
