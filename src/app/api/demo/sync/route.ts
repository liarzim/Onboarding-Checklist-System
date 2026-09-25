import { NextResponse } from "next/server";
import { loadTestStore, saveTestStore, setDemoCandidateCookie } from "@/lib/testStore";
import { sheetsRepository } from "@/lib/repositories/sheetsRepository";
import type { Candidate } from "@/types/schema";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const candidates: Candidate[] = Array.isArray(body?.candidates) ? body.candidates : [];

    if (candidates.length === 0) {
      return NextResponse.json({ success: true, count: 0 });
    }

    const testStore = loadTestStore();
    const deletedSet = new Set(testStore.deletedCandidateIds || []);
    for (const cand of candidates) {
      if (!cand.candidate_id || deletedSet.has(cand.candidate_id)) continue;
      const idx = testStore.candidates.findIndex((c) => c.candidate_id === cand.candidate_id);
      if (idx >= 0) {
        testStore.candidates[idx] = { ...testStore.candidates[idx], ...cand };
      } else {
        testStore.candidates.unshift(cand);
      }
    }
    saveTestStore(testStore);

    const response = NextResponse.json({
      success: true,
      count: testStore.candidates.length,
    });

    // Sync most recent candidate to cookie to refresh cookie state
    if (candidates[0]) {
      setDemoCandidateCookie(response, candidates[0]);
    }

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sync error";
    return NextResponse.json({ error: "Server Error", message }, { status: 500 });
  }
}
