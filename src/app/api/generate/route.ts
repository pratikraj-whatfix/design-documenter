import { NextResponse } from "next/server";
import { loadConfig, detectAllTranscriptsPaths } from "@/lib/config";
import { getTranscript } from "@/lib/transcripts";
import { generateDocumentation } from "@/lib/doc-generator";

export async function POST(request: Request) {
  const { transcriptIds } = await request.json();

  if (!transcriptIds || transcriptIds.length === 0) {
    return NextResponse.json(
      { error: "Select at least one chat session" },
      { status: 400 }
    );
  }

  const config = loadConfig();
  const dirs: string[] = [];
  if (config.transcriptsPath) dirs.push(config.transcriptsPath);
  dirs.push(...detectAllTranscriptsPaths());
  const uniqueDirs = [...new Set(dirs)];

  if (uniqueDirs.length === 0) {
    return NextResponse.json(
      { error: "No transcripts directory found" },
      { status: 404 }
    );
  }

  const transcriptData = [];
  for (const id of transcriptIds) {
    for (const dir of uniqueDirs) {
      const transcript = getTranscript(dir, id);
      if (transcript) {
        transcriptData.push(transcript);
        break;
      }
    }
  }

  if (transcriptData.length === 0) {
    return NextResponse.json(
      { error: "Could not read any of the selected transcripts" },
      { status: 400 }
    );
  }

  const doc = generateDocumentation(transcriptData);
  return NextResponse.json(doc);
}
