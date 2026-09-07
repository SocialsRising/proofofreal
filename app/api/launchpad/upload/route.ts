import { NextResponse } from "next/server";
import { db } from "../_db";

/** Token images go to the public `launchpad` Supabase Storage bucket. Without Supabase, launches proceed without an image. */
export async function POST(req: Request) {
  const fd = await req.formData();
  const file = fd.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "no file" }, { status: 400 });
  if (file.size > 4 * 1024 * 1024) return NextResponse.json({ error: "Image must be under 4 MB" }, { status: 400 });
  const client = db();
  if (!client) return NextResponse.json({ url: null, note: "storage not configured" });
  const ext = (file.type.split("/")[1] || "png").replace("jpeg", "jpg");
  const path = `tokens/${crypto.randomUUID()}.${ext}`;
  const { error } = await client.storage.from("launchpad").upload(path, Buffer.from(await file.arrayBuffer()), { contentType: file.type, upsert: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const { data } = client.storage.from("launchpad").getPublicUrl(path);
  return NextResponse.json({ url: data.publicUrl });
}
