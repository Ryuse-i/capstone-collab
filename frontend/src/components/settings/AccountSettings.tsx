import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default function AccountSettings() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");

  return (
    <div className="flex flex-col gap-6 p-6 bg-card border border-border rounded-lg">
      
      {/* Avatar upload */}
      <div className="flex items-center gap-4">
        <Avatar className="h-16 w-16">
          <AvatarFallback className="bg-muted">
            <span className="text-muted-foreground text-xl">👤</span>
          </AvatarFallback>
        </Avatar>
        <Button variant="default" size="sm">Upload image</Button>
      </div>

      {/* First Name */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="firstName">First Name</Label>
        <Input
          id="firstName"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          placeholder=""
        />
      </div>

      {/* Last Name */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="lastName">Last Name</Label>
        <Input
          id="lastName"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          placeholder=""
        />
        <p className="text-xs text-muted-foreground">
          This is the name that will be displayed on your profile and in emails.
        </p>
      </div>

      {/* Email */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder=""
        />
        <p className="text-xs text-muted-foreground">
          You can manage verified email addresses in your{" "}
          <a href="#" className="underline underline-offset-4 hover:text-primary">
            email settings
          </a>.
        </p>
      </div>

      <Button className="w-fit">Update Preference</Button>
    </div>
  );
}