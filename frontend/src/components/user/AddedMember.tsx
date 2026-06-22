import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const email = "Kenson Benson";

export default function AddedMember() {
  return (
    <div className="flex">
      {/* Avatar Profile */}
      <div className="flex flex-row flex-wrap items-center gap-6 md:gap-12">
        <Avatar>
          <AvatarImage
            src="https://github.com/shadcn.png"
            alt="@shadcn"
            className="grayscale"
          />
          <AvatarFallback>CN</AvatarFallback>
        </Avatar>
      </div>
      {/* Email */}
      <div className="">{email}</div>
    </div>
  );
}
