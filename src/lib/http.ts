import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function jsonError(err: unknown) {
  if (process.env.NODE_ENV !== "production") {
    console.error(err);
  }
  if (err instanceof ZodError) {
    return NextResponse.json(
      { error: "bad_request", issues: err.issues },
      { status: 400 }
    );
  }
  if (err && typeof err === "object" && "status" in err) {
    const statusVal = (err as { status?: unknown }).status;
    const status = typeof statusVal === "number" ? statusVal : 500;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "error" },
      { status }
    );
  }
  return NextResponse.json(
    { error: err instanceof Error ? err.message : "error" },
    { status: 500 }
  );
}

