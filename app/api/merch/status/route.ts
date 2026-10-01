import { NextResponse } from "next/server";

/** Tells the store page which pieces are connected, without exposing any values. */
export async function GET() {
  return NextResponse.json({
    uploads: !!process.env.BLOB_READ_WRITE_TOKEN,
    checkout: !!(process.env.STRIPE_SECRET_KEY && process.env.BLOB_READ_WRITE_TOKEN && process.env.PRINTFUL_API_TOKEN && process.env.STRIPE_WEBHOOK_SECRET),
  }, { headers: { "Cache-Control": "no-store" } });
}
