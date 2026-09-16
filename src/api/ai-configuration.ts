import { api } from "@/api/client";

export type CareerAiField = {
  id: string;
  section: string;
  label: string;
  admin_default: boolean;
  coordinator_configurable: boolean;
  override: boolean | null;
  effective: boolean;
};

export type CareerAiConfiguration = {
  template_revision: number;
  fields: CareerAiField[];
};

export const getCareerAiConfiguration = () =>
  api<CareerAiConfiguration>("/coordination/ai-configuration");
export const saveCareerAiConfiguration = (
  preferences: Array<{ field_id: string; enabled: boolean }>,
) =>
  api<{ message: string }>("/coordination/ai-configuration", {
    method: "PUT",
    body: JSON.stringify({ preferences }),
  });
export const resetCareerAiConfiguration = () =>
  api<{ message: string }>("/coordination/ai-configuration", {
    method: "DELETE",
  });
