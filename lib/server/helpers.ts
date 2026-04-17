import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { decodeAccessToken } from "@/lib/server/auth";

export type AuthUser = {
  id: number;
  company_id: number;
  email: string;
  full_name: string;
  phone: string | null;
  role: string;
  avatar_path: string | null;
  is_active: boolean;
  is_invite_accepted: boolean;
};

export function ok(data: unknown = null, message = "Success"): NextResponse {
  return NextResponse.json({ success: true, data, message, errors: [] });
}

export function created(data: unknown = null, message = "Created"): NextResponse {
  return NextResponse.json({ success: true, data, message, errors: [] }, { status: 201 });
}

export function paginated(
  data: unknown[],
  total: number,
  page: number,
  limit: number
): NextResponse {
  return NextResponse.json({
    success: true,
    data,
    message: "Success",
    pagination: { page, limit, total, total_pages: Math.ceil(total / limit) },
  });
}

export function err(message: string, status = 400): NextResponse {
  return NextResponse.json({ success: false, data: null, message, errors: [] }, { status });
}

export async function getAuthUser(request: Request): Promise<AuthUser | null> {
  const auth = request.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  const token = auth.slice(7);
  const payload = await decodeAccessToken(token);
  if (!payload?.sub) return null;

  const user = await prisma.user.findFirst({
    where: { id: Number(payload.sub), is_active: true },
    select: {
      id: true,
      company_id: true,
      email: true,
      full_name: true,
      phone: true,
      role: true,
      avatar_path: true,
      is_active: true,
      is_invite_accepted: true,
    },
  });
  return user as AuthUser | null;
}

export async function requireProjectAccess(
  user: AuthUser,
  projectId: number
): Promise<boolean> {
  if (user.role === "super_admin" || user.role === "company_admin") return true;
  if (user.role === "project_manager") {
    const project = await prisma.project.findFirst({
      where: { id: projectId, company_id: user.company_id },
      select: { id: true },
    });
    if (project) return true;
  }
  const team = await prisma.projectTeam.findFirst({
    where: { project_id: projectId, user_id: user.id, is_active: true },
    select: { id: true },
  });
  return !!team;
}

export async function getUserProjectIds(user: AuthUser): Promise<number[]> {
  if (user.role === "super_admin") {
    const projects = await prisma.project.findMany({ select: { id: true } });
    return projects.map((p) => p.id);
  }
  if (user.role === "company_admin" || user.role === "project_manager") {
    const projects = await prisma.project.findMany({
      where: { company_id: user.company_id },
      select: { id: true },
    });
    return projects.map((p) => p.id);
  }
  const team = await prisma.projectTeam.findMany({
    where: { user_id: user.id, is_active: true },
    select: { project_id: true },
  });
  return team.map((t) => t.project_id);
}

export function formatUser(user: AuthUser) {
  return {
    id: user.id,
    company_id: user.company_id,
    email: user.email,
    full_name: user.full_name,
    phone: user.phone,
    role: user.role,
    avatar_path: user.avatar_path,
    is_active: user.is_active,
    is_invite_accepted: user.is_invite_accepted,
  };
}
