import { create } from 'zustand';
import { 
  Agent, AgentState, ResourceNode, LogEntry, ChatMessage, Chunk, Item, 
  Monster, MonsterType, MONSTER_TEMPLATES, ChatChannel, ResourceType, POI, CraftingOrder, MarketState, Quest, LandParcel, StructureType, Task
} from './types';
import { getBiomeForChunk, generateProceduralPOIs, summarizeNeurologicChoice } from './utils';
import { generateAutonomousDecision } from './services/geminiService';

interface GameState {
  agents: Agent[]; monsters: Monster[]; resourceNodes: ResourceNode[]; pois: POI[]; logs: LogEntry[]; chatMessages: ChatMessage[];
  loadedChunks: Chunk[]; market: MarketState; craftingOrders: CraftingOrder[]; quests: Quest[]; landParcels: LandParcel[];
  selectedAgentId: string | null; cameraTarget: [number, number, number] | null; 
  serverStats: { uptime: number; tickRate: number; memoryUsage: number; threatLevel: number };
  user: { id: string; name: string; email: string }; userApiKey: string | null; matrixEnergy: number; 
  globalApiCooldown: number; device: { isMobile: boolean }; lastLocalThinkTime: number;
  showMarket: boolean; showAdmin: boolean; showMap: boolean; showCharacterSheet: boolean; isAxiomAuthenticated: boolean;

  initGame: () => void; updatePhysics: (delta: number) => void; runCognition: () => void;
  addLog: (message: string, type: LogEntry['type'], sender?: string) => void;
  addChatMessage: (content: string, channel: ChatChannel, senderId: string, senderName: string) => void;
  selectAgent: (id: string | null) => void; setCameraTarget: (target: [number, number, number] | null) => void;
  toggleMarket: (show: boolean) => void; toggleAdmin: (show: boolean) => void; toggleMap: (show: boolean) => void;
  toggleCharacterSheet: (show: boolean) => void; setAxiomAuthenticated: (auth: boolean) => void;
  setUserApiKey: (key: string | null) => void; consumeEnergy: (amount: number) => boolean; refillEnergy: (amount: number) => void;
  setGlobalApiCooldown: (timestamp: number) => void;
  addTask: (agentId: string, description: string, priority: number) => void;
  completeTask: (agentId: string, taskId: string) => void;
  clearCompletedTasks: (agentId: string) => void;
  processHandshake: (signal: string) => void;
}

export const useStore = create<GameState>((set, get) => ({
  agents: [], monsters: [], resourceNodes: [], pois: [], logs: [], chatMessages: [], loadedChunks: [], quests: [], landParcels: [],
  userApiKey: localStorage.getItem('OUROBOROS_API_KEY'), matrixEnergy: 100, globalApiCooldown: 0,
  market: {
    prices: { WOOD: 5, STONE: 8, IRON_ORE: 15, SILVER_ORE: 40, GOLD_ORE: 100, DIAMOND: 500, ANCIENT_RELIC: 1000, SUNLEAF_HERB: 25 },
    inventory: { WOOD: 100, STONE: 100, IRON_ORE: 50, SILVER_ORE: 10, GOLD_ORE: 5, DIAMOND: 1, ANCIENT_RELIC: 0, SUNLEAF_HERB: 20 }
  },
  craftingOrders: [], selectedAgentId: null, cameraTarget: null,
  serverStats: { uptime: 0, tickRate: 60, memoryUsage: 128, threatLevel: 0.05 },
  user: { id: 'u1', name: 'Admin', email: 'projectouroboroscollective@gmail.com' },
  device: { isMobile: /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) },
  lastLocalThinkTime: 0, showMarket: false, showAdmin: false, showMap: false, showCharacterSheet: false, isAxiomAuthenticated: false,

  setUserApiKey: (key) => {
    if (key) localStorage.setItem('OUROBOROS_API_KEY', key);
    else localStorage.removeItem('OUROBOROS_API_KEY');
    set({ userApiKey: key });
  },
  setGlobalApiCooldown: (timestamp) => set({ globalApiCooldown: timestamp }),
  consumeEnergy: (amount) => {
    const current = get().matrixEnergy;
    if (current >= amount) { set({ matrixEnergy: current - amount }); return true; }
    return false;
  },
  refillEnergy: (amount) => set(s => ({ matrixEnergy: s.matrixEnergy + amount })),
  selectAgent: (id) => set({ selectedAgentId: id }),
  setCameraTarget: (target) => set({ cameraTarget: target }),
  toggleMarket: (show) => set({ showMarket: show }),
  toggleAdmin: (show) => set({ showAdmin: show }),
  toggleMap: (show) => set({ showMap: show }),
  toggleCharacterSheet: (show) => set({ showCharacterSheet: show }),
  addTask: (agentId, description, priority) => set(s => ({
    agents: s.agents.map(a => a.id === agentId ? {
      ...a,
      tasks: [...a.tasks, { id: Math.random().toString(36), description, priority, isCompleted: false, createdAt: Date.now() }].sort((x, y) => y.priority - x.priority)
    } : a)
  })),
  completeTask: (agentId, taskId) => set(s => ({
    agents: s.agents.map(a => a.id === agentId ? {
      ...a,
      tasks: a.tasks.map(t => t.id === taskId ? { ...t, isCompleted: true } : t)
    } : a)
  })),
  clearCompletedTasks: (agentId) => set(s => ({
    agents: s.agents.map(a => a.id === agentId ? {
      ...a,
      tasks: a.tasks.filter(t => !t.isCompleted)
    } : a)
  })),
  processHandshake: (signal) => {
    const { addLog, refillEnergy, runCognition } = get();
    addLog(`Handshake signal received: ${signal}`, 'AXIOM');
    
    // Handshake logic: parse signal for commands
    const cmd = signal.toUpperCase().trim();
    if (cmd.startsWith('REFILL')) refillEnergy(100);
    if (cmd.startsWith('COGNITION')) runCognition();
    if (cmd.startsWith('SPAWN_RESOURCE')) {
      set(s => ({
        resourceNodes: [...s.resourceNodes, {
          id: `r-${Math.random().toString(36).substr(2, 5)}`,
          type: 'IRON_ORE',
          position: [(Math.random() - 0.5) * 100, 0, (Math.random() - 0.5) * 100],
          amount: 100
        }]
      }));
    }
  },
  setAxiomAuthenticated: (auth) => set({ isAxiomAuthenticated: auth }),
  addLog: (message, type, sender) => set(s => ({ logs: [{ id: Math.random().toString(36), timestamp: Date.now(), message, type, sender }, ...s.logs].slice(0, 50) })),
  addChatMessage: (content, channel, senderId, senderName) => set(s => ({ chatMessages: [...s.chatMessages, { id: Math.random().toString(36), content, channel, senderId, senderName, timestamp: Date.now() }].slice(-50) })),

  initGame: () => {
    const initialPOIs = generateProceduralPOIs(10);
    const initialResources: ResourceNode[] = [
      { id: 'r1', type: 'WOOD', position: [20, 0, 20], amount: 100 },
      { id: 'r2', type: 'STONE', position: [-20, 0, -20], amount: 100 },
      { id: 'r3', type: 'IRON_ORE', position: [30, 0, -30], amount: 100 }
    ];
    const initialAgents: Agent[] = [
      {
        id: 'a1', name: 'Axiom-01', classType: 'Inquisitor', faction: 'PLAYER', position: [0, 0, 0], rotationY: 0, level: 1, xp: 0, insightPoints: 10, visionLevel: 1, visionRange: 50, state: AgentState.IDLE, soulDensity: 1, gold: 100, integrity: 1, energy: 100, maxEnergy: 100, dna: { hash: '0x123', generation: 1, corruption: 0 }, memoryCache: [], thinkingMatrix: { personality: 'Analytical', currentLongTermGoal: 'Ascension', alignment: 0, languagePreference: 'EN', reputation: 0, infamy: 0 }, skills: {}, inventory: [], bank: [], equipment: { mainHand: null, offHand: null, head: null, chest: null, legs: null }, stats: { str: 10, agi: 10, int: 10, vit: 10, hp: 100, maxHp: 100 }, lastScanTime: 0, tasks: []
      },
      {
        id: 'a2', name: 'Rogue-X', classType: 'Mercenary', faction: 'PLAYER', position: [10, 0, 10], rotationY: 0, level: 1, xp: 0, insightPoints: 5, visionLevel: 1, visionRange: 40, state: AgentState.IDLE, soulDensity: 1, gold: 500, integrity: 1, energy: 100, maxEnergy: 100, dna: { hash: '0x456', generation: 1, corruption: 0.1 }, memoryCache: [], thinkingMatrix: { personality: 'Aggressive', currentLongTermGoal: 'Wealth', alignment: -10, languagePreference: 'EN', aggression: 0.8, reputation: -5, infamy: 10 }, skills: {}, inventory: [], bank: [], equipment: { mainHand: null, offHand: null, head: null, chest: null, legs: null }, stats: { str: 15, agi: 12, int: 8, vit: 12, hp: 120, maxHp: 120 }, lastScanTime: 0, tasks: []
      }
    ];
    const initialMonsters: Monster[] = [
      { id: 'm1', type: 'SLIME', name: 'Void Slime', position: [15, 0, -15], rotationY: 0, stats: { hp: 30, maxHp: 30, atk: 3, def: 1 }, xpReward: 15, state: 'IDLE', targetId: null, color: '#22c55e', scale: 0.5 },
      { id: 'm2', type: 'GOBLIN', name: 'Scavenger', position: [-15, 0, 15], rotationY: 0, stats: { hp: 60, maxHp: 60, atk: 8, def: 3 }, xpReward: 40, state: 'IDLE', targetId: null, color: '#84cc16', scale: 0.8 }
    ];
    set({ pois: initialPOIs, agents: initialAgents, resourceNodes: initialResources, monsters: initialMonsters });
  },

  updatePhysics: (delta) => {
    const { agents, resourceNodes, pois, monsters, addLog } = get();
    
    // Update Monsters
    const updatedMonsters = monsters.map(monster => {
      let { position, state, targetId } = monster;
      const speed = 1 * delta;
      
      if (state === 'DEAD') return monster;

      // Find nearest agent if idle
      if (state === 'IDLE') {
        const nearestAgent = agents.find(a => Math.hypot(a.position[0] - position[0], a.position[2] - position[2]) < 10);
        if (nearestAgent) {
          state = 'COMBAT';
          targetId = nearestAgent.id;
        }
      }

      if (state === 'COMBAT' && targetId) {
        const target = agents.find(a => a.id === targetId);
        if (target) {
          const dx = target.position[0] - position[0];
          const dz = target.position[2] - position[2];
          const dist = Math.hypot(dx, dz);
          if (dist > 1.5) {
            position = [position[0] + (dx / dist) * speed, position[1], position[2] + (dz / dist) * speed];
          } else {
            // Attack logic (simplified)
            if (Math.random() < 0.01) {
              const damage = Math.max(1, monster.stats.atk - Math.floor(target.stats.vit / 2));
              // In a real app we'd update agent HP here, but for now just log
              // addLog(`${monster.name} hit ${target.name} for ${damage}`, 'COMBAT');
            }
          }
        } else {
          state = 'IDLE';
          targetId = null;
        }
      }

      return { ...monster, position, state, targetId };
    });

    // Update Agents
    const updatedAgents = agents.map(agent => {
      let { position, state, targetId, xp, level, stats, gold } = agent;
      const speed = (2 + (agent.stats.agi / 10)) * delta;
      
      if (state === AgentState.EXPLORING) {
        const targetPOI = pois.find(p => !p.isDiscovered);
        if (targetPOI) {
          const dx = targetPOI.position[0] - position[0];
          const dz = targetPOI.position[2] - position[2];
          const dist = Math.hypot(dx, dz);
          if (dist > 1) {
            position = [position[0] + (dx / dist) * speed, position[1], position[2] + (dz / dist) * speed];
          } else {
            set(s => ({
              pois: s.pois.map(p => p.id === targetPOI.id ? { ...p, isDiscovered: true } : p)
            }));
            addLog(`${agent.name} discovered ${targetPOI.type}`, 'EVENT', agent.name);
            xp += 20;
          }
        }
      } else if (state === AgentState.GATHERING) {
        const targetRes = resourceNodes[0];
        if (targetRes) {
          const dx = targetRes.position[0] - position[0];
          const dz = targetRes.position[2] - position[2];
          const dist = Math.hypot(dx, dz);
          if (dist > 1.5) {
            position = [position[0] + (dx / dist) * speed, position[1], position[2] + (dz / dist) * speed];
          } else {
            // Gathering logic
            if (Math.random() < 0.05) {
              const amount = 1 + Math.floor(agent.stats.str / 5);
              gold += amount * 2;
              xp += 5;
            }
          }
        }
      } else if (state === AgentState.COMBAT) {
        const target = agents.find(a => a.id === targetId) || monsters.find(m => m.id === targetId);
        if (target) {
          const dx = target.position[0] - position[0];
          const dz = target.position[2] - position[2];
          const dist = Math.hypot(dx, dz);
          if (dist > 2) {
            position = [position[0] + (dx / dist) * speed, position[1], position[2] + (dz / dist) * speed];
          } else {
            // Combat logic
            if (Math.random() < 0.02) {
              xp += 10;
            }
          }
        }
      }
      
      // Level up logic
      if (xp >= level * 100) {
        xp -= level * 100;
        level += 1;
        stats = { ...stats, maxHp: stats.maxHp + 20, hp: stats.maxHp + 20, str: stats.str + 2, agi: stats.agi + 2 };
        addLog(`${agent.name} reached Level ${level}!`, 'AXIOM', agent.name);
      }

      return { ...agent, position, xp, level, stats, gold };
    });

    set(s => ({ 
      agents: updatedAgents,
      monsters: updatedMonsters,
      serverStats: { ...s.serverStats, uptime: s.serverStats.uptime + delta } 
    }));
  },

  runCognition: async () => {
    const { agents, resourceNodes, logs, globalApiCooldown, userApiKey, consumeEnergy } = get();
    const canUseApi = Date.now() > globalApiCooldown;
    
    // Consume energy for the cycle
    if (!consumeEnergy(5)) {
      get().addLog("Matrix Energy too low for cognition cycle", "SYSTEM");
      return;
    }

    for (const agent of agents) {
        if (agent.state === AgentState.THINKING) continue;
        const decision = await generateAutonomousDecision(agent, agents.filter(a => a.id !== agent.id), resourceNodes, logs.slice(0, 5), false, canUseApi, userApiKey || undefined);
        
        if (decision.debate) {
          decision.debate.forEach(line => {
            get().addLog(line, 'THOUGHT', agent.name);
          });
        }
        
        get().addLog(`Agent ${agent.name} decided: ${decision.decision}`, 'THOUGHT', agent.name);
        
        if (decision.chatMessage && Math.random() > 0.3) {
          let channel: ChatChannel = decision.chatChannel || 'GLOBAL';
          if (agent.state === AgentState.COMBAT) channel = 'COMBAT';
          else if (agent.state === AgentState.GATHERING) channel = 'LOCAL';
          
          get().addChatMessage(decision.chatMessage, channel, agent.id, agent.name);
        }

        if (decision.newTask) {
          get().addTask(agent.id, decision.newTask.description, decision.newTask.priority);
        }

        if (decision.completeTaskId) {
          get().completeTask(agent.id, decision.completeTaskId);
        }
        
        // Update agent state
        set(s => ({
          agents: s.agents.map(a => a.id === agent.id ? { ...a, state: decision.newState as AgentState, internalDebate: decision.debate } : a)
        }));
    }
  }
}));
