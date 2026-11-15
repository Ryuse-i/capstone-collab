import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentUser } from "@/hooks/useAuth";
import { useUpdateMyProfile } from "@/hooks/useUser"; // adjust path

export default function ProfileSettings() {
  const { data: user, isLoading } = useCurrentUser();
  const updateProfile = useUpdateMyProfile();

  const [form, setForm] = useState({ first_name: "", last_name: "" });

  useEffect(() => {
    if (user) {
      setForm({
        first_name: user.first_name ?? "",
        last_name: user.last_name ?? "",
      });
    }
  }, [user]);

  if (isLoading || !user) return <Skeleton className="h-48 w-full" />;

  const first = form.first_name.trim();
  const last = form.last_name.trim();
  const isDirty = first !== (user.first_name ?? "") || last !== (user.last_name ?? "");
  const canSave = isDirty && first.length > 0 && last.length > 0 && !updateProfile.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile.mutate(
      { first_name: first, last_name: last },
      {
        onSuccess: () => toast.success("Profile updated"),
        onError: () => toast.error("Could not update profile"),
      },
    );
  };

  return (
    <form onSubmit={handleSubmit} className="flex max-w-xl flex-col gap-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="first_name">First name</Label>
          <Input
            id="first_name"
            value={form.first_name}
            onChange={(e) => setForm({ ...form, first_name: e.target.value })}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="last_name">Last name</Label>
          <Input
            id="last_name"
            value={form.last_name}
            onChange={(e) => setForm({ ...form, last_name: e.target.value })}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" value={user.email} disabled readOnly />
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={!canSave}>
          {updateProfile.isPending ? "Saving…" : "Save changes"}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={!isDirty}
          onClick={() =>
            setForm({
              first_name: user.first_name ?? "",
              last_name: user.last_name ?? "",
            })
          }
        >
          Reset
        </Button>
      </div>
    </form>
  );
}