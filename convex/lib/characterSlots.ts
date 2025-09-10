// Calculate the number of character slots based on character count setting
export function calculateCharacterSlots(settings: {
  characterCount: "solo" | "one-on-one" | "group";
  playerMode?: boolean;
}): number {
  const { characterCount, playerMode } = settings;
  
  // If player mode is enabled, reduce slots by 1 (player takes a slot)
  const playerSlotOffset = playerMode ? 1 : 0;
  
  switch (characterCount) {
    case "solo":
      return 1; // Just the main character
    case "one-on-one":
      return 2 - playerSlotOffset; // Two total slots
    case "group":
      return 4 - playerSlotOffset; // Four total slots
    default:
      return 1;
  }
}