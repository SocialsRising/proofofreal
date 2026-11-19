// The meme template lives on the launch page now. Old links (including ?token= after a launch) still work.
import { redirect } from "next/navigation";

export default async function MemeRedirect({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  redirect(`/incubator/elysium/launch?template=meme${token && /^0x[0-9a-fA-F]{40}$/.test(token) ? `&token=${token.toLowerCase()}` : ""}`);
}
