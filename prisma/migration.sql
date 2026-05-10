-- =============================================================================
-- Construction PM — Full Migration SQL
-- Run top-to-bottom in one shot against your PostgreSQL / Neon database.
-- =============================================================================


-- =============================================================================
-- SECTION 1 — ENUM TYPES
-- =============================================================================

CREATE TYPE "AuditAction" AS ENUM (
  'CREATE',
  'UPDATE',
  'DELETE',
  'STATUS_CHANGE',
  'APPROVE',
  'REJECT',
  'SUBMIT',
  'SIGN_OFF',
  'LOGIN',
  'LOGOUT',
  'EXPORT',
  'BULK_UPDATE',
  'ASSIGN',
  'UNASSIGN',
  'ALLOCATE',
  'RECEIVE',
  'MARK_ATTENDANCE'
);

CREATE TYPE "LogLevel" AS ENUM (
  'DEBUG',
  'INFO',
  'WARN',
  'ERROR',
  'CRITICAL'
);

CREATE TYPE "LogCategory" AS ENUM (
  'API_REQUEST',
  'API_ERROR',
  'AUTH_EVENT',
  'CRON_JOB',
  'EMAIL_SENT',
  'NOTIFICATION',
  'BACKGROUND_JOB',
  'SYSTEM'
);

CREATE TYPE "InventoryCategory" AS ENUM (
  'PRIMER',
  'SEALER',
  'FINISHING_PAINT',
  'WEATHERCOAT',
  'ELASTOMERIC',
  'EMULSION',
  'FILLER',
  'SEALANT',
  'PROTECTIVE_COATING',
  'SCAFFOLD_MATERIAL',
  'SAFETY_EQUIPMENT',
  'TOOLS',
  'MISCELLANEOUS'
);

CREATE TYPE "InventoryUnit" AS ENUM (
  'LITRE',
  'KG',
  'BAG',
  'TIN',
  'ROLL',
  'PIECE',
  'SET',
  'M2',
  'M3',
  'BOX'
);

CREATE TYPE "TransactionType" AS ENUM (
  'PURCHASE_RECEIPT',
  'PROJECT_ALLOCATION',
  'PROJECT_RETURN',
  'USAGE_RECORD',
  'MANUAL_ADJUSTMENT',
  'WRITE_OFF',
  'OPENING_STOCK'
);

CREATE TYPE "PurchaseOrderStatus" AS ENUM (
  'DRAFT',
  'ORDERED',
  'PARTIAL',
  'DELIVERED',
  'CANCELLED'
);

CREATE TYPE "EmployeeType" AS ENUM (
  'USER',
  'WORKER'
);

CREATE TYPE "AttendanceStatus" AS ENUM (
  'PRESENT',
  'ABSENT',
  'HALF_DAY',
  'MC',
  'ANNUAL_LEAVE',
  'PUBLIC_HOLIDAY',
  'OFF_DAY'
);

CREATE TYPE "WorkerProjectRole" AS ENUM (
  'PAINTER',
  'PLASTERER',
  'SCAFFOLDER',
  'WATERPROOFER',
  'GENERAL_WORKER',
  'SUPERVISOR',
  'SAFETY_OFFICER'
);

CREATE TYPE "WorkerAssignmentStatus" AS ENUM (
  'ACTIVE',
  'COMPLETED',
  'TRANSFERRED',
  'TERMINATED'
);

CREATE TYPE "ProjectApprovalType" AS ENUM (
  'TC_APPROVAL',
  'HDB_APPROVAL',
  'TOWN_COUNCIL_CLEARANCE',
  'NEA_CLEARANCE',
  'BCA_APPROVAL',
  'FIRE_SAFETY_CLEARANCE',
  'NOISE_EXEMPTION'
);

CREATE TYPE "ProjectApprovalStatus" AS ENUM (
  'NOT_REQUIRED',
  'PENDING',
  'SUBMITTED',
  'APPROVED',
  'REJECTED',
  'EXPIRED'
);


-- =============================================================================
-- SECTION 2 — REPLACE audit_logs
-- (Old table had 7 columns; new version has 19 columns + 4 indexes)
-- WARNING: This drops all existing audit log data.
-- =============================================================================

DROP TABLE IF EXISTS "audit_logs";

CREATE TABLE "audit_logs" (
  "id"             SERIAL          PRIMARY KEY,
  "company_id"     INTEGER         NOT NULL REFERENCES "companies"("id"),
  "actor_id"       INTEGER         NOT NULL REFERENCES "users"("id"),
  "actor_role"     TEXT            NOT NULL,
  "actor_name"     TEXT            NOT NULL,
  "action"         "AuditAction"   NOT NULL,
  "entity_type"    TEXT            NOT NULL,
  "entity_id"      TEXT            NOT NULL,
  "entity_label"   TEXT,
  "project_id"     INTEGER,
  "phase_id"       INTEGER,
  "previous_data"  JSONB,
  "new_data"       JSONB,
  "changed_fields" TEXT[]          NOT NULL DEFAULT '{}',
  "change_reason"  TEXT,
  "ip_address"     TEXT,
  "user_agent"     TEXT,
  "session_id"     TEXT,
  "created_at"     TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "audit_logs_company_id_created_at_idx"
  ON "audit_logs" ("company_id", "created_at");

CREATE INDEX "audit_logs_company_id_entity_type_entity_id_idx"
  ON "audit_logs" ("company_id", "entity_type", "entity_id");

CREATE INDEX "audit_logs_company_id_actor_id_idx"
  ON "audit_logs" ("company_id", "actor_id");

CREATE INDEX "audit_logs_company_id_project_id_idx"
  ON "audit_logs" ("company_id", "project_id");


-- =============================================================================
-- SECTION 3 — app_logs
-- =============================================================================

CREATE TABLE "app_logs" (
  "id"             SERIAL        PRIMARY KEY,
  "company_id"     INTEGER,
  "level"          "LogLevel"    NOT NULL,
  "category"       "LogCategory" NOT NULL,
  "message"        TEXT          NOT NULL,
  "details"        JSONB,
  "user_id"        INTEGER,
  "request_path"   TEXT,
  "request_method" TEXT,
  "status_code"    INTEGER,
  "duration_ms"    INTEGER,
  "created_at"     TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "app_logs_company_id_created_at_idx"
  ON "app_logs" ("company_id", "created_at");

CREATE INDEX "app_logs_level_created_at_idx"
  ON "app_logs" ("level", "created_at");


-- =============================================================================
-- SECTION 4 — suppliers
-- =============================================================================

CREATE TABLE "suppliers" (
  "id"             SERIAL        PRIMARY KEY,
  "company_id"     INTEGER       NOT NULL REFERENCES "companies"("id"),
  "name"           TEXT          NOT NULL,
  "contact_person" TEXT,
  "phone"          TEXT,
  "email"          TEXT,
  "address"        TEXT,
  "notes"          TEXT,
  "is_active"      BOOLEAN       NOT NULL DEFAULT true,
  "created_at"     TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"     TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- =============================================================================
-- SECTION 5 — inventory_items
-- =============================================================================

CREATE TABLE "inventory_items" (
  "id"            SERIAL              PRIMARY KEY,
  "company_id"    INTEGER             NOT NULL REFERENCES "companies"("id"),
  "code"          TEXT                NOT NULL,
  "name"          TEXT                NOT NULL,
  "brand"         TEXT,
  "category"      "InventoryCategory" NOT NULL,
  "unit"          "InventoryUnit"     NOT NULL,
  "unit_cost"     DECIMAL(10,2),
  "qty_on_hand"   DECIMAL(10,3)       NOT NULL DEFAULT 0,
  "qty_allocated" DECIMAL(10,3)       NOT NULL DEFAULT 0,
  "reorder_level" DECIMAL(10,3)       NOT NULL DEFAULT 0,
  "location"      TEXT,
  "description"   TEXT,
  "is_active"     BOOLEAN             NOT NULL DEFAULT true,
  "created_at"    TIMESTAMP(3)        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"    TIMESTAMP(3)        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "inventory_items_company_id_code_key" UNIQUE ("company_id", "code")
);


-- =============================================================================
-- SECTION 6 — purchase_orders
-- (depends on: companies, projects, suppliers, users)
-- =============================================================================

CREATE TABLE "purchase_orders" (
  "id"                SERIAL                PRIMARY KEY,
  "company_id"        INTEGER               NOT NULL REFERENCES "companies"("id"),
  "po_number"         TEXT                  NOT NULL,
  "project_id"        INTEGER               REFERENCES "projects"("id"),
  "phase_id"          INTEGER,
  "supplier_id"       INTEGER               REFERENCES "suppliers"("id"),
  "supplier_name"     TEXT                  NOT NULL,
  "supplier_contact"  TEXT,
  "order_date"        TIMESTAMP(3)          NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expected_delivery" TIMESTAMP(3)          NOT NULL,
  "actual_delivery"   TIMESTAMP(3),
  "status"            "PurchaseOrderStatus" NOT NULL DEFAULT 'DRAFT',
  "total_value"       DECIMAL(12,2),
  "notes"             TEXT,
  "created_by_id"     INTEGER               NOT NULL REFERENCES "users"("id"),
  "created_at"        TIMESTAMP(3)          NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"        TIMESTAMP(3)          NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "purchase_orders_company_id_po_number_key" UNIQUE ("company_id", "po_number")
);


-- =============================================================================
-- SECTION 7 — purchase_order_lines
-- (depends on: purchase_orders, inventory_items)
-- =============================================================================

CREATE TABLE "purchase_order_lines" (
  "id"                    SERIAL        PRIMARY KEY,
  "purchase_order_id"     INTEGER       NOT NULL
      REFERENCES "purchase_orders"("id") ON DELETE CASCADE,
  "inventory_item_id"     INTEGER       NOT NULL REFERENCES "inventory_items"("id"),
  "material_submittal_id" INTEGER,
  "description"           TEXT,
  "qty_ordered"           DECIMAL(10,3) NOT NULL,
  "qty_received"          DECIMAL(10,3) NOT NULL DEFAULT 0,
  "unit_price"            DECIMAL(10,2),
  "created_at"            TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"            TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- =============================================================================
-- SECTION 8 — inventory_transactions
-- (depends on: inventory_items, projects, purchase_orders, users)
-- =============================================================================

CREATE TABLE "inventory_transactions" (
  "id"                SERIAL            PRIMARY KEY,
  "company_id"        INTEGER           NOT NULL,
  "inventory_item_id" INTEGER           NOT NULL REFERENCES "inventory_items"("id"),
  "type"              "TransactionType" NOT NULL,
  "qty"               DECIMAL(10,3)     NOT NULL,
  "qty_before"        DECIMAL(10,3)     NOT NULL,
  "qty_after"         DECIMAL(10,3)     NOT NULL,
  "project_id"        INTEGER           REFERENCES "projects"("id"),
  "phase_id"          INTEGER,
  "order_id"          INTEGER           REFERENCES "purchase_orders"("id"),
  "reference"         TEXT,
  "notes"             TEXT,
  "recorded_by_id"    INTEGER           NOT NULL REFERENCES "users"("id"),
  "created_at"        TIMESTAMP(3)      NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- =============================================================================
-- SECTION 9 — project_inventory
-- (depends on: projects, inventory_items, material_submittals, users)
-- =============================================================================

CREATE TABLE "project_inventory" (
  "id"                    SERIAL        PRIMARY KEY,
  "project_id"            INTEGER       NOT NULL REFERENCES "projects"("id"),
  "inventory_item_id"     INTEGER       NOT NULL REFERENCES "inventory_items"("id"),
  "phase_id"              INTEGER,
  "material_submittal_id" INTEGER       REFERENCES "material_submittals"("id"),
  "qty_allocated"         DECIMAL(10,3) NOT NULL DEFAULT 0,
  "qty_used"              DECIMAL(10,3) NOT NULL DEFAULT 0,
  "qty_returned"          DECIMAL(10,3) NOT NULL DEFAULT 0,
  "allocated_by_id"       INTEGER       NOT NULL REFERENCES "users"("id"),
  "created_at"            TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"            TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- =============================================================================
-- SECTION 10 — inventory_usage_records
-- (depends on: project_inventory, users)
-- =============================================================================

CREATE TABLE "inventory_usage_records" (
  "id"                   SERIAL        PRIMARY KEY,
  "project_inventory_id" INTEGER       NOT NULL REFERENCES "project_inventory"("id"),
  "project_id"           INTEGER       NOT NULL,
  "phase_id"             INTEGER,
  "date"                 TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "qty_used"             DECIMAL(10,3) NOT NULL,
  "area_covered"         DECIMAL(10,2),
  "batch_number"         TEXT,
  "notes"                TEXT,
  "recorded_by_id"       INTEGER       NOT NULL REFERENCES "users"("id"),
  "created_at"           TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- =============================================================================
-- SECTION 11 — attendance_records
-- (depends on: companies, users, workers, projects)
-- =============================================================================

CREATE TABLE "attendance_records" (
  "id"             SERIAL             PRIMARY KEY,
  "company_id"     INTEGER            NOT NULL REFERENCES "companies"("id"),
  "date"           DATE               NOT NULL,
  "employee_type"  "EmployeeType"     NOT NULL,
  "user_id"        INTEGER            REFERENCES "users"("id"),
  "worker_id"      INTEGER            REFERENCES "workers"("id"),
  "project_id"     INTEGER            REFERENCES "projects"("id"),
  "status"         "AttendanceStatus" NOT NULL,
  "time_in"        TIMESTAMP(3),
  "time_out"       TIMESTAMP(3),
  "overtime_hours" DECIMAL(4,2)       DEFAULT 0,
  "notes"          TEXT,
  "marked_by_id"   INTEGER            NOT NULL REFERENCES "users"("id"),
  "created_at"     TIMESTAMP(3)       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"     TIMESTAMP(3)       NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- =============================================================================
-- SECTION 12 — worker_project_assignments
-- (depends on: workers, projects, users)
-- =============================================================================

CREATE TABLE "worker_project_assignments" (
  "id"             SERIAL                   PRIMARY KEY,
  "worker_id"      INTEGER                  NOT NULL REFERENCES "workers"("id"),
  "project_id"     INTEGER                  NOT NULL REFERENCES "projects"("id"),
  "phase_id"       INTEGER,
  "start_date"     DATE                     NOT NULL,
  "end_date"       DATE,
  "role"           "WorkerProjectRole"      NOT NULL,
  "status"         "WorkerAssignmentStatus" NOT NULL DEFAULT 'ACTIVE',
  "assigned_by_id" INTEGER                  NOT NULL REFERENCES "users"("id"),
  "notes"          TEXT,
  "created_at"     TIMESTAMP(3)             NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"     TIMESTAMP(3)             NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- =============================================================================
-- SECTION 13 — project_approvals
-- (depends on: projects, users)
-- =============================================================================

CREATE TABLE "project_approvals" (
  "id"             SERIAL                  PRIMARY KEY,
  "project_id"     INTEGER                 NOT NULL REFERENCES "projects"("id"),
  "approval_type"  "ProjectApprovalType"   NOT NULL,
  "status"         "ProjectApprovalStatus" NOT NULL DEFAULT 'PENDING',
  "submitted_date" DATE,
  "approved_date"  DATE,
  "expiry_date"    DATE,
  "reference_no"   TEXT,
  "issued_by"      TEXT,
  "notes"          TEXT,
  "updated_by_id"  INTEGER                 REFERENCES "users"("id"),
  "created_at"     TIMESTAMP(3)            NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"     TIMESTAMP(3)            NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- =============================================================================
-- SECTION 14 — Drop legacy check constraints not managed by Prisma
-- Run this if you see "violates check constraint" errors on the workers table.
-- =============================================================================

ALTER TABLE "workers" DROP CONSTRAINT IF EXISTS "workers_nationality_check";
ALTER TABLE "workers" DROP CONSTRAINT IF EXISTS "workers_trade_check";


-- =============================================================================
-- END OF MIGRATION
-- =============================================================================
