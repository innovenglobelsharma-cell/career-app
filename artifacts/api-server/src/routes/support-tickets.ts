import { Router, type IRouter } from "express";
import { desc, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db, supportTickets, users } from "@workspace/db";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();
const openedBy = alias(users, "ticket_opened_by");
const assignedTo = alias(users, "ticket_assigned_to");

const ticketStatusLabels: Record<string, string> = {
  open: "Open",
  in_progress: "In progress",
  waiting_for_user: "Waiting for user",
  resolved: "Resolved",
  closed: "Closed",
};

router.get("/admin/support-tickets", requireAuth, async (req, res, next) => {
  try {
    if (req.authUser!.role !== "admin") {
      res.status(403).json({ error: "Administrator access required" });
      return;
    }

    const rows = await db.select({
      id: supportTickets.id,
      subject: supportTickets.subject,
      priority: supportTickets.priority,
      status: supportTickets.status,
      createdAt: supportTickets.createdAt,
      openedBy: openedBy.name,
      assignedTo: assignedTo.name,
    })
      .from(supportTickets)
      .innerJoin(openedBy, eq(supportTickets.openedById, openedBy.id))
      .leftJoin(assignedTo, eq(supportTickets.assignedToId, assignedTo.id))
      .orderBy(desc(supportTickets.createdAt));

    res.json({
      tickets: rows.map((ticket) => ({
        ...ticket,
        priority: ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1),
        status: ticketStatusLabels[ticket.status] ?? ticket.status,
      })),
    });
  } catch (error) {
    next(error);
  }
});

export default router;
