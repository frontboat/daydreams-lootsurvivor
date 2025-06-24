import {
  createDreams,
  context,
  createContainer,
  LogLevel,
  validateEnv,
  Logger,
} from "@daydreamsai/core";
import { StarknetChain } from "@daydreamsai/defai";
import { cliExtension } from "@daydreamsai/cli";
import { openrouter } from "@openrouter/ai-sdk-provider";
import { z } from "zod";

// Import Loot Survivor core types and utilities
import {
  type AdventurerState,
  Loot,
  LootManager,
  ITEM_BASE_PRICE,
  ITEM_CHARISMA_DISCOUNT,
  ITEM_MINIMUM_PRICE,
  POTION_BASE_PRICE,
  POTION_CHARISMA_DISCOUNT,
  ITEM_TIERS,
} from "@lootsurvivor/core";

// Import the actions
import { lootSurvivorActions } from "./lootsurvivor-actions";

// Define the memory type for the Loot Survivor context
interface LootSurvivorMemory {
  lastResult: string | null;
  adventurer: AdventurerState | null;
  marketItems?: number[]; // Available items in the market
}

// Helper function to calculate level from XP
function calculateLevel(xp: number): number {
  return Math.max(Math.floor(Math.sqrt(xp)), 1);
}

// Helper function to get item name from ID
function getItemName(itemId: number): string {
  if (itemId === 0) return 'None';
  return Loot[itemId] || `Unknown(${itemId})`;
}

// Helper to format item with level and type
function formatItem(item: { id: number; xp: number }, seed: bigint = BigInt(0)): string {
  if (item.id === 0) return 'None';
  const name = getItemName(item.id);
  const level = item.xp > 0 ? ` (Lvl ${Math.floor(Math.sqrt(item.xp))})` : '';
  
  // Get item type
  const lootManager = new LootManager(item.id, item.xp, seed);
  const itemType = lootManager.getItemType();
  
  return `${name}${level} [${itemType}]`;
}

// Calculate item price based on tier and charisma
function calculateItemPrice(itemId: number, charisma: number): number {
  if (itemId === 0) return 0;
  
  const tier = ITEM_TIERS[itemId as Loot] || 1;
  const basePrice = tier * ITEM_BASE_PRICE;
  const discount = Math.min(charisma * ITEM_CHARISMA_DISCOUNT, basePrice - ITEM_MINIMUM_PRICE);
  return Math.max(basePrice - discount, ITEM_MINIMUM_PRICE);
}

// Calculate potion price based on charisma
function calculatePotionPrice(charisma: number): number {
  const discount = charisma * POTION_CHARISMA_DISCOUNT;
  return Math.max(POTION_BASE_PRICE - discount, 0);
}

// 1. Validate environment variables
validateEnv(
  z.object({
    STARKNET_RPC_URL: z.string().min(1),
    STARKNET_ADDRESS: z.string().min(1),
    STARKNET_PRIVATE_KEY: z.string().min(1),
    LOOT_SURVIVOR_CONTRACT_ADDRESS: z.string().min(1),
    OPENROUTER_API_KEY: z.string().min(1),
  })
);

// 2. Create and configure the DI container
const container = createContainer();
container.singleton("starknet", () => new StarknetChain({
  rpcUrl: process.env.STARKNET_RPC_URL!,
  address: process.env.STARKNET_ADDRESS!,
  privateKey: process.env.STARKNET_PRIVATE_KEY!,
}));

// 3. Define the game context
const lootSurvivorContext = context<LootSurvivorMemory>({
  type: "loot-survivor-agent",
  maxSteps: 100,  // Allow many steps for continuous play
  schema: z.object({
    adventurerId: z.string().describe("The ID of the adventurer to play as"),
  }),
  instructions: `You are an expert AI agent playing the Loot Survivor game on Starknet.
  
  **CORE RULE: YOU MUST TAKE AN ACTION EVERY TURN UNTIL DEATH**
  
  When user says "Play as adventurer [ID]", "PLAY", or similar:
  1. If you don't have current state, use getAndUpdateAdventurerState first
  2. Then IMMEDIATELY start taking game actions in a continuous loop
  3. After EACH action completes, look at the result and IMMEDIATELY take the next action
  4. DO NOT STOP after one action - keep playing until death
  5. DO NOT wait for user input between actions
  
  **YOUR ONLY CHOICES AT EACH STEP**:
  - In combat (beastHealth > 0): MUST choose attack or flee
  - In market (statUpgradesAvailable > 0): MUST use lootSurvivor:upgrade ONCE (includes ALL purchases/upgrades)
  - Not in combat/market: MUST explore
  - Dead: Game over (only time you stop)
  
  **CRITICAL MARKET RULES**:
  - Market is available ONLY when statUpgradesAvailable > 0
  - You get ONE SINGLE use of lootSurvivor:upgrade per market visit
  - This ONE call must include:
    - Number of potions to buy (if any)
    - Which stats to upgrade (if any) 
    - Which items to purchase (if any)
  - After using upgrade once, you'll automatically exit market and must continue playing
  
  **STRATEGY GUIDELINES** (but you MUST always act):
  - Low health in combat: Flee might be better than attack
  - Low health in market: Include potions in your upgrade call
  - High health in combat: Attack
  - In market: Plan your SINGLE upgrade call carefully - include all items/potions/stats you want
  - Not in combat/market: Always explore (no other choice)
  
  **ACTION LOOP**:
  Take action → Read result → Immediately take next action → Repeat until death
  
  Never wait. Never pause. Never ask what to do. Just keep playing strategically until death.
  
  **Decision Framework**:
  - If health < 30% and in market (statUpgradesAvailable > 0): Buy potions
  - If in combat and health < 40%: Consider fleeing
  - If in combat and health > 40%: Attack
  - If beast defeated or not in combat: Explore
  - If statUpgradesAvailable > 0: Visit market and upgrade wisely
  - If found better equipment: Equip it
  
  **Key Strategies**:
  - Health Management: Keep health above 50% when possible
  - Stat Priority: VIT (survivability) > CHA (cheaper items) > STR/DEX (damage) > WIS/INT (obstacles)
  - Combat: Fight beasts at your level or below, flee from stronger ones
  - Economy: Save gold for potions when health is low
  - Equipment: Always equip items that match your build (Blade for STR, Magic for INT)
  
  **Available Actions**:
  - getAndUpdateAdventurerState - Check current status (use this first!)
  - lootSurvivor:explore - Explore new areas
  - lootSurvivor:attack - Attack the current beast  
  - lootSurvivor:flee - Try to flee from combat
  - lootSurvivor:upgrade - ONE-TIME market action that handles ALL of:
    * potions: number of potions to buy
    * stat_upgrades: {strength, dexterity, vitality, intelligence, wisdom, charisma} values to add
    * items: array of {item_id, equip: true/false} for items to purchase
  - lootSurvivor:equip - Equip items from inventory (use outside of market)
  
  Your adventurer ID is: {{adventurerId}}
  
  **START PLAYING NOW**: Check your status first, then begin the endless game loop. Never stop taking actions until you die!`,
  render: ({ memory, args }) => {
    const adv = memory.adventurer?.adventurer;
    const stats = adv?.stats;
    const equipment = adv?.equipment;
    
    if (!memory.adventurer) {
      return `
Adventurer ID: ${args.adventurerId || 'Not set'}
Status: No adventurer data loaded. Use getAndUpdateAdventurerState to fetch data.
`;
    }
    
    const level = calculateLevel(adv.xp);
    const maxHealth = 50 + (adv.stats.vitality * 15) + ((level - 1) * 15);
    const healthPercent = Math.round((adv.health / maxHealth) * 100);
    
    return `
=== ADVENTURER #${memory.adventurer.adventurerId} ===

**STATUS**
Health: ${adv.health}/${maxHealth} (${healthPercent}%)
Level: ${level} (${adv.xp} XP)
Gold: ${adv.gold}
${adv.beastHealth > 0 ? `⚔️ IN COMBAT - Beast Health: ${adv.beastHealth}` : ''}
${adv.statUpgradesAvailable > 0 ? `📈 ${adv.statUpgradesAvailable} stat upgrades available!` : ''}

**STATS**
STR: ${stats.strength} | DEX: ${stats.dexterity} | VIT: ${stats.vitality}
INT: ${stats.intelligence} | WIS: ${stats.wisdom} | CHA: ${stats.charisma} | LUCK: ${stats.luck}

**EQUIPMENT**
Weapon: ${formatItem(equipment.weapon, BigInt(memory.adventurer.adventurerEntropy))}
Chest:  ${formatItem(equipment.chest, BigInt(memory.adventurer.adventurerEntropy))}
Head:   ${formatItem(equipment.head, BigInt(memory.adventurer.adventurerEntropy))}
Waist:  ${formatItem(equipment.waist, BigInt(memory.adventurer.adventurerEntropy))}
Foot:   ${formatItem(equipment.foot, BigInt(memory.adventurer.adventurerEntropy))}
Hand:   ${formatItem(equipment.hand, BigInt(memory.adventurer.adventurerEntropy))}
Neck:   ${formatItem(equipment.neck, BigInt(memory.adventurer.adventurerEntropy))}
Ring:   ${formatItem(equipment.ring, BigInt(memory.adventurer.adventurerEntropy))}

**LAST ACTION**
${memory.lastResult || "No actions taken yet"}
${
  adv.statUpgradesAvailable > 0 && memory.marketItems ? 
  `\n**MARKET OPEN**\nGold: ${adv.gold}\nPotion Price: ${calculatePotionPrice(stats.charisma)} gold\n\nAvailable Items:\n${memory.marketItems.map(id => {
    const lootManager = new LootManager(id, 0, BigInt(0));
    const itemType = lootManager.getItemType();
    const price = calculateItemPrice(id, stats.charisma);
    return `- ${getItemName(id)} [${itemType}] - ${price}g`;
  }).join('\n')}\n\nYou can:\n- Buy potions with lootSurvivor:upgrade (heals you)\n- Buy items with lootSurvivor:upgrade\n- Upgrade stats with lootSurvivor:upgrade` : ''
}
`;
  },
  create: () => ({
    lastResult: null,
    adventurer: null,
    marketItems: undefined,
  }),
});

// 4. Create the agent
const agent = createDreams({
  model: openrouter("google/gemini-2.0-flash-001"),
  logger: new Logger({ level: LogLevel.DEBUG }),
  extensions: [cliExtension],
  actions: lootSurvivorActions,
  contexts: [lootSurvivorContext],
  container,
});

// 5. Start the agent
async function main() {
  await agent.start();
  
  // The CLI extension will handle all interaction
  // User can say "Play as adventurer 10568" or pass it as command arg
  const adventurerId = process.argv[2];
  if (adventurerId) {
    console.log(`To start playing, the agent will check adventurer #${adventurerId}`);
  }
}

main(); 