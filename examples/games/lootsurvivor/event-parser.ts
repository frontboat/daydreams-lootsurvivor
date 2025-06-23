import {
  type StartGameEvent,
  type DiscoveredHealthEvent,
  type DiscoveredGoldEvent,
  type DiscoveredXPEvent,
  type DiscoveredLootEvent,
  type EquipmentChangedEvent,
  type DodgedObstacleEvent,
  type HitByObstacleEvent,
  type DiscoveredBeastEvent,
  type AmbushedByBeastEvent,
  type AttackedBeastEvent,
  type AttackedByBeastEvent,
  type SlayedBeastEvent,
  type FleeFailedEvent,
  type FleeSucceededEvent,
  type PurchasedItemsEvent,
  type PurchasedPotionsEvent,
  type EquippedItemsEvent,
  type DroppedItemsEvent,
  type GreatnessIncreasedEvent,
  type ItemsLeveledUpEvent,
  type NewHighScoreEvent,
  type AdventurerDiedEvent,
  type AdventurerLeveledUpEvent,
  type UpgradesAvailableEvent,
  type AdventurerUpgradedEvent,
  type AdventurerState,
  HASHED_SELECTORS,
  Beasts,
  Loot,
  Obstacles,
  BeastManager,
  LootManager,
  ObstacleManager,
  ITEM_TIERS,
  ITEM_BASE_PRICE,
  ITEM_CHARISMA_DISCOUNT,
  ITEM_MINIMUM_PRICE,
  POTION_BASE_PRICE,
  POTION_CHARISMA_DISCOUNT,
} from "@lootsurvivor/core";
import { hash } from "starknet";

export interface ParsedEvent {
  name: string;
  data: any;
  description: string;
}

export interface GameStateUpdate {
  adventurerState?: AdventurerState;
  events: ParsedEvent[];
  summary: string;
  detailedSummary?: string; // More detailed summary with full context
  marketItems?: number[]; // Items available in the market
  currentBeast?: { id: number; health: number; level: number; type: string };
}

// Helper to convert hex to number
function hexToNumber(hex: string): number {
  return parseInt(hex, 16);
}

// Helper to convert hex to bigint
function hexToBigInt(hex: string): bigint {
  return BigInt(hex);
}

// Helper to parse adventurer state from event data
function parseAdventurerState(data: string[]): AdventurerState {
  return {
    owner: data[0],
    adventurerId: hexToNumber(data[1]),
    adventurerEntropy: data[2],
    adventurer: {
      health: hexToNumber(data[3]),
      xp: hexToNumber(data[4]),
      gold: hexToNumber(data[5]),
      beastHealth: hexToNumber(data[6]),
      statUpgradesAvailable: hexToNumber(data[7]),
      stats: {
        strength: hexToNumber(data[8]),
        dexterity: hexToNumber(data[9]),
        vitality: hexToNumber(data[10]),
        intelligence: hexToNumber(data[11]),
        wisdom: hexToNumber(data[12]),
        charisma: hexToNumber(data[13]),
        luck: hexToNumber(data[14]),
      },
      equipment: {
        weapon: { id: hexToNumber(data[15]), xp: hexToNumber(data[16]) },
        chest: { id: hexToNumber(data[17]), xp: hexToNumber(data[18]) },
        head: { id: hexToNumber(data[19]), xp: hexToNumber(data[20]) },
        waist: { id: hexToNumber(data[21]), xp: hexToNumber(data[22]) },
        foot: { id: hexToNumber(data[23]), xp: hexToNumber(data[24]) },
        hand: { id: hexToNumber(data[25]), xp: hexToNumber(data[26]) },
        neck: { id: hexToNumber(data[27]), xp: hexToNumber(data[28]) },
        ring: { id: hexToNumber(data[29]), xp: hexToNumber(data[30]) },
      },
      mutated: hexToNumber(data[31]) === 1,
    },
  };
}

// Helper to parse bag from event data
function parseBag(data: string[], offset: number): any {
  const bag: any = { mutated: false };
  for (let i = 1; i <= 15; i++) {
    bag[`item${i}`] = {
      id: hexToNumber(data[offset + (i-1) * 2]),
      xp: hexToNumber(data[offset + (i-1) * 2 + 1]),
    };
  }
  bag.mutated = hexToNumber(data[offset + 30]) === 1;
  return bag;
}

// Parse combat spec from event data
function parseCombatSpec(data: string[], offset: number) {
  return {
    tier: hexToNumber(data[offset]),
    itemType: hexToNumber(data[offset + 1]),
    level: hexToNumber(data[offset + 2]),
    specials: {
      special1: hexToNumber(data[offset + 3]),
      special2: hexToNumber(data[offset + 4]),
      special3: hexToNumber(data[offset + 5]),
    },
  };
}

const beastManager = new BeastManager();
const obstacleManager = new ObstacleManager();

// Helper to calculate max health
function calculateMaxHealth(state: AdventurerState): number {
  const level = Math.max(Math.floor(Math.sqrt(state.adventurer.xp)), 1);
  return 50 + (state.adventurer.stats.vitality * 15) + ((level - 1) * 15);
}

export function parseEvents(receipt: any): GameStateUpdate {
  const events: ParsedEvent[] = [];
  let latestAdventurerState: AdventurerState | undefined;
  let marketItems: number[] | undefined;
  let currentBeast: { id: number; health: number; level: number; type: string } | undefined;
  const summaryParts: string[] = [];
  const detailedParts: string[] = [];

  if (!receipt.events) {
    return { events, summary: "No events found in transaction" };
  }

  for (const event of receipt.events) {
    const eventKey = event.keys[0];
    const eventData = event.data;

    // StartGame event
    if (eventKey === HASHED_SELECTORS.StartGame) {
      const adventurerState = parseAdventurerState(eventData);
      latestAdventurerState = adventurerState;
      
      const startEvent: StartGameEvent = {
        adventurerState,
        adventurerMeta: {
          startEntropy: eventData[32],
          startingStats: {
            strength: hexToNumber(eventData[33]),
            dexterity: hexToNumber(eventData[34]),
            vitality: hexToNumber(eventData[35]),
            intelligence: hexToNumber(eventData[36]),
            wisdom: hexToNumber(eventData[37]),
            charisma: hexToNumber(eventData[38]),
            luck: hexToNumber(eventData[39]),
          },
          interfaceCamel: hexToNumber(eventData[40]) === 1,
          name: hexToNumber(eventData[41]),
        },
        revealBlock: hexToNumber(eventData[42]),
      };

      events.push({
        name: "StartGame",
        data: startEvent,
        description: `Started new game with adventurer ${adventurerState.adventurerId}`,
      });
      summaryParts.push(`Started new adventure #${adventurerState.adventurerId}`);
      
      detailedParts.push(`🎮 NEW GAME STARTED!`);
      detailedParts.push(`Adventurer #${adventurerState.adventurerId}`);
      detailedParts.push(`Starting Stats: STR ${startEvent.adventurerMeta.startingStats.strength} | DEX ${startEvent.adventurerMeta.startingStats.dexterity} | VIT ${startEvent.adventurerMeta.startingStats.vitality}`);
      detailedParts.push(`INT ${startEvent.adventurerMeta.startingStats.intelligence} | WIS ${startEvent.adventurerMeta.startingStats.wisdom} | CHA ${startEvent.adventurerMeta.startingStats.charisma} | LUCK ${startEvent.adventurerMeta.startingStats.luck}`);
    }

    // DiscoveredHealth event
    else if (eventKey === HASHED_SELECTORS.DiscoveredHealth) {
      const adventurerState = parseAdventurerState(eventData);
      latestAdventurerState = adventurerState;
      const healthAmount = hexToNumber(eventData[32]);

      events.push({
        name: "DiscoveredHealth",
        data: { adventurerState, healthAmount },
        description: `Discovered ${healthAmount} health`,
      });
      summaryParts.push(`Found ${healthAmount} health`);
      detailedParts.push(`💚 Found ${healthAmount} health! Now at ${adventurerState.adventurer.health} HP`);
    }

    // DiscoveredGold event
    else if (eventKey === HASHED_SELECTORS.DiscoveredGold) {
      const adventurerState = parseAdventurerState(eventData);
      latestAdventurerState = adventurerState;
      const goldAmount = hexToNumber(eventData[32]);

      events.push({
        name: "DiscoveredGold",
        data: { adventurerState, goldAmount },
        description: `Discovered ${goldAmount} gold`,
      });
      summaryParts.push(`Found ${goldAmount} gold`);
      detailedParts.push(`💰 Found ${goldAmount} gold! Total: ${adventurerState.adventurer.gold} gold`);
    }

    // DiscoveredXP event
    else if (eventKey === HASHED_SELECTORS.DiscoveredXP) {
      const adventurerState = parseAdventurerState(eventData);
      latestAdventurerState = adventurerState;
      const xpAmount = hexToNumber(eventData[32]);

      events.push({
        name: "DiscoveredXP",
        data: { adventurerState, xpAmount },
        description: `Discovered ${xpAmount} XP`,
      });
      summaryParts.push(`Gained ${xpAmount} XP`);
      detailedParts.push(`⭐ Gained ${xpAmount} XP! Total: ${adventurerState.adventurer.xp} XP`);
    }

    // DiscoveredLoot event
    else if (eventKey === HASHED_SELECTORS.DiscoveredLoot) {
      const adventurerState = parseAdventurerState(eventData);
      latestAdventurerState = adventurerState;
      const itemId = hexToNumber(eventData[32]);
      const itemName = Loot[itemId] || `Unknown Item ${itemId}`;

      events.push({
        name: "DiscoveredLoot",
        data: { adventurerState, itemId },
        description: `Discovered ${itemName}`,
      });
      summaryParts.push(`Found ${itemName}`);
      const lootManager = new LootManager(itemId, 0, BigInt(0));
      detailedParts.push(`🎁 Found ${itemName} [${lootManager.getItemType()}]!`);
    }

    // HitByObstacle event
    else if (eventKey === HASHED_SELECTORS.HitByObstacle) {
      const adventurerState = parseAdventurerState(eventData);
      latestAdventurerState = adventurerState;
      const obstacleId = hexToNumber(eventData[32]);
      const level = hexToNumber(eventData[33]);
      const damageTaken = hexToNumber(eventData[34]);
      const obstacleName = obstacleManager.getObstacleName(obstacleId);

      events.push({
        name: "HitByObstacle",
        data: {
          adventurerState,
          id: obstacleId,
          level,
          damageTaken,
          damageLocation: hexToNumber(eventData[35]),
          xpEarnedAdventurer: hexToNumber(eventData[36]),
          xpEarnedItems: hexToNumber(eventData[37]),
        },
        description: `Hit by ${obstacleName} (Level ${level}) for ${damageTaken} damage`,
      });
      summaryParts.push(`Hit by ${obstacleName} for ${damageTaken} damage`);
      detailedParts.push(`💥 Hit by ${obstacleName} (Level ${level})!`);
      detailedParts.push(`Took ${damageTaken} damage. Health: ${adventurerState.adventurer.health}/${calculateMaxHealth(adventurerState)}`);
      if (hexToNumber(eventData[36]) > 0 || hexToNumber(eventData[37]) > 0) {
        detailedParts.push(`Gained ${hexToNumber(eventData[36])} XP`);
      }
    }

    // DodgedObstacle event
    else if (eventKey === HASHED_SELECTORS.DodgedObstacle) {
      const adventurerState = parseAdventurerState(eventData);
      latestAdventurerState = adventurerState;
      const obstacleId = hexToNumber(eventData[32]);
      const level = hexToNumber(eventData[33]);
      const obstacleName = obstacleManager.getObstacleName(obstacleId);

      events.push({
        name: "DodgedObstacle",
        data: {
          adventurerState,
          id: obstacleId,
          level,
          damageTaken: 0,
          damageLocation: hexToNumber(eventData[35]),
          xpEarnedAdventurer: hexToNumber(eventData[36]),
          xpEarnedItems: hexToNumber(eventData[37]),
        },
        description: `Dodged ${obstacleName} (Level ${level})`,
      });
      summaryParts.push(`Dodged ${obstacleName}`);
      detailedParts.push(`✨ Dodged ${obstacleName} (Level ${level})!`);
      if (hexToNumber(eventData[36]) > 0 || hexToNumber(eventData[37]) > 0) {
        detailedParts.push(`Gained ${hexToNumber(eventData[36])} XP`);
      }
    }

    // DiscoveredBeast event
    else if (eventKey === HASHED_SELECTORS.DiscoveredBeast) {
      const adventurerState = parseAdventurerState(eventData);
      latestAdventurerState = adventurerState;
      const seed = hexToNumber(eventData[32]);
      const beastId = hexToNumber(eventData[33]);
      const beastSpec = parseCombatSpec(eventData, 34);
      const beastName = beastManager.getBeastName(beastId);

      events.push({
        name: "DiscoveredBeast",
        data: {
          adventurerState,
          seed,
          id: beastId,
          beastSpecs: beastSpec,
        },
        description: `Discovered ${beastName} (Level ${beastSpec.level})`,
      });
      summaryParts.push(`Encountered ${beastName} (Level ${beastSpec.level})`);
      
      currentBeast = {
        id: beastId,
        health: adventurerState.adventurer.beastHealth,
        level: beastSpec.level,
        type: beastManager.getBeastType(beastId)
      };
      
      detailedParts.push(`👹 Discovered ${beastName}!`);
      detailedParts.push(`Beast: Level ${beastSpec.level} ${beastManager.getBeastType(beastId)}`);
      detailedParts.push(`Beast Health: ${adventurerState.adventurer.beastHealth}`);
      detailedParts.push(`Your Health: ${adventurerState.adventurer.health}/${calculateMaxHealth(adventurerState)}`);
    }

    // AmbushedByBeast event
    else if (eventKey === HASHED_SELECTORS.AmbushedByBeast) {
      const adventurerState = parseAdventurerState(eventData);
      latestAdventurerState = adventurerState;
      const seed = hexToNumber(eventData[32]);
      const beastId = hexToNumber(eventData[33]);
      const beastSpec = parseCombatSpec(eventData, 34);
      const damage = hexToNumber(eventData[40]);
      const criticalHit = hexToNumber(eventData[41]) === 1;
      const beastName = beastManager.getBeastName(beastId);

      events.push({
        name: "AmbushedByBeast",
        data: {
          adventurerState,
          seed,
          id: beastId,
          beastSpecs: beastSpec,
          damage,
          criticalHit,
          location: hexToNumber(eventData[42]),
        },
        description: `Ambushed by ${beastName} for ${damage} damage${criticalHit ? ' (Critical!)' : ''}`,
      });
      summaryParts.push(`Ambushed by ${beastName} for ${damage} damage`);
      
      currentBeast = {
        id: beastId,
        health: adventurerState.adventurer.beastHealth,
        level: beastSpec.level,
        type: beastManager.getBeastType(beastId)
      };
      
      detailedParts.push(`⚠️ AMBUSHED by ${beastName}!`);
      detailedParts.push(`${beastName} attacked for ${damage} damage${criticalHit ? ' (CRITICAL HIT!)' : ''}`);
      detailedParts.push(`Your Health: ${adventurerState.adventurer.health}/${calculateMaxHealth(adventurerState)}`);
      detailedParts.push(`Beast Health: ${adventurerState.adventurer.beastHealth}`);
    }

    // AttackedBeast event
    else if (eventKey === HASHED_SELECTORS.AttackedBeast) {
      const adventurerState = parseAdventurerState(eventData);
      latestAdventurerState = adventurerState;
      const seed = hexToNumber(eventData[32]);
      const beastId = hexToNumber(eventData[33]);
      const beastSpec = parseCombatSpec(eventData, 34);
      const damage = hexToNumber(eventData[40]);
      const criticalHit = hexToNumber(eventData[41]) === 1;
      const beastName = beastManager.getBeastName(beastId);

      events.push({
        name: "AttackedBeast",
        data: {
          adventurerState,
          seed,
          id: beastId,
          beastSpecs: beastSpec,
          damage,
          criticalHit,
          location: hexToNumber(eventData[42]),
        },
        description: `Attacked ${beastName} for ${damage} damage${criticalHit ? ' (Critical!)' : ''}`,
      });
      summaryParts.push(`Attacked ${beastName} for ${damage} damage`);
      
      if (adventurerState.adventurer.beastHealth > 0) {
        currentBeast = {
          id: beastId,
          health: adventurerState.adventurer.beastHealth,
          level: beastSpec.level,
          type: beastManager.getBeastType(beastId)
        };
      }
      
      detailedParts.push(`⚔️ Attacked ${beastName} for ${damage} damage${criticalHit ? ' (CRITICAL HIT!)' : ''}`);
      detailedParts.push(`Beast Health: ${adventurerState.adventurer.beastHealth}`);
      detailedParts.push(`Your Health: ${adventurerState.adventurer.health}/${calculateMaxHealth(adventurerState)}`);
    }

    // AttackedByBeast event
    else if (eventKey === HASHED_SELECTORS.AttackedByBeast) {
      const adventurerState = parseAdventurerState(eventData);
      latestAdventurerState = adventurerState;
      const seed = hexToNumber(eventData[32]);
      const beastId = hexToNumber(eventData[33]);
      const beastSpec = parseCombatSpec(eventData, 34);
      const damage = hexToNumber(eventData[40]);
      const criticalHit = hexToNumber(eventData[41]) === 1;
      const beastName = beastManager.getBeastName(beastId);

      events.push({
        name: "AttackedByBeast",
        data: {
          adventurerState,
          seed,
          id: beastId,
          beastSpecs: beastSpec,
          damage,
          criticalHit,
          location: hexToNumber(eventData[42]),
        },
        description: `${beastName} attacked for ${damage} damage${criticalHit ? ' (Critical!)' : ''}`,
      });
      summaryParts.push(`${beastName} attacked for ${damage} damage`);
      
      if (adventurerState.adventurer.beastHealth > 0) {
        currentBeast = {
          id: beastId,
          health: adventurerState.adventurer.beastHealth,
          level: beastSpec.level,
          type: beastManager.getBeastType(beastId)
        };
      }
      
      detailedParts.push(`💢 ${beastName} counter-attacked for ${damage} damage${criticalHit ? ' (CRITICAL HIT!)' : ''}`);
      detailedParts.push(`Your Health: ${adventurerState.adventurer.health}/${calculateMaxHealth(adventurerState)}`);
      detailedParts.push(`Beast Health: ${adventurerState.adventurer.beastHealth}`);
    }

    // SlayedBeast event
    else if (eventKey === HASHED_SELECTORS.SlayedBeast) {
      const adventurerState = parseAdventurerState(eventData);
      latestAdventurerState = adventurerState;
      const seed = hexToNumber(eventData[32]);
      const beastId = hexToNumber(eventData[33]);
      const beastSpec = parseCombatSpec(eventData, 34);
      const damageDealt = hexToNumber(eventData[40]);
      const criticalHit = hexToNumber(eventData[41]) === 1;
      const xpEarnedAdventurer = hexToNumber(eventData[42]);
      const xpEarnedItems = hexToNumber(eventData[43]);
      const goldEarned = hexToNumber(eventData[44]);
      const beastName = beastManager.getBeastName(beastId);

      events.push({
        name: "SlayedBeast",
        data: {
          adventurerState,
          seed,
          id: beastId,
          beastSpecs: beastSpec,
          damageDealt,
          criticalHit,
          xpEarnedAdventurer,
          xpEarnedItems,
          goldEarned,
        },
        description: `Slayed ${beastName}! Earned ${xpEarnedAdventurer} XP and ${goldEarned} gold`,
      });
      summaryParts.push(`Slayed ${beastName}! +${xpEarnedAdventurer} XP, +${goldEarned} gold`);
      
      detailedParts.push(`🏆 VICTORY! Slayed ${beastName}!`);
      detailedParts.push(`Final blow: ${damageDealt} damage${criticalHit ? ' (CRITICAL HIT!)' : ''}`);
      detailedParts.push(`Rewards: +${xpEarnedAdventurer} XP, +${goldEarned} gold`);
      detailedParts.push(`Total XP: ${adventurerState.adventurer.xp} | Total Gold: ${adventurerState.adventurer.gold}`);
    }

    // FleeSucceeded event
    else if (eventKey === HASHED_SELECTORS.FleeSucceeded) {
      const adventurerState = parseAdventurerState(eventData);
      latestAdventurerState = adventurerState;
      const beastId = hexToNumber(eventData[33]);
      const beastName = beastManager.getBeastName(beastId);

      events.push({
        name: "FleeSucceeded",
        data: {
          adventurerState,
          seed: hexToNumber(eventData[32]),
          id: beastId,
          beastSpecs: parseCombatSpec(eventData, 34),
        },
        description: `Successfully fled from ${beastName}`,
      });
      summaryParts.push(`Fled from ${beastName}`);
      detailedParts.push(`🏃 Successfully fled from ${beastName}!`);
      detailedParts.push(`Your Health: ${adventurerState.adventurer.health}/${calculateMaxHealth(adventurerState)}`);
    }

    // FleeFailed event
    else if (eventKey === HASHED_SELECTORS.FleeFailed) {
      const adventurerState = parseAdventurerState(eventData);
      latestAdventurerState = adventurerState;
      const beastId = hexToNumber(eventData[33]);
      const beastName = beastManager.getBeastName(beastId);

      events.push({
        name: "FleeFailed",
        data: {
          adventurerState,
          seed: hexToNumber(eventData[32]),
          id: beastId,
          beastSpecs: parseCombatSpec(eventData, 34),
        },
        description: `Failed to flee from ${beastName}`,
      });
      summaryParts.push(`Failed to flee from ${beastName}`);
      
      if (adventurerState.adventurer.beastHealth > 0) {
        currentBeast = {
          id: beastId,
          health: adventurerState.adventurer.beastHealth,
          level: beastSpec.level,
          type: beastManager.getBeastType(beastId)
        };
      }
      
      detailedParts.push(`❌ Failed to flee from ${beastName}!`);
      detailedParts.push(`Still in combat! Beast Health: ${adventurerState.adventurer.beastHealth}`);
    }

    // AdventurerLeveledUp event
    else if (eventKey === HASHED_SELECTORS.AdventurerLeveledUp) {
      const adventurerState = parseAdventurerState(eventData);
      latestAdventurerState = adventurerState;
      const previousLevel = hexToNumber(eventData[32]);
      const newLevel = hexToNumber(eventData[33]);

      events.push({
        name: "AdventurerLeveledUp",
        data: {
          adventurerState,
          previousLevel,
          newLevel,
        },
        description: `Leveled up from ${previousLevel} to ${newLevel}!`,
      });
      summaryParts.push(`Level up! Now level ${newLevel}`);
      
      detailedParts.push(`🎆 LEVEL UP! ${previousLevel} → ${newLevel}`);
      detailedParts.push(`Total XP: ${adventurerState.adventurer.xp}`);
      detailedParts.push(`Health restored to full: ${adventurerState.adventurer.health}/${calculateMaxHealth(adventurerState)}`);
      if (adventurerState.adventurer.statUpgradesAvailable > 0) {
        detailedParts.push(`📈 ${adventurerState.adventurer.statUpgradesAvailable} stat upgrades available!`);
      }
    }

    // AdventurerUpgraded event
    else if (eventKey === HASHED_SELECTORS.AdventurerUpgraded) {
      const adventurerState = parseAdventurerState(eventData);
      latestAdventurerState = adventurerState;
      
      const upgrades = {
        strengthIncrease: hexToNumber(eventData[64]),
        dexterityIncrease: hexToNumber(eventData[65]),
        vitalityIncrease: hexToNumber(eventData[66]),
        intelligenceIncrease: hexToNumber(eventData[67]),
        wisdomIncrease: hexToNumber(eventData[68]),
        charismaIncrease: hexToNumber(eventData[69]),
      };

      const upgradeStrings = [];
      if (upgrades.strengthIncrease > 0) upgradeStrings.push(`+${upgrades.strengthIncrease} STR`);
      if (upgrades.dexterityIncrease > 0) upgradeStrings.push(`+${upgrades.dexterityIncrease} DEX`);
      if (upgrades.vitalityIncrease > 0) upgradeStrings.push(`+${upgrades.vitalityIncrease} VIT`);
      if (upgrades.intelligenceIncrease > 0) upgradeStrings.push(`+${upgrades.intelligenceIncrease} INT`);
      if (upgrades.wisdomIncrease > 0) upgradeStrings.push(`+${upgrades.wisdomIncrease} WIS`);
      if (upgrades.charismaIncrease > 0) upgradeStrings.push(`+${upgrades.charismaIncrease} CHA`);

      events.push({
        name: "AdventurerUpgraded",
        data: {
          adventurerStateWithBag: { adventurerState, bag: null },
          ...upgrades,
        },
        description: `Upgraded stats: ${upgradeStrings.join(', ')}`,
      });
      summaryParts.push(`Upgraded: ${upgradeStrings.join(', ')}`);
      
      detailedParts.push(`💪 Stats Upgraded!`);
      detailedParts.push(upgradeStrings.join(', '));
      detailedParts.push(`New Stats: STR ${adventurerState.adventurer.stats.strength} | DEX ${adventurerState.adventurer.stats.dexterity} | VIT ${adventurerState.adventurer.stats.vitality}`);
      detailedParts.push(`INT ${adventurerState.adventurer.stats.intelligence} | WIS ${adventurerState.adventurer.stats.wisdom} | CHA ${adventurerState.adventurer.stats.charisma}`);
    }

    // AdventurerDied event
    else if (eventKey === HASHED_SELECTORS.AdventurerDied) {
      const adventurerState = parseAdventurerState(eventData);
      latestAdventurerState = adventurerState;
      const killedByBeast = hexToNumber(eventData[32]);
      const killedByObstacle = hexToNumber(eventData[33]);

      let deathCause = "Unknown";
      if (killedByBeast > 0) {
        deathCause = beastManager.getBeastName(killedByBeast);
      } else if (killedByObstacle > 0) {
        deathCause = obstacleManager.getObstacleName(killedByObstacle);
      }

      events.push({
        name: "AdventurerDied",
        data: {
          adventurerState,
          killedByBeast,
          killedByObstacle,
          callerAddress: eventData[34],
        },
        description: `Adventurer died! Killed by ${deathCause}`,
      });
      summaryParts.push(`GAME OVER! Killed by ${deathCause}`);
      
      detailedParts.push(`💀 GAME OVER!`);
      detailedParts.push(`Killed by: ${deathCause}`);
      detailedParts.push(`Final Level: ${Math.max(Math.floor(Math.sqrt(adventurerState.adventurer.xp)), 1)}`);
      detailedParts.push(`Total XP: ${adventurerState.adventurer.xp}`);
      detailedParts.push(`Gold Collected: ${adventurerState.adventurer.gold}`);
    }

    // PurchasedItems event
    else if (eventKey === HASHED_SELECTORS.PurchasedItems) {
      const adventurerState = parseAdventurerState(eventData);
      latestAdventurerState = adventurerState;
      const bag = parseBag(eventData, 32);
      
      // Parse purchased items
      const purchaseCount = hexToNumber(eventData[63]);
      const purchases = [];
      for (let i = 0; i < purchaseCount; i++) {
        const itemId = hexToNumber(eventData[64 + i * 2]);
        const price = hexToNumber(eventData[65 + i * 2]);
        purchases.push({
          item: { id: itemId },
          price,
        });
      }

      const itemNames = purchases.map(p => Loot[p.item.id] || `Item ${p.item.id}`).join(', ');
      const totalCost = purchases.reduce((sum, p) => sum + p.price, 0);

      events.push({
        name: "PurchasedItems",
        data: {
          adventurerStateWithBag: { adventurerState, bag },
          purchases,
        },
        description: `Purchased: ${itemNames} for ${totalCost} gold`,
      });
      summaryParts.push(`Bought ${itemNames}`);
      
      detailedParts.push(`🛍️ Purchased Items:`);
      purchases.forEach(p => {
        const lootManager = new LootManager(p.item.id, 0, BigInt(0));
        detailedParts.push(`- ${Loot[p.item.id]} [${lootManager.getItemType()}] for ${p.price} gold`);
      });
      detailedParts.push(`Gold remaining: ${adventurerState.adventurer.gold}`);
    }

    // PurchasedPotions event
    else if (eventKey === HASHED_SELECTORS.PurchasedPotions) {
      const adventurerState = parseAdventurerState(eventData);
      latestAdventurerState = adventurerState;
      const quantity = hexToNumber(eventData[32]);
      const cost = hexToNumber(eventData[33]);
      const health = hexToNumber(eventData[34]);

      events.push({
        name: "PurchasedPotions",
        data: {
          adventurerState,
          quantity,
          cost,
          health,
        },
        description: `Purchased ${quantity} potion(s) for ${cost} gold, healed to ${health} HP`,
      });
      summaryParts.push(`Bought ${quantity} potion(s), healed to ${health} HP`);
      
      detailedParts.push(`🧪 Purchased ${quantity} potion(s) for ${cost} gold`);
      detailedParts.push(`Healed to ${health}/${calculateMaxHealth(adventurerState)} HP`);
      detailedParts.push(`Gold remaining: ${adventurerState.adventurer.gold}`);
    }

    // EquippedItems event
    else if (eventKey === HASHED_SELECTORS.EquippedItems) {
      const adventurerState = parseAdventurerState(eventData);
      latestAdventurerState = adventurerState;
      const bag = parseBag(eventData, 32);
      
      const equippedCount = hexToNumber(eventData[63]);
      const equippedItems = [];
      for (let i = 0; i < equippedCount; i++) {
        equippedItems.push(hexToNumber(eventData[64 + i]));
      }

      const unequippedCount = hexToNumber(eventData[64 + equippedCount]);
      const unequippedItems = [];
      for (let i = 0; i < unequippedCount; i++) {
        unequippedItems.push(hexToNumber(eventData[65 + equippedCount + i]));
      }

      const equippedNames = equippedItems.map(id => Loot[id] || `Item ${id}`).join(', ');

      events.push({
        name: "EquippedItems",
        data: {
          adventurerStateWithBag: { adventurerState, bag },
          equippedItems,
          unequippedItems,
        },
        description: `Equipped: ${equippedNames}`,
      });
      summaryParts.push(`Equipped ${equippedNames}`);
      
      detailedParts.push(`🔰 Equipment Changed:`);
      equippedItems.forEach(id => {
        const lootManager = new LootManager(id, 0, BigInt(0));
        detailedParts.push(`Equipped: ${Loot[id]} [${lootManager.getItemType()}]`);
      });
      if (unequippedItems.length > 0) {
        detailedParts.push(`Unequipped: ${unequippedItems.map(id => Loot[id]).join(', ')}`);
      }
    }

    // EquipmentChanged event
    else if (eventKey === HASHED_SELECTORS.EquipmentChanged) {
      const adventurerState = parseAdventurerState(eventData);
      latestAdventurerState = adventurerState;
      const bag = parseBag(eventData, 32);
      
      const equippedCount = hexToNumber(eventData[63]);
      const equippedItems = [];
      for (let i = 0; i < equippedCount; i++) {
        equippedItems.push(hexToNumber(eventData[64 + i]));
      }

      const baggedCount = hexToNumber(eventData[64 + equippedCount]);
      const baggedItems = [];
      for (let i = 0; i < baggedCount; i++) {
        baggedItems.push(hexToNumber(eventData[65 + equippedCount + i]));
      }

      const droppedCount = hexToNumber(eventData[65 + equippedCount + baggedCount]);
      const droppedItems = [];
      for (let i = 0; i < droppedCount; i++) {
        droppedItems.push(hexToNumber(eventData[66 + equippedCount + baggedCount + i]));
      }

      const changes = [];
      if (equippedItems.length > 0) {
        changes.push(`Equipped: ${equippedItems.map(id => Loot[id] || `Item ${id}`).join(', ')}`);
      }
      if (baggedItems.length > 0) {
        changes.push(`Bagged: ${baggedItems.map(id => Loot[id] || `Item ${id}`).join(', ')}`);
      }
      if (droppedItems.length > 0) {
        changes.push(`Dropped: ${droppedItems.map(id => Loot[id] || `Item ${id}`).join(', ')}`);
      }

      events.push({
        name: "EquipmentChanged",
        data: {
          adventurerStateWithBag: { adventurerState, bag },
          equippedItems,
          baggedItems,
          droppedItems,
        },
        description: changes.join('; '),
      });
      summaryParts.push(changes.join('; '));
      
      detailedParts.push(`🎒 Inventory Updated:`);
      changes.forEach(change => detailedParts.push(change));
    }

    // UpgradesAvailable event
    else if (eventKey === HASHED_SELECTORS.UpgradesAvailable) {
      const adventurerState = parseAdventurerState(eventData);
      latestAdventurerState = adventurerState;
      
      const itemCount = hexToNumber(eventData[32]);
      const items = [];
      for (let i = 0; i < itemCount; i++) {
        items.push(hexToNumber(eventData[33 + i]));
      }

      const itemNames = items.map(id => Loot[id] || `Item ${id}`).join(', ');

      events.push({
        name: "UpgradesAvailable",
        data: {
          adventurerState,
          items,
        },
        description: `New items available: ${itemNames}`,
      });
      summaryParts.push(`Shop refreshed with: ${itemNames}`);
      
      // Store market items for the game state
      marketItems = items;
      
      detailedParts.push(`🏪 MARKET OPEN!`);
      detailedParts.push(`Gold: ${adventurerState.adventurer.gold}`);
      detailedParts.push(`Stat Upgrades Available: ${adventurerState.adventurer.statUpgradesAvailable}`);
      detailedParts.push(`\nItems for sale:`);
      items.forEach(id => {
        const lootManager = new LootManager(id, 0, BigInt(0));
        const tier = ITEM_TIERS[id as Loot] || 1;
        const basePrice = tier * ITEM_BASE_PRICE;
        const discount = Math.min(adventurerState.adventurer.stats.charisma * ITEM_CHARISMA_DISCOUNT, basePrice - ITEM_MINIMUM_PRICE);
        const price = Math.max(basePrice - discount, ITEM_MINIMUM_PRICE);
        detailedParts.push(`- ${Loot[id]} [${lootManager.getItemType()}] - ${price} gold`);
      });
      const potionPrice = Math.max(POTION_BASE_PRICE - (adventurerState.adventurer.stats.charisma * POTION_CHARISMA_DISCOUNT), 0);
      detailedParts.push(`\nPotion Price: ${potionPrice} gold (heals you)`);
    }
  }

  const summary = summaryParts.length > 0 
    ? summaryParts.join(". ") 
    : "Action completed successfully";
    
  const detailedSummary = detailedParts.length > 0
    ? detailedParts.join('\n')
    : undefined;

  return {
    adventurerState: latestAdventurerState,
    events,
    summary,
    detailedSummary,
    marketItems,
    currentBeast,
  };
}