import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { ROLE_LABEL, requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getOptions } from "@/lib/queries";
import { EmployeeForm } from "../employee-form";
import { createEmployee } from "../actions";

export const metadata: Metadata = { title: "Tambah Karyawan" };

export default async function NewEmployeePage() {
  const user = await requireUser(["admin", "hr"]);
  const supabase = await createClient();
  const [options, { data: last }] = await Promise.all([
    getOptions(),
    supabase.from("employees").select("employee_no").like("employee_no", "EMP-%").order("employee_no", { ascending: false }).limit(1).maybeSingle(),
  ]);
  const nextNo = `EMP-${String(Number(last?.employee_no?.replace(/\D/g, "") ?? 0) + 1).padStart(4, "0")}`;
  const roles = (user.role === "admin" ? (["employee", "manager", "hr", "admin"] as const) : (["employee", "manager"] as const)).map(
    (r) => ({ value: r, label: ROLE_LABEL[r] }),
  );

  return (
    <>
      <PageHeader title="Tambah karyawan" back={{ href: "/karyawan", label: "Karyawan" }} />
      <EmployeeForm action={createEmployee} options={options} defaultEmployeeNo={nextNo} canInvite assignableRoles={roles} />
    </>
  );
}
