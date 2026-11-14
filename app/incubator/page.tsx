import { redirect } from "next/navigation";

// Elysium is the first ecosystem; other chains get their own /incubator/<chain> later.
export default function IncubatorIndex() {
  redirect("/incubator/elysium");
}
