import { prisma } from "@/lib/db";
import { getAuthUser, getUserProjectIds, ok, created, paginated, err } from "@/lib/server/helpers";
import { seedProjectPhasesAndTasks } from "@/lib/server/project-service";

export async function GET(request: Request) {
  try {
    const user = await getAuthUser(request);
    if (!user) return err("Unauthorized", 401);

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const hdb_town = searchParams.get("hdb_town");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20")));

    const allowedIds = await getUserProjectIds(user);
    const where: Record<string, unknown> = { id: { in: allowedIds } };
    if (status) where.status = status;
    if (hdb_town) where.hdb_town = hdb_town;

    const total = await prisma.project.count({ where });
    const projects = await prisma.project.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    });

    return paginated(projects, total, page, limit);
  } catch (e) {
    console.error(e);
    return err("Internal server error", 500);
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuthUser(request);
    if (!user) return err("Unauthorized", 401);
    if (!["super_admin", "company_admin"].includes(user.role)) {
      return err("Only admins can create projects", 403);
    }

    const body = await request.json();
    const { project_no, name, project_type, hdb_block, hdb_street, hdb_town, postal_code,
      town_council, total_floors, total_blocks, scope_description, contract_value,
      planned_start_date, planned_end_date } = body;

    if (!project_no || !name || !project_type || !hdb_block || !hdb_street || !hdb_town || !town_council) {
      return err("Missing required fields");
    }

    const existing = await prisma.project.findFirst({
      where: { company_id: user.company_id, project_no },
    });
    if (existing) return err("Project number already exists in your company", 409);

    const project = await prisma.project.create({
      data: {
        company_id: user.company_id,
        created_by: user.id,
        project_no, name, project_type, hdb_block, hdb_street, hdb_town,
        postal_code: postal_code || null,
        town_council,
        total_floors: total_floors ? parseInt(total_floors) : null,
        total_blocks: total_blocks ? parseInt(total_blocks) : 1,
        scope_description: scope_description || null,
        contract_value: contract_value ? parseFloat(contract_value) : null,
        planned_start_date: planned_start_date ? new Date(planned_start_date) : null,
        planned_end_date: planned_end_date ? new Date(planned_end_date) : null,
      },
    });

    await seedProjectPhasesAndTasks(project.id);

    await prisma.projectTeam.create({
      data: {
        project_id: project.id,
        user_id: user.id,
        team_role: "project_manager",
        assigned_by: user.id,
      },
    });

    const fullProject = await prisma.project.findUnique({ where: { id: project.id } });
    return created(fullProject, "Project created successfully");
  } catch (e) {
    console.error(e);
    return err("Internal server error", 500);
  }
}
