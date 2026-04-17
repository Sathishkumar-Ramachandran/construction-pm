import { prisma } from "@/lib/db";

const PHASE_NAMES = [
  [1, "Pre-Start / Planning"],
  [2, "Site Setup & Protection"],
  [3, "Surface Preparation"],
  [4, "Repair Works"],
  [5, "Painting Application"],
  [6, "Inspection & Touch-Up"],
  [7, "Cleaning & Dismantling"],
] as const;

const TASK_TEMPLATES = [
  [1,"P1-T1","site_inspection","Conduct site inspection & condition survey","Inspect and document existing site conditions",true,true,false,10],
  [1,"P1-T2","document","Prepare method statement","Draft and submit method statement for approval",false,false,false,20],
  [1,"P1-T3","document","Prepare project schedule / programme","Gantt chart or bar chart schedule",false,false,false,30],
  [1,"P1-T4","material","Submit material for approval","Submit paint/repair material TDS and SDS",false,false,false,40],
  [1,"P1-T5","document","Prepare Risk Assessment (RA)","Complete RA form with hazards and controls",false,false,false,50],
  [1,"P1-T6","document","Prepare Safe Work Procedure (SWP)","Detailed SWP for all work activities",false,false,false,60],
  [1,"P1-T7","permit","Apply for Town Council approval","Submit works notice to TC and obtain written approval",false,false,false,70],
  [1,"P1-T8","permit","Apply for Work at Height permit (if needed)","WAH permit for works above 2m",false,false,false,80],
  [1,"P1-T9","permit","Apply for Road Closure permit (if needed)","LTA road closure permit if road is affected",false,false,false,90],
  [2,"P2-T1","safety","Install safety barricades & warning signs","Erect barricades around work area",true,false,true,10],
  [2,"P2-T2","protection","Cover floor, walls, windows & lift lobby","Protect surrounding areas from paint splatter",true,false,true,20],
  [2,"P2-T3","equipment","Setup scaffold / gondola / boom lift","Erect and inspect access equipment",true,false,true,30],
  [2,"P2-T4","equipment","Obtain scaffold inspection certificate","Registered inspector to certify scaffold",false,false,false,40],
  [2,"P2-T5","safety","Conduct toolbox meeting","Brief all workers on safety and work plan",true,false,false,50],
  [2,"P2-T6","checklist","Complete site setup checklist","Sign off site setup safety checklist",false,false,false,60],
  [3,"P3-T1","surface_prep","Hack loose plaster & hollow areas","Use hammer to test and remove hollow plaster",true,true,true,10],
  [3,"P3-T2","surface_prep","Crack repair (V-cut & filler)","V-cut cracks and fill with approved filler",true,true,true,20],
  [3,"P3-T3","surface_prep","Remove peeling paint (scraping/grinding)","Scrape / grind all peeling and loose paint",true,true,true,30],
  [3,"P3-T4","surface_prep","Pressure wash / clean surface","Pressure wash entire surface area",true,false,true,40],
  [3,"P3-T5","surface_prep","Apply anti-fungal wash (if needed)","Apply anti-fungal treatment where fungus found",true,true,true,50],
  [4,"P4-T1","repair","Plastering / patch repair","Apply plaster patch to hacked areas",true,true,true,10],
  [4,"P4-T2","repair","Spalling concrete repair","Treat exposed rebar and apply repair mortar",true,true,true,20],
  [4,"P4-T3","repair","Rebar treatment (if exposed)","Wire brush, apply rust inhibitor to exposed rebar",true,true,true,30],
  [4,"P4-T4","repair","Skim coat / surface leveling","Apply skim coat to achieve smooth surface",true,true,true,40],
  [4,"P4-T5","repair","Seal joints (sealant works)","Apply approved sealant to all joints and gaps",true,true,true,50],
  [5,"P5-T1","painting","Apply 1st coat primer / sealer","Apply approved primer uniformly",true,false,true,10],
  [5,"P5-T2","painting","Apply 1st coat finishing paint","First coat of approved finishing paint",true,false,true,20],
  [5,"P5-T3","painting","Apply 2nd coat finishing paint","Second coat of approved finishing paint",true,false,true,30],
  [5,"P5-T4","painting","Apply waterproof coat (external, if spec)","Apply weatherproof / elastomeric coat",true,false,true,40],
  [5,"P5-T5","painting","Record paint batch numbers","Document batch numbers for all tins used",false,false,false,50],
  [6,"P6-T1","inspection","Conduct internal QC inspection","Supervisor internal quality check",true,false,false,10],
  [6,"P6-T2","inspection","Identify and log all defects","Document all defects with photos",true,false,false,20],
  [6,"P6-T3","touch_up","Rectify all defects / touch-up","Fix all identified defects",true,false,true,30],
  [6,"P6-T4","inspection","Joint inspection with TC officer / consultant","Conduct joint inspection with external party",true,false,false,40],
  [6,"P6-T5","inspection","Obtain joint inspection sign-off","Get written sign-off from TC officer",false,false,false,50],
  [7,"P7-T1","cleaning","Remove all protection sheets & coverings","Remove floor/wall/window protection",true,false,true,10],
  [7,"P7-T2","cleaning","Clean and remove all paint drips / stains","Clean all surrounding areas",true,false,true,20],
  [7,"P7-T3","dismantling","Dismantle scaffold / gondola / equipment","Safely dismantle all access equipment",true,false,true,30],
  [7,"P7-T4","cleaning","Clear and clean entire site","Full site clean up and debris removal",true,false,true,40],
  [7,"P7-T5","documentation","Take final completion photos","Take comprehensive before vs after photos",true,false,true,50],
  [7,"P7-T6","documentation","Submit completion report","Submit final completion report to TC/client",false,false,false,60],
] as const;

export async function seedProjectPhasesAndTasks(projectId: number) {
  for (const [phaseNo, phaseName] of PHASE_NAMES) {
    const phase = await prisma.projectPhase.create({
      data: {
        project_id: projectId,
        phase_no: phaseNo,
        phase_name: phaseName,
        status: phaseNo === 1 ? "unlocked" : "locked",
      },
    });

    const phaseTasks = TASK_TEMPLATES.filter((t) => t[0] === phaseNo);
    for (const [, code, ttype, title, desc, reqPhoto, reqBefore, reqAfter, sort] of phaseTasks) {
      await prisma.phaseTask.create({
        data: {
          phase_id: phase.id,
          task_code: code,
          task_type: ttype,
          title,
          description: desc,
          requires_photo: reqPhoto,
          requires_before_photo: reqBefore,
          requires_after_photo: reqAfter,
          sort_order: sort,
        },
      });
    }
  }
}

export async function calculatePhaseCompletion(phaseId: number): Promise<number> {
  const tasks = await prisma.phaseTask.findMany({ where: { phase_id: phaseId } });
  if (!tasks.length) return 0;
  const completed = tasks.filter((t) => t.status === "completed" || t.status === "not_applicable").length;
  return Math.round((completed / tasks.length) * 100);
}

export async function checkPhaseGate(
  projectId: number,
  nextPhaseNo: number
): Promise<{ can_unlock: boolean; unmet_requirements: { type: string; key: string; description: string }[] }> {
  const unmet: { type: string; key: string; description: string }[] = [];

  if (nextPhaseNo === 2) {
    const tc = await prisma.permit.findFirst({
      where: { project_id: projectId, permit_type: "tc_approval", status: "approved" },
    });
    if (!tc) unmet.push({ type: "permit", key: "tc_approval", description: "Town Council approval must be Approved" });

    for (const [docType, label] of [
      ["method_statement", "Method Statement"],
      ["risk_assessment", "Risk Assessment (RA)"],
      ["safe_work_procedure", "Safe Work Procedure (SWP)"],
    ] as const) {
      const doc = await prisma.document.findFirst({
        where: { project_id: projectId, doc_type: docType, status: "approved" },
      });
      if (!doc) unmet.push({ type: "document", key: docType, description: `${label} must be Approved` });
    }
  } else if (nextPhaseNo === 3) {
    const meeting = await prisma.toolboxMeeting.findFirst({
      where: { project_id: projectId, signed_off_at: { not: null } },
    });
    if (!meeting) unmet.push({ type: "document", key: "toolbox_meeting", description: "At least one signed-off Toolbox Meeting is required" });
  } else if (nextPhaseNo === 4) {
    const repairMats = await prisma.materialSubmittal.findMany({
      where: {
        project_id: projectId,
        material_category: { in: ["cement_filler", "crack_filler", "skim_coat", "sealant", "waterproofing_membrane"] },
      },
    });
    if (!repairMats.length || !repairMats.every((m) => m.status === "approved")) {
      unmet.push({ type: "material_approval", key: "repair_materials", description: "All repair materials must be Approved" });
    }
  } else if (nextPhaseNo === 5) {
    const paintMats = await prisma.materialSubmittal.findMany({
      where: {
        project_id: projectId,
        material_category: { in: ["primer", "sealer", "finishing_paint", "weathercoat", "elastomeric", "emulsion"] },
      },
    });
    if (!paintMats.length || !paintMats.every((m) => m.status === "approved")) {
      unmet.push({ type: "material_approval", key: "paint_system", description: "Paint brand and system must be Approved by consultant/TC" });
    }
    const surfaceInsp = await prisma.inspection.findFirst({
      where: { project_id: projectId, status: { in: ["passed", "passed_with_remarks"] } },
    });
    if (!surfaceInsp) unmet.push({ type: "inspection", key: "surface_prep_inspection", description: "Surface preparation inspection must be Passed" });
  } else if (nextPhaseNo === 6) {
    const paintingInsp = await prisma.inspection.findFirst({
      where: { project_id: projectId, inspection_type: "internal", status: { in: ["passed", "passed_with_remarks"] } },
    });
    if (!paintingInsp) unmet.push({ type: "inspection", key: "painting_inspection", description: "Internal painting inspection must be Passed" });
  } else if (nextPhaseNo === 7) {
    const jointInsp = await prisma.inspection.findFirst({
      where: { project_id: projectId, inspection_type: "joint", signed_off_at: { not: null } },
    });
    if (!jointInsp) unmet.push({ type: "inspection", key: "joint_inspection", description: "Joint inspection with TC officer must be completed and signed off" });
  }

  return { can_unlock: unmet.length === 0, unmet_requirements: unmet };
}
