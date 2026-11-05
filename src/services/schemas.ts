import { z } from "zod";
import { CATEGORIES, EQUIPMENT_TYPES, LANGUAGES, PLATFORMS, STATUSES } from "@/domain/constants";

const oneOf = <T extends readonly { value: string }[]>(list: T) =>
  z.string().refine((v) => list.some((x) => x.value === v), "Valeur invalide");
const str = (max = 20000) => z.string().max(max).default("");

export const addressRowSchema = z.object({
  device: str(200), interface: str(200), ip: str(100), mask: str(100), gateway: str(100), vlan: str(100), notes: str(500),
});
export const commandSchema = z.object({
  title: str(200), language: oneOf(LANGUAGES).default("cisco"), code: str(200000), explanation: str(20000),
});

export const labSchema = z.object({
  title: z.string().trim().min(1, "Le titre est obligatoire").max(200),
  category: oneOf(CATEGORIES),
  status: oneOf(STATUSES).default("brouillon"),
  date: z.coerce.date().default(() => new Date()),
  description: str(), objectives: str(), prerequisites: str(), topologyNotes: str(), configSteps: str(),
  tests: str(), problems: str(), diagnostics: str(), conclusion: str(),
  addressRows: z.array(addressRowSchema).max(500).default([]),
  commands: z.array(commandSchema).max(500).default([]),
  equipmentIds: z.array(z.string()).default([]),
  procedureIds: z.array(z.string()).default([]),
});

export const equipmentSchema = z.object({
  name: z.string().trim().min(1, "Le nom est obligatoire").max(200),
  type: oneOf(EQUIPMENT_TYPES).default("autre"),
  manufacturer: str(200), osVersion: str(200), ipAddress: str(200), interfaces: str(), vlans: str(), role: str(500), notes: str(),
});

export const procedureSchema = z.object({
  title: z.string().trim().min(1, "Le titre est obligatoire").max(200),
  category: oneOf(CATEGORIES).default("reseau"),
  platform: oneOf(PLATFORMS).default("cisco"),
  description: str(2000), content: str(), tags: str(500),
  isTemplate: z.boolean().default(false),
  commands: z.array(commandSchema).max(500).default([]),
});
