import { NextResponse } from "next/server";
import { loadConfig, detectAllTranscriptsPaths } from "@/lib/config";
import { listTranscripts } from "@/lib/transcripts";

export async function GET() {
  const config = loadConfig();

  const dirs: string[] = [];
  if (config.transcriptsPath) {
    dirs.push(config.transcriptsPath);
  }
  dirs.push(...detectAllTranscriptsPaths());

  const uniqueDirs = [...new Set(dirs)];

  if (uniqueDirs.length === 0) {
    return NextResponse.json(
      {
        error: "No transcripts directory found. Make sure Cursor has been used in this workspace.",
        transcripts: [],
      },
      { status: 404 }
    );
  }

  const seenIds = new Set<string>();
  const allTranscripts = [];

  for (const dir of uniqueDirs) {
    const transcripts = listTranscripts(dir);
    for (const t of transcripts) {
      if (!seenIds.has(t.id)) {
        seenIds.add(t.id);
        allTranscripts.push({ ...t, source: dir });
      }
    }
  }

  allTranscripts.sort(
    (a, b) =>
      new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime()
  );

  return NextResponse.json({
    transcripts: allTranscripts,
    paths: uniqueDirs,
  });
}
