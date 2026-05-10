import { prisma } from "@/lib/db";
import { LogLevel, LogCategory, Prisma } from "@prisma/client";

interface LogParams {
  level: LogLevel;
  category: LogCategory;
  message: string;
  companyId?: number;
  userId?: number;
  details?: Record<string, unknown>;
  requestPath?: string;
  requestMethod?: string;
  statusCode?: number;
  durationMs?: number;
}

export async function writeLog(params: LogParams): Promise<void> {
  try {
    await prisma.appLog.create({
      data: {
        company_id: params.companyId ?? null,
        level: params.level,
        category: params.category,
        message: params.message,
        details: params.details as Prisma.InputJsonValue ?? undefined,
        user_id: params.userId ?? null,
        request_path: params.requestPath ?? null,
        request_method: params.requestMethod ?? null,
        status_code: params.statusCode ?? null,
        duration_ms: params.durationMs ?? null,
      },
    });
  } catch {
    console.error("[Logger] Failed to write log:", params.message);
  }
}

export const log = {
  info: (msg: string, params?: Partial<LogParams>) =>
    writeLog({ level: "INFO", category: "SYSTEM", message: msg, ...params }),

  warn: (msg: string, params?: Partial<LogParams>) =>
    writeLog({ level: "WARN", category: "SYSTEM", message: msg, ...params }),

  error: (msg: string, params?: Partial<LogParams>) =>
    writeLog({ level: "ERROR", category: "SYSTEM", message: msg, ...params }),

  api: (
    path: string,
    method: string,
    status: number,
    ms: number,
    params?: Partial<LogParams>
  ) =>
    writeLog({
      level: status >= 500 ? "ERROR" : "INFO",
      category: status >= 400 ? "API_ERROR" : "API_REQUEST",
      message: `${method} ${path} → ${status} (${ms}ms)`,
      requestPath: path,
      requestMethod: method,
      statusCode: status,
      durationMs: ms,
      ...params,
    }),

  auth: (msg: string, userId?: number, params?: Partial<LogParams>) =>
    writeLog({
      level: "INFO",
      category: "AUTH_EVENT",
      message: msg,
      userId,
      ...params,
    }),

  cron: (msg: string, params?: Partial<LogParams>) =>
    writeLog({
      level: "INFO",
      category: "CRON_JOB",
      message: msg,
      ...params,
    }),
};
