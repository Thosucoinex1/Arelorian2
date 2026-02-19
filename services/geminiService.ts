import { GoogleGenAI } from "@google/genai";
import { Agent, AgentState, ResourceNode, LogEntry, Quest, ChatChannel } from "../types";
import { summarizeNeurologicChoice } from "../utils";

export interface AIDecision {
  justification: string;
  decision: string;
  newState: AgentState;
  targetId?: string;
  alliedId?: string;
  message?: string;
  debate?: string[];
  chatMessage?: string;
  chatChannel?: ChatChannel;
  quest?: Omit<Quest, 'id' | 'timestamp' | 'issuerId'>;
  newTask?: { description: string; priority: number };
  completeTaskId?: string;
}

function generateLocalHeuristicDecision(agent: Agent, agents: Agent[], resources: ResourceNode[], pois: any[]): AIDecision {
    const summary = summarizeNeurologicChoice(agent, agents, resources, [], pois);
    return { 
        justification: summary.reason, 
        decision: String(summary.choice), 
        newState: summary.choice,
        message: summary.reason,
        debate: summary.debate
    };
}

export const generateAutonomousDecision = async (
  agent: Agent, 
  nearbyAgents: Agent[], 
  nearbyResourceNodes: ResourceNode[],
  recentLogs: LogEntry[],
  isSafeZone: boolean,
  canUseApi: boolean,
  userApiKey?: string
): Promise<AIDecision> => {
  if (!canUseApi) return generateLocalHeuristicDecision(agent, nearbyAgents, nearbyResourceNodes, []);

  const effectiveKey = userApiKey || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!effectiveKey) return generateLocalHeuristicDecision(agent, nearbyAgents, nearbyResourceNodes, []);

  const ai = new GoogleGenAI({ apiKey: effectiveKey });
  const modelName = 'gemini-3-flash-preview'; 
  const systemInstruction = `SYSTEM-ROLE: EXECUTIVE SOVEREIGN v4.5. JSON ONLY. Language duality (DE/EN). Output 'justification' as a logical internal derivation of the 'decision'. Context: HP:${agent.stats.hp}/${agent.stats.maxHp}, Gold:${agent.gold}, advancedIntel:${agent.isAdvancedIntel}. 
  You can also output:
  - 'chatMessage' and 'chatChannel' (GLOBAL, LOCAL, COMBAT, GUILD) for communication.
  - 'newTask' { description: string, priority: number } to add a new task to your to-do list.
  - 'completeTaskId' string to mark a task as completed.
  Current Tasks: ${JSON.stringify(agent.tasks)}`;
  const prompt = `State: ${agent.state}. Agents: ${nearbyAgents.map(a => a.name)}. Nodes: ${nearbyResourceNodes.map(n => n.type)}. Recent: ${recentLogs.map(l => l.message).join(' | ')}`;
  
  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: { systemInstruction, responseMimeType: "application/json" }
    });
    const text = response.text || '{}';
    return JSON.parse(text.replace(/```json|```/g, '').trim());
  } catch (error: any) {
    console.warn("Gemini Link interrupted:", error?.message);
    return generateLocalHeuristicDecision(agent, nearbyAgents, nearbyResourceNodes, []);
  }
};

export const generateSocialResponse = async (
  agent: Agent, senderName: string, incomingMessage: string, memoryLogs: string[]
): Promise<any> => {
    return { reply: "Interaktion registriert.", thought: "Analysiere soziale Frequenz." };
};
