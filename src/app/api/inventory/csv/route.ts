import { NextResponse } from "next/server";
import { storage } from "@/storage";

export const runtime = "nodejs";
const cell = (s: string) => `"${s.replace(/"/g, '""').replace(/\r?\n/g, " | ")}"`;
export async function GET() {
  const items = await storage.equipment.list();
  const rows = [["Nom", "Type", "Fabricant", "OS/Firmware", "Adresse IP", "Interfaces", "VLAN", "Rôle", "Laboratoires"],
    ...items.map((e) => [e.name, e.type, e.manufacturer, e.osVersion, e.ipAddress, e.interfaces, e.vlans, e.role, e.labs.map((l) => l.title).join("; ")])];
  return new NextResponse("﻿" + rows.map((r) => r.map(cell).join(",")).join("\r\n"), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="inventaire.csv"' },
  });
}
