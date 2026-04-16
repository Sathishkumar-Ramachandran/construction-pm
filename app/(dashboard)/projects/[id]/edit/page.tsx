"use client";
import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import Link from "next/link";
import { api, APIResponse } from "@/lib/api";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageLoader, ErrorBanner } from "@/components/ui/loading";
import { HDB_TOWNS, PROJECT_TYPES } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";

interface ProjectDetail {
  id: number; project_no: string; name: string; project_type: string;
  hdb_block: string; hdb_street: string; hdb_town: string; postal_code: string;
  town_council: string; total_floors: number; total_blocks: number;
  scope_description: string; contract_value: number;
  planned_start_date: string; planned_end_date: string; tc_reference_no: string;
}

export default function EditProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "", project_type: "external_painting",
    hdb_block: "", hdb_street: "", hdb_town: "Ang Mo Kio", postal_code: "",
    town_council: "", total_floors: "", total_blocks: "1",
    scope_description: "", contract_value: "",
    planned_start_date: "", planned_end_date: "", tc_reference_no: "",
  });

  const { data, isLoading } = useSWR(
    `/projects/${id}`,
    () => api.get<APIResponse<ProjectDetail>>(`/projects/${id}`)
  );

  useEffect(() => {
    const p = data?.data;
    if (!p) return;
    setForm({
      name: p.name || "",
      project_type: p.project_type || "external_painting",
      hdb_block: p.hdb_block || "",
      hdb_street: p.hdb_street || "",
      hdb_town: p.hdb_town || "Ang Mo Kio",
      postal_code: p.postal_code || "",
      town_council: p.town_council || "",
      total_floors: p.total_floors ? String(p.total_floors) : "",
      total_blocks: p.total_blocks ? String(p.total_blocks) : "1",
      scope_description: p.scope_description || "",
      contract_value: p.contract_value ? String(p.contract_value) : "",
      planned_start_date: p.planned_start_date || "",
      planned_end_date: p.planned_end_date || "",
      tc_reference_no: p.tc_reference_no || "",
    });
  }, [data]);

  const set = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const payload = {
        ...form,
        total_floors: form.total_floors ? parseInt(form.total_floors) : undefined,
        total_blocks: parseInt(form.total_blocks) || 1,
        contract_value: form.contract_value ? parseFloat(form.contract_value) : undefined,
        planned_start_date: form.planned_start_date || undefined,
        planned_end_date: form.planned_end_date || undefined,
      };
      await api.patch(`/projects/${id}`, payload);
      router.push(`/projects/${id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update project");
    } finally {
      setLoading(false);
    }
  };

  if (isLoading) return <PageLoader />;

  return (
    <div className="flex flex-col min-h-full">
      <Header
        title="Edit Project"
        subtitle={data?.data?.name}
        actions={
          <Link href={`/projects/${id}`}>
            <Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4" /> Back</Button>
          </Link>
        }
      />

      <div className="flex-1 p-6">
        <form onSubmit={handleSubmit} className="max-w-3xl space-y-6">
          {error && <ErrorBanner message={error} />}

          <Card>
            <CardHeader><CardTitle>Project Information</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Select label="Project Type *" value={form.project_type} onChange={(e) => set("project_type", e.target.value)}>
                {PROJECT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </Select>
              <Input label="Project Name *" value={form.name} onChange={(e) => set("name", e.target.value)} required />
              <Textarea label="Scope of Works" value={form.scope_description} onChange={(e) => set("scope_description", e.target.value)} rows={3} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>HDB Location</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Input label="Block Number *" value={form.hdb_block} onChange={(e) => set("hdb_block", e.target.value)} required />
                <Input label="Street *" className="sm:col-span-2" value={form.hdb_street} onChange={(e) => set("hdb_street", e.target.value)} required />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Select label="HDB Town *" value={form.hdb_town} onChange={(e) => set("hdb_town", e.target.value)}>
                  {HDB_TOWNS.map((t) => <option key={t} value={t}>{t}</option>)}
                </Select>
                <Input label="Postal Code" value={form.postal_code} onChange={(e) => set("postal_code", e.target.value)} />
                <Input label="No. of Floors" type="number" value={form.total_floors} onChange={(e) => set("total_floors", e.target.value)} />
              </div>
              <Input label="Town Council *" value={form.town_council} onChange={(e) => set("town_council", e.target.value)} required />
              <Input label="TC Reference Number" value={form.tc_reference_no} onChange={(e) => set("tc_reference_no", e.target.value)} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Contract & Timeline</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="Contract Value (SGD)" type="number" value={form.contract_value} onChange={(e) => set("contract_value", e.target.value)} />
                <Input label="No. of Blocks" type="number" value={form.total_blocks} onChange={(e) => set("total_blocks", e.target.value)} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="Planned Start Date" type="date" value={form.planned_start_date} onChange={(e) => set("planned_start_date", e.target.value)} />
                <Input label="Planned End Date" type="date" value={form.planned_end_date} onChange={(e) => set("planned_end_date", e.target.value)} />
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center gap-3">
            <Button type="submit" size="lg" loading={loading}>Save Changes</Button>
            <Link href={`/projects/${id}`}><Button type="button" variant="outline" size="lg">Cancel</Button></Link>
          </div>
        </form>
      </div>
    </div>
  );
}
