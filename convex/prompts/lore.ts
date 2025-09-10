import { 
  WORLD_LORE_SYSTEM_PROMPT,
  WORLD_LORE_TEMPLATE,
  CHARACTER_LORE_SYSTEM_PROMPT,
  CHARACTER_LORE_TEMPLATE 
} from "./templates/lore";
import { renderTemplate } from "./templateRenderer";

export function buildWorldLorePrompt({ source }: { source: string }): string {
  return renderTemplate(WORLD_LORE_TEMPLATE, { source });
}

export function buildCharacterLorePrompt({ fullName, source }: { fullName: string; source: string }): string {
  return renderTemplate(CHARACTER_LORE_TEMPLATE, { fullName, source });
} 