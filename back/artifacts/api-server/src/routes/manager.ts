import { Router } from "express";
import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { appSettingsTable, farmProfileTable } from "@workspace/db/schema";
import { canUseManagerDevices } from "../lib/subscription";

const router = Router();

const UPGRADE_MSG =
  "The manager device is a paid add-on (₹199/month). Ask the farm owner to add it from Subscription.";

async function getSettings() {
  const rows = await db.select().from(appSettingsTable).limit(1);
  if (rows.length > 0) return rows[0];
  const [row] = await db.insert(appSettingsTable).values({}).returning();
  return row;
}

async function getFarmName(): Promise<string> {
  const rows = await db.select().from(farmProfileTable).limit(1);
  return rows.length > 0 ? rows[0].farmName : "My Farm";
}

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

async function ensurePairCode(): Promise<string> {
  const settings = await getSettings();
  if (settings.managerPairCode) return settings.managerPairCode;
  const code = generateCode();
  await db
    .update(appSettingsTable)
    .set({ managerPairCode: code })
    .where(eq(appSettingsTable.id, settings.id));
  return code;
}

router.get("/manager/pair-code", async (_req, res) => {
  if (!(await canUseManagerDevices())) {
    return res.status(403).json({ error: UPGRADE_MSG });
  }
  const code = await ensurePairCode();
  const farmName = await getFarmName();
  return res.json({ code, farmName });
});

router.post("/manager/pair-code/regenerate", async (_req, res) => {
  if (!(await canUseManagerDevices())) {
    return res.status(403).json({ error: UPGRADE_MSG });
  }
  const settings = await getSettings();
  const code = generateCode();
  await db
    .update(appSettingsTable)
    .set({ managerPairCode: code })
    .where(eq(appSettingsTable.id, settings.id));
  const farmName = await getFarmName();
  return res.json({ code, farmName });
});

router.post("/manager/verify", async (req, res) => {
  const b = req.body as Record<string, unknown>;
  const code = typeof b.code === "string" ? b.code.trim().toUpperCase() : "";
  if (!code) return res.status(400).json({ error: "code is required" });
  // Plan gate: even a correct code stops working if the farm is not on a plan
  // that includes manager devices (e.g. they downgraded to Silver or lapsed).
  if (!(await canUseManagerDevices())) {
    return res.status(403).json({ ok: false, reason: "plan", error: UPGRADE_MSG });
  }
  const settings = await getSettings();
  if (!settings.managerPairCode || settings.managerPairCode !== code) {
    return res.status(404).json({ ok: false, error: "Invalid code" });
  }
  const farmName = await getFarmName();
  return res.json({ ok: true, farmName });
});

export default router;
