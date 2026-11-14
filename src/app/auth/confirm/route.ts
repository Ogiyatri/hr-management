import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/auth";

/**
 * Redirect dengan Location relatif: host tetap sama dengan yang dibuka user
 * (mis. 127.0.0.1 vs localhost, atau di belakang proxy), sehingga cookie sesi
 * yang baru dibuat ikut terbawa.
 */
const redirectTo = (path: string) => new NextResponse(null, { status: 303, headers: { Location: path } });

/**
 * Tujuan link di email undangan & lupa password:
 * /auth/confirm?token_hash=...&type=invite|recovery&next=/reset-password
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = safeNextPath(searchParams.get("next"));

  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return redirectTo(next);
  }
  return redirectTo("/login?error=link");
}
