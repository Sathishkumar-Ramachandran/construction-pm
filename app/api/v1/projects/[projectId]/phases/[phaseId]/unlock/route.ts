import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser, requireProjectAccess, ok, err } from "@/lib/server/helpers";
import { checkPhaseGate } from "@/lib/server/project-service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string; phaseId: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user) return err("Unauthorized", 401);
    const { projectId, phaseId } = await params;
    const pid = parseInt(projectId);

    const hasAccess = await requireProjectAccess(user, pid);
    if (!hasAccess) return err("Access denied", 403);

    if (!["super_admin", "company_admin", "project_manager"].includes(user.role)) {
      return err("Insufficient permissions", 403);
    }

    const phase = await prisma.projectPhase.findFirst({
      where: { id: parseInt(phaseId), project_id: pid },
    });
    if (!phase) return err("Phase not found", 404);

    if (phase.status !== "locked") {
      return ok({ phase_no: phase.phase_no, status: phase.status }, "Phase already unlocked");
    }

    const gateResult = await checkPhaseGate(pid, phase.phase_no);
    if (!gateResult.can_unlock) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          message: "Phase gate requirements not met",
          detail: { message: "Phase gate requirements not met", unmet_requirements: gateResult.unmet_requirements },
          errors: [],
        },
        { status: 422 }
      );
    }

    await prisma.projectPhase.update({
      where: { id: parseInt(phaseId) },
      data: { status: "unlocked", actual_start_date: new Date() },
    });

    return ok({ phase_no: phase.phase_no, status: "unlocked" }, "Phase unlocked successfully");
  } catch (e) {
    console.error(e);
    return err("Internal server error", 500);
  }
}
