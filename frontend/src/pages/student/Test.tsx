import { getCurrentUser } from "@/services/api";

const user = await getCurrentUser();

export default function Test() {
  return (
    <div>
      <p>{user.id}</p>
    </div>
  );
}
