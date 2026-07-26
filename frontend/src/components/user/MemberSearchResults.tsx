import { Popover, PopoverContent } from "@/components/ui/popover";
import type { UserRead } from "@/services/api";
import AddedMember from "./AddedMember";

export default function MemberSearchResults({ users }: { users: UserRead[] }) {
  return (
    <div>
      <Popover open={users.length > 0}>
        <PopoverContent>
          {users.map((user) => {
            return (
              <div key={user.id}>
                <AddedMember user={user} />
              </div>
            );
          })}
        </PopoverContent>
      </Popover>
    </div>
  );
}
