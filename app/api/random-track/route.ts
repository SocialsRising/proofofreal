import { NextResponse } from "next/server";

const API_KEY = process.env.YT_API_KEY!;
const PLAYLIST_ID = process.env.YT_PLAYLIST_ID!;

export async function GET() {
  if (!API_KEY || !PLAYLIST_ID) {
    return NextResponse.json(
      { error: "Missing YouTube API config" },
      { status: 500 }
    );
  }

  try {
    const url =
      "https://www.googleapis.com/youtube/v3/playlistItems" +
      `?part=contentDetails&maxResults=50&playlistId=${PLAYLIST_ID}&key=${API_KEY}`;

    const res = await fetch(url);
    if (!res.ok) {
      return NextResponse.json({ error: "YouTube API error" }, { status: 500 });
    }

    const data = await res.json();
    const items = data.items ?? [];

    if (!items.length) {
      return NextResponse.json(
        { error: "Playlist has no videos" },
        { status: 500 }
      );
    }

    const randomItem =
      items[Math.floor(Math.random() * items.length)];
    const videoId = randomItem.contentDetails?.videoId;

    if (!videoId) {
      return NextResponse.json(
        { error: "No videoId found" },
        { status: 500 }
      );
    }

    return NextResponse.json({ videoId });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch random track" },
      { status: 500 }
    );
  }
}
