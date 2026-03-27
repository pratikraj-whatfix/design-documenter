import { NextResponse } from "next/server";
import { loadConfig, detectAllTranscriptsPaths } from "@/lib/config";
import { getTranscript } from "@/lib/transcripts";
import { generateDocumentation } from "@/lib/doc-generator";

export async function POST(request: Request) {
  const { transcriptId, sections, userPrompt } = await request.json();

  if (!transcriptId) {
    return NextResponse.json(
      { error: "Select a chat session" },
      { status: 400 }
    );
  }

  if (!sections || sections.length === 0) {
    return NextResponse.json(
      { error: "Enable at least one template section" },
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

  let transcript = null;
  for (const dir of uniqueDirs) {
    transcript = getTranscript(dir, transcriptId);
    if (transcript) break;
  }

  if (!transcript) {
    return NextResponse.json(
      { error: "Could not read the selected transcript" },
      { status: 400 }
    );
  }

  const doc = generateDocumentation(transcript, sections, userPrompt || "");
  return NextResponse.json(doc);
}
