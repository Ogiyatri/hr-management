"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { dbError, fail, ok, type ActionResult } from "@/lib/action";

const schema = z.object({
  type: z.enum(["in", "out"]),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  accuracy: z.number().nonnegative().optional(),
  photoPath: z.string().min(1),
});

/** Validasi lokasi, jam & selfie dilakukan di fungsi database (clock_in/clock_out). */
export async function clock(input: z.input<typeof schema>): Promise<ActionResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return fail("Data absen tidak lengkap.");
  const { type, lat, lng, accuracy, photoPath } = parsed.data;

  const supabase = await createClient();
  const { error } =
    type === "in"
      ? await supabase.rpc("clock_in", { p_lat: lat, p_lng: lng, p_photo_path: photoPath, p_accuracy_m: accuracy })
      : await supabase.rpc("clock_out", { p_lat: lat, p_lng: lng, p_photo_path: photoPath });

  if (error) {
    // Hapus foto yang sudah terunggah agar storage tidak menumpuk
    await supabase.storage.from("attendance-photos").remove([photoPath]);
    return dbError(error);
  }

  revalidatePath("/absen");
  revalidatePath("/dashboard");
  return ok(type === "in" ? "Absen masuk berhasil. Selamat bekerja!" : "Absen pulang berhasil. Hati-hati di jalan!");
}
