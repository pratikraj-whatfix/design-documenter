import { NextResponse } from "next/server";
import { loadConfig, detectAllTranscriptsPaths } from "@/lib/config";
import { getTranscript } from "@/lib/transcripts";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const config = loadConfig();

  const dirs: string[] = [];
  if (config.transcriptsPath) dirs.push(config.transcriptsPath);
  dirs.push(...detectAllTranscriptsPaths());
  const uniqueDirs = [...new Set(dirs)];

  if (uniqueDirs.length === 0) {
    return NextResponse.json({ error: "No transcripts directory" }, { status: 404 });
  }

  for (const dir of uniqueDirs) {
    const transcript = getTranscript(dir, id);
    if (transcript) return NextResponse.json(transcript);
  }

  return NextResponse.json({ error: "Transcript not found" }, { status: 404 });
}
