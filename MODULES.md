# Construction PM — New Modules Guide

## Table of Contents
1. [Inventory Management](#1-inventory-management)
2. [Purchase Orders](#2-purchase-orders)
3. [Attendance Management](#3-attendance-management)
4. [Worker Assignments](#4-worker-assignments)
5. [Admin Command Centre](#5-admin-command-centre)
6. [Audit Trail](#6-audit-trail)
7. [System Logs](#7-system-logs)
8. [API Reference](#8-api-reference)

---

## 1. Inventory Management

### What it does
Tracks all company materials (paint, primer, sealant, scaffold, tools, etc.) across projects. Each item has live stock levels, reorder alerts, and a full transaction history.

### How to use

#### View all stock — `/inventory`
- See all inventory items with stock bars showing on-hand vs allocated vs available
- Tap the amber banner at top to filter to low-stock items only
- Use the search bar or category chips to narrow down
- Tap any item card to open its detail page

#### Add a new item — `/inventory/new`
1. Enter an **Item Code** (e.g. `PRN-001`) — must be unique per company
2. Enter the **Name** and optional **Brand**
3. Select a **Category** (Primer, Sealer, Finishing Paint, etc.)
4. Select the **Unit of Measure** (Litre, KG, Tin, etc.)
5. Optionally set **Unit Cost**, **Reorder Level**, and **Storage Location**
6. Tap **Create Item** — you are redirected to the item detail page

#### Item detail page — `/inventory/[itemId]`
- See stock breakdown: On Hand, Allocated, Available
- Read full transaction history (purchases, allocations, returns, adjustments)
- **Adjust Stock** button — opens a sheet to add or remove stock:
  - Positive qty = stock in (e.g. purchase receipt)
  - Negative qty = stock out (e.g. write-off)
  - Choose a transaction type and add notes
- **Edit** button — update name, brand, unit cost, reorder level, location

#### Project inventory — `/projects/[id]/inventory`
- Shows all materials allocated to a specific project
- Tap **Allocate** to assign stock from the company pool to the project
- **Record Use** — logs how much was consumed on-site (deducts from remaining)
- **Return** — sends unused allocated stock back to the company pool

### Roles
| Action | Roles |
|--------|-------|
| View inventory | All |
| Create / edit items | company_admin, super_admin, project_manager |
| Adjust stock | company_admin, super_admin only |
| Allocate to project | company_admin, super_admin, project_manager |
| Record usage / return | Project team members |

---

## 2. Purchase Orders

### What it does
Full purchase order lifecycle from draft to delivery. Tracks expected vs actual delivery, flags overdue orders with a global red banner, and automatically updates stock on goods receipt.

### How to use

#### View orders — `/orders`
- Status filter chips: All, DRAFT, ORDERED, PARTIAL, overdue, DELIVERED, CANCELLED
- Overdue orders pulse red and show days late
- Tap any order to open its detail page

#### Create a new order — `/orders/new`
**Step 1 — Order Details**
- Select an existing **Supplier** from the dropdown (auto-fills name and contact), or type a supplier name manually
- Optionally link to a **Project**
- Set **Expected Delivery** date (required)
- Add optional notes

**Step 2 — Add Materials**
- Select an inventory item from the dropdown
- Enter quantity and optional unit price
- Tap **Add Another Item** for more lines

**Step 3 — Confirm & Place**
- Review order summary and line items
- Tap **Place Order** — generates a PO number automatically (`PO-2026-0001`)

#### Order detail — `/orders/[orderId]`
- **Details tab**: Status badge, delivery dates, line items with delivery progress bars
- **History tab**: Full audit trail for this order
- **Record Delivery** button (for ORDERED / PARTIAL orders):
  - Enter received quantities per line
  - Stock is automatically added to inventory on confirmation
  - Order status updates to PARTIAL or DELIVERED

#### Overdue banner
A red sticky banner appears at the top of every page when any orders are overdue. It auto-refreshes every 60 seconds. Click **View →** to jump to the overdue orders list.

### Roles
| Action | Roles |
|--------|-------|
| View orders | All |
| Create orders | company_admin, super_admin, project_manager |
| Record delivery | company_admin, super_admin, project_manager |
| Cancel orders | company_admin, super_admin, project_manager |

---

## 3. Attendance Management

### What it does
Daily attendance marking for workers at project level. Supports bulk marking, individual status updates, and monthly CSV exports.

### How to use

#### Company overview — `/attendance`
- **Today tab**: Summary of present / absent / half-day workers across all projects
- **Monthly Report tab**: Select month and year, then export a CSV of all attendance records

#### Mark attendance for a project — `/projects/[id]/attendance`
This is the primary mobile interface:

1. Navigate using **← →** arrows to select the date
2. See the summary strip: Present / Absent / Half Day / Unmarked count
3. Each worker card shows 4 status buttons:
   - 🟢 **PRESENT**
   - 🔴 **ABSENT**
   - 🟡 **HALF DAY**
   - 🏥 **MC**
4. For ABSENT and MC, a notes field appears to enter the reason
5. Tap **Submit Attendance** to save all records at once
6. A green full-screen flash confirms success

#### Status values
| Status | Meaning |
|--------|---------|
| PRESENT | Worker was on site |
| ABSENT | Worker did not show up |
| HALF_DAY | Worker worked half the day |
| MC | Medical certificate / sick leave |
| ANNUAL_LEAVE | Approved annual leave |
| PUBLIC_HOLIDAY | Public holiday |
| OFF_DAY | Scheduled day off |

### Notes
- Submitting attendance for the same worker on the same date updates the existing record (no duplicates)
- An offline warning banner appears if the device loses internet — data is not lost, just not yet submitted

### Roles
| Action | Roles |
|--------|-------|
| View attendance | All project team members |
| Mark attendance | supervisor, project_manager, company_admin, super_admin |
| Export monthly CSV | company_admin, super_admin |

---

## 4. Worker Assignments

### What it does
Assigns workers to specific projects with a defined role. Tracks WAH (Work At Height) certificate validity and shows expired certificates as alerts.

### How to use

#### View assignments — `/projects/[id]/assignments`
- **Active** section: workers currently assigned to this project
- **Past Assignments** section: completed, transferred, or terminated assignments
- WAH badge shows green ✓ or red EXPIRED for each certified worker
- Red alert banner appears at top if any active worker has an expired WAH cert

#### Assign a worker
1. Tap **Assign** button
2. Select a **Worker** from the dropdown
3. Choose a **Role** (Painter, Plasterer, Scaffolder, etc.)
4. Set **Start Date**
5. Add optional notes
6. Tap **Confirm Assignment**

#### End an assignment
- Tap **End** next to any active assignment
- A confirmation prompt appears
- The assignment moves to "Past Assignments" with status COMPLETED

### Roles
| Action | Roles |
|--------|-------|
| View assignments | All project team members |
| Assign workers | project_manager, company_admin, super_admin |
| End assignments | project_manager, company_admin, super_admin |

---

## 5. Admin Command Centre

### What it does
Company-wide operations dashboard giving administrators a real-time health view of all projects, workers, orders, and alerts.

### How to use — `/admin`

#### Alert Banner
Red banner at top shows count of CRITICAL / HIGH / MEDIUM alerts:
- **ORDER_OVERDUE**: Purchase orders past delivery date
- **PERMIT_EXPIRED / PERMIT_EXPIRING**: Permits expired or expiring within 7 days
- **WAH_CERT_EXPIRED / WAH_CERT_EXPIRING**: Worker WAH certificates
- **DEFECT_OVERDUE**: Open defects past their target rectification date
- **PROJECT_OVERDUE**: Projects past their planned end date

#### Summary stat cards
Quick counts: Active Projects, Completed, Overdue, Workers Today, WAH Expired, Orders Overdue

#### Project cards
Each project card shows:
- **Health dot**: 🟢 GREEN (score ≥ 80) | 🟡 AMBER (score ≥ 60) | 🔴 RED (score < 60)
- **Health score**: 0–100 (starts at 100, deductions for defects, overdue items, expired permits)
- Phase progress bar
- Workers present today vs total
- Open defects, pending permits, overdue orders
- Days to deadline (or days overdue)

Tap any project card to open the **Project Deep Dive** page.

#### Project Deep Dive — `/admin/projects/[projectId]`
Five tabs:
- **Overview**: Status, contract value, dates, phase timeline
- **Team & Workers**: Staff members, worker assignments with WAH status
- **Inventory**: Materials allocated to this project with usage bars
- **Orders**: All purchase orders for this project
- **Activity Log**: Full audit history (every change ever made to this project)

#### Right panel
- **Active Alerts**: List of all alerts sorted by severity
- **Recent Activity**: Last 20 actions across the company (live feed)
- **Resources**: Worker and order summary stats

Auto-refreshes every 60 seconds. Use the **Refresh** button to force an update.

### Roles
| Access | Roles |
|--------|-------|
| View Command Centre | company_admin, super_admin |
| View Project Deep Dive | company_admin, super_admin |

---

## 6. Audit Trail

### What it does
Immutable log of every create, update, delete, approve, reject, and status change across the entire system. Used for compliance, dispute resolution, and accountability.

### How to use — `/admin/audit`

#### Filtering
Tap the **Filters** bar to expand filter options:
- **Entity Type**: e.g. `Permit`, `Defect`, `PurchaseOrder`, `InventoryItem`
- **Action**: CREATE, UPDATE, DELETE, APPROVE, REJECT, SUBMIT, STATUS_CHANGE, etc.
- **Project ID**: Limit to a specific project
- **From Date / To Date**: Date range

Tap **Apply** to filter, **X** to clear all filters.

#### Reading entries
Each row shows:
- **Time**: Exact timestamp
- **Actor**: Who made the change (name + role)
- **Action**: Color-coded badge (blue = CREATE, purple = STATUS_CHANGE, red = DELETE, etc.)
- **Entity**: What was changed, with a label if available
- **Details**: Which fields changed, and the change reason if provided

#### Export to CSV
Tap **Export CSV** to download a spreadsheet of all visible entries (applies current filters). The export itself is also logged as an EXPORT audit entry.

#### Entity history (inline component)
On order detail pages, project deep dive pages, and other entity pages, an **Activity Log** tab shows the history for that specific record only.

### Roles
| Access | Roles |
|--------|-------|
| Full audit trail | company_admin, super_admin |
| Entity-specific history | company_admin, project_manager, consultant |
| Export | company_admin, super_admin |

---

## 7. System Logs

### What it does
Technical application logs — API requests, errors, auth events, cron jobs. Intended for debugging, not for business users.

### How to use — `/admin/logs`
*(Super admin only)*

#### Stats row
- Total API requests in last 24 hours
- Error count
- Warning count
- Average response time

#### Level filter tabs
ALL | ERROR | WARN | INFO — filter the log list by severity

#### Live mode
Toggle **Live** to auto-refresh every 10 seconds. Useful for watching errors happen in real-time.

#### Log entries
Tap any entry with a **▼** chevron to expand and see the full JSON `details` payload.

### Roles
| Access | Roles |
|--------|-------|
| System Logs | super_admin only |

---

## 8. API Reference

All endpoints are under `/api/v1/`. Authentication: `Authorization: Bearer <access_token>`.

Response format (success):
```json
{ "success": true, "data": {...}, "message": "Success", "errors": [] }
```

Response format (paginated):
```json
{
  "success": true,
  "data": [...],
  "message": "Success",
  "pagination": { "page": 1, "limit": 50, "total": 200, "total_pages": 4 }
}
```

### Inventory

| Method | Path | Description |
|--------|------|-------------|
| GET | `/inventory` | List items. Query: `category`, `search`, `lowStockOnly`, `page`, `limit` |
| POST | `/inventory` | Create item. Body: `code`, `name`, `category`, `unit` (required) |
| GET | `/inventory/:itemId` | Item detail + last 20 transactions |
| PATCH | `/inventory/:itemId` | Update item fields |
| POST | `/inventory/:itemId/adjust` | Adjust stock. Body: `qty` (±), `type`, `notes` |
| GET | `/inventory/low-stock` | Items where available ≤ reorder level |

### Purchase Orders

| Method | Path | Description |
|--------|------|-------------|
| GET | `/orders` | List orders. Query: `status`, `projectId`, `page`, `limit` |
| POST | `/orders` | Create order. Body: `supplier_name`, `expected_delivery`, `lines[]` |
| GET | `/orders/:orderId` | Order detail with lines |
| PATCH | `/orders/:orderId` | Update order (expected_delivery, notes, supplier_contact) |
| POST | `/orders/:orderId/receive` | Record goods receipt. Body: `received_date`, `lines[{line_id, qty_received}]` |
| POST | `/orders/:orderId/cancel` | Cancel a DRAFT or ORDERED order |
| GET | `/orders/overdue` | `{ count, earliest_date, orders[] }` |

### Suppliers

| Method | Path | Description |
|--------|------|-------------|
| GET | `/suppliers` | List active suppliers |
| POST | `/suppliers` | Create supplier |
| GET | `/suppliers/:supplierId` | Supplier detail + recent orders |
| PATCH | `/suppliers/:supplierId` | Update supplier |

### Project Inventory

| Method | Path | Description |
|--------|------|-------------|
| GET | `/projects/:projectId/inventory` | Project allocations |
| POST | `/projects/:projectId/inventory` | Allocate item. Body: `inventory_item_id`, `qty_allocated` |
| POST | `/projects/:projectId/inventory/:piId/use` | Record usage. Body: `qty_used` |
| POST | `/projects/:projectId/inventory/:piId/return` | Return stock. Body: `qty_returned` |

### Attendance

| Method | Path | Description |
|--------|------|-------------|
| GET | `/attendance` | Company-wide records. Query: `date`, `projectId`, `status`, `employeeType` |
| GET | `/attendance/today` | Today's summary with by-project breakdown |
| GET | `/attendance/monthly` | Monthly report. Add `?export=csv` to download |
| GET | `/projects/:projectId/attendance` | Project daily attendance. Query: `date` |
| POST | `/projects/:projectId/attendance` | Mark single worker. Body: `worker_id`, `date`, `status` |
| POST | `/projects/:projectId/attendance/bulk` | Bulk mark. Body: `date`, `records[]` |

### Worker Assignments

| Method | Path | Description |
|--------|------|-------------|
| GET | `/projects/:projectId/assignments` | List assignments with WAH cert status |
| POST | `/projects/:projectId/assignments` | Assign worker. Body: `worker_id`, `role`, `start_date` |
| PATCH | `/projects/:projectId/assignments/:assignmentId` | Update status / end date |

### Audit

| Method | Path | Description |
|--------|------|-------------|
| GET | `/audit` | Paginated audit log. Query: `entityType`, `action`, `projectId`, `dateFrom`, `dateTo` |
| GET | `/audit/:entityType/:entityId` | History for one entity |
| GET | `/audit/export` | CSV download (same filters as GET /audit) |

### Logs

| Method | Path | Description |
|--------|------|-------------|
| GET | `/logs` | App logs. Query: `level`, `category`, `limit` |
| GET | `/logs/stats` | 24h stats summary |

### Admin

| Method | Path | Description |
|--------|------|-------------|
| GET | `/admin/overview` | Full command centre data |
| GET | `/admin/alerts` | All active alerts sorted by severity |
