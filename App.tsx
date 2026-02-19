import React, { useEffect, useRef, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars, Text, Float, MeshDistortMaterial } from '@react-three/drei';
import { useStore } from './store';
import { Agent, Monster, ResourceNode, POI, ChatChannel, ResourceType } from './types';
import { Terminal, Shield, Zap, Database, Activity, Map as MapIcon, ShoppingCart, User, MessageSquare, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const World = () => {
  const { agents, monsters, resourceNodes, pois, updatePhysics, selectedAgentId } = useStore();
  const activeAgent = agents.find(a => a.id === selectedAgentId);
  
  useFrame((state, delta) => {
    updatePhysics(delta);
  });

  return (
    <>
      <OrbitControls makeDefault target={activeAgent ? activeAgent.position : [0, 0, 0]} />
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
      
      {/* Agents */}
      {agents.map((agent) => (
        <Float key={agent.id} speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
          <mesh position={agent.position} onClick={() => useStore.getState().selectAgent(agent.id)}>
            <sphereGeometry args={[0.5, 32, 32]} />
            <meshStandardMaterial 
              color={agent.thinkingMatrix.aggression && agent.thinkingMatrix.aggression > 0.5 ? "#ef4444" : "#4f46e5"} 
              emissive={agent.thinkingMatrix.aggression && agent.thinkingMatrix.aggression > 0.5 ? "#ef4444" : "#4f46e5"} 
              emissiveIntensity={0.5} 
            />
            <Text position={[0, 1, 0]} fontSize={0.2} color="white" anchorX="center" anchorY="middle">
              {agent.name}
            </Text>
          </mesh>
        </Float>
      ))}

      {/* POIs */}
      {pois.map((poi) => (
        <mesh key={poi.id} position={poi.position}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial 
            color={poi.isDiscovered ? "#d97706" : "#333"} 
            wireframe={!poi.isDiscovered} 
            emissive={poi.isDiscovered ? "#d97706" : "#000"}
            emissiveIntensity={0.5}
          />
        </mesh>
      ))}

      {/* Resources */}
      {resourceNodes.map((res) => (
        <mesh key={res.id} position={res.position}>
          <octahedronGeometry args={[0.5]} />
          <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={0.5} />
        </mesh>
      ))}

      <gridHelper args={[100, 100, "#222", "#111"]} />
    </>
  );
};

const Chat = () => {
  const { chatMessages, addChatMessage, user, agents, selectedAgentId } = useStore();
  const [message, setMessage] = React.useState('');
  const [channel, setChannel] = React.useState<ChatChannel>('GLOBAL');
  const chatEndRef = useRef<HTMLDivElement>(null);

  const activeAgent = agents.find(a => a.id === selectedAgentId) || { id: user.id, name: user.name };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    addChatMessage(message, channel, activeAgent.id, activeAgent.name);
    setMessage('');
  };

  const channels: ChatChannel[] = ['GLOBAL', 'LOCAL', 'COMBAT', 'GUILD', 'SYSTEM'];

  const getChannelColor = (c: ChatChannel) => {
    switch(c) {
      case 'GLOBAL': return 'text-axiom-cyan';
      case 'LOCAL': return 'text-axiom-gold';
      case 'COMBAT': return 'text-red-400';
      case 'GUILD': return 'text-axiom-purple';
      case 'SYSTEM': return 'text-white/40';
      default: return 'text-white';
    }
  };

  return (
    <div className="w-80 bg-black/80 border border-white/10 rounded-xl backdrop-blur-md pointer-events-auto flex flex-col h-80 shadow-2xl">
      <div className="p-3 border-b border-white/10 flex flex-col gap-2">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2 text-[10px] font-bold text-white/50 tracking-widest">
            <MessageSquare size={12}/> AXIOM_COMMS_v1.2
          </div>
          <div className="text-[8px] font-mono text-axiom-cyan animate-pulse">CONNECTED</div>
        </div>
        <div className="flex gap-1 overflow-x-auto pb-1 no-scrollbar">
          {channels.map(c => (
            <button 
              key={c}
              onClick={() => setChannel(c)}
              className={`text-[8px] px-2 py-0.5 rounded-full border transition-all whitespace-nowrap ${channel === c ? 'bg-white/10 border-white/30 text-white' : 'border-transparent text-white/30 hover:text-white/50'}`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-3 space-y-3 text-[10px] scroll-smooth">
        <AnimatePresence initial={false}>
          {chatMessages.filter(m => m.channel === channel).map((msg) => (
            <motion.div 
              key={msg.id} 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex flex-col group"
            >
              <div className="flex justify-between items-baseline gap-2 mb-0.5">
                <span className={`font-mono font-bold tracking-tighter ${msg.senderId === user.id ? 'text-axiom-gold' : 'text-axiom-cyan'}`}>
                  {msg.senderName.toUpperCase()}
                </span>
                <span className="text-[7px] font-mono text-white/10 group-hover:text-white/30 transition-colors">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              </div>
              <p className={`leading-relaxed break-words ${channel === 'SYSTEM' ? 'italic text-white/40' : 'text-white/80'}`}>
                {msg.content}
              </p>
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={chatEndRef} />
      </div>

      <form onSubmit={handleSend} className="p-2 border-t border-white/10 flex gap-2 bg-white/5">
        <input 
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={` TRANSMIT TO ${channel}...`}
          className="flex-1 bg-transparent border-none rounded px-2 py-1 text-[9px] font-mono focus:outline-none placeholder:text-white/10"
        />
        <button type="submit" className="p-1.5 text-axiom-cyan hover:text-white transition-colors">
          <Send size={12}/>
        </button>
      </form>
    </div>
  );
};

const HandshakeTerminal = () => {
  const { processHandshake } = useStore();
  const [signal, setSignal] = React.useState('');
  const [history, setHistory] = React.useState<string[]>([]);

  const handleTransmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!signal.trim()) return;
    processHandshake(signal);
    setHistory(prev => [signal, ...prev].slice(0, 5));
    setSignal('');
  };

  return (
    <div className="w-80 bg-black/90 border border-soul-fire/30 rounded-xl backdrop-blur-md pointer-events-auto flex flex-col p-4 shadow-2xl">
      <div className="flex items-center gap-2 text-[10px] font-bold text-soul-fire tracking-widest mb-3">
        <Zap size={12}/> HANDSHAKE_BRIDGE_v2.0
      </div>
      
      <div className="flex-1 overflow-y-auto space-y-1 mb-3 no-scrollbar h-20">
        {history.length === 0 && <div className="text-[8px] text-white/10 italic">WAITING FOR HANDSHAKE...</div>}
        {history.map((h, i) => (
          <div key={i} className="text-[8px] font-mono text-white/40 border-l border-soul-fire/20 pl-2">
            {'>'} {h.toUpperCase()}
          </div>
        ))}
      </div>

      <form onSubmit={handleTransmit} className="flex gap-2">
        <input 
          type="text"
          value={signal}
          onChange={(e) => setSignal(e.target.value)}
          placeholder="ENTER HANDSHAKE SIGNAL..."
          className="flex-1 bg-white/5 border border-white/10 rounded px-2 py-1.5 text-[9px] font-mono focus:outline-none focus:border-soul-fire/50 placeholder:text-white/10"
        />
        <button type="submit" className="px-3 py-1 bg-soul-fire/20 border border-soul-fire/50 rounded text-soul-fire hover:bg-soul-fire/30 transition-all text-[9px] font-bold">
          LINK
        </button>
      </form>
      <div className="mt-2 text-[7px] text-white/20 flex justify-between uppercase">
        <span>Status: Stable</span>
        <span>Freq: 44.1kHz</span>
      </div>
    </div>
  );
};

const UI = () => {
  const { 
    logs, agents, matrixEnergy, serverStats, runCognition, selectedAgentId,
    showMarket, showAdmin, showMap, showCharacterSheet,
    toggleMarket, toggleAdmin, toggleMap, toggleCharacterSheet,
    market, user
  } = useStore();
  const activeAgent = agents.find(a => a.id === selectedAgentId) || agents[0];

  return (
    <div className="fixed inset-0 pointer-events-none flex flex-col font-sans text-white uppercase tracking-wider">
      {/* Modals */}
      <AnimatePresence>
        {showMarket && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-auto"
          >
            <div className="bg-black border border-axiom-gold/30 p-8 rounded-2xl w-[500px] max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-serif text-axiom-gold flex items-center gap-2"><ShoppingCart /> AXIOM MARKET</h2>
                <button onClick={() => toggleMarket(false)} className="text-white/50 hover:text-white">CLOSE</button>
              </div>
              <div className="space-y-4">
                {(Object.entries(market.prices) as [ResourceType, number][]).map(([res, price]) => (
                  <div key={res} className="flex justify-between items-center p-3 border border-white/5 rounded-lg">
                    <span>{res}</span>
                    <div className="flex items-center gap-4">
                      <span className="text-axiom-gold">{price}G</span>
                      <span className="text-xs text-white/30">STOCK: {market.inventory[res]}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {showMap && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-auto"
          >
            <div className="bg-black border border-axiom-cyan/30 p-8 rounded-2xl w-[600px] h-[600px] flex flex-col">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-serif text-axiom-cyan flex items-center gap-2"><MapIcon /> AXIOM MAP</h2>
                <button onClick={() => toggleMap(false)} className="text-white/50 hover:text-white">CLOSE</button>
              </div>
              <div className="flex-1 bg-white/5 rounded-xl relative overflow-hidden border border-white/10">
                {useStore.getState().pois.map(poi => (
                  <div 
                    key={poi.id}
                    className={`absolute w-2 h-2 rounded-full ${poi.isDiscovered ? 'bg-axiom-gold' : 'bg-white/20'}`}
                    style={{ 
                      left: `${50 + (poi.position[0] / 2)}%`, 
                      top: `${50 + (poi.position[2] / 2)}%` 
                    }}
                    title={poi.type}
                  />
                ))}
                {agents.map(agent => (
                  <div 
                    key={agent.id}
                    className="absolute w-3 h-3 bg-axiom-cyan rounded-full border border-white"
                    style={{ 
                      left: `${50 + (agent.position[0] / 2)}%`, 
                      top: `${50 + (agent.position[2] / 2)}%` 
                    }}
                    title={agent.name}
                  />
                ))}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-4 h-4 border border-axiom-cyan/50 rounded-full animate-ping" />
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {showAdmin && (
          <motion.div 
            initial={{ opacity: 0, y: -100 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -100 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-auto"
          >
            <div className="bg-black border border-red-500/30 p-8 rounded-2xl w-[400px]">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-serif text-red-500 flex items-center gap-2"><Shield /> ADMIN CONSOLE</h2>
                <button onClick={() => toggleAdmin(false)} className="text-white/50 hover:text-white">CLOSE</button>
              </div>
              <div className="space-y-4">
                <button 
                  onClick={() => runCognition()}
                  className="w-full py-3 bg-red-500/20 border border-red-500/50 rounded-xl text-red-500 hover:bg-red-500/30 transition-all"
                >
                  FORCE COGNITION CYCLE
                </button>
                <button 
                  onClick={() => useStore.getState().refillEnergy(100)}
                  className="w-full py-3 bg-axiom-gold/20 border border-axiom-gold/50 rounded-xl text-axiom-gold hover:bg-axiom-gold/30 transition-all"
                >
                  REFILL MATRIX ENERGY
                </button>
                <div className="space-y-2">
                  <div className="text-[10px] text-white/30">GEMINI API KEY</div>
                  <input 
                    type="password"
                    defaultValue={useStore.getState().userApiKey || ''}
                    onBlur={(e) => useStore.getState().setUserApiKey(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-xs focus:outline-none focus:border-axiom-purple"
                    placeholder="Enter API Key..."
                  />
                </div>
                <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                  <div className="text-xs text-white/30 mb-1">SERVER UPTIME</div>
                  <div className="font-mono">{Math.floor(serverStats.uptime)}s</div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {showCharacterSheet && activeAgent && (
          <motion.div 
            initial={{ opacity: 0, x: 100 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 100 }}
            className="fixed right-0 top-0 bottom-0 z-50 w-96 bg-black/90 border-l border-white/10 p-8 backdrop-blur-xl pointer-events-auto"
          >
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-serif text-axiom-cyan flex items-center gap-2"><User /> CHARACTER</h2>
              <button onClick={() => toggleCharacterSheet(false)} className="text-white/50 hover:text-white">CLOSE</button>
            </div>
            <div className="space-y-6">
              <div className="text-center">
                <div className="text-4xl font-bold mb-1">{activeAgent.name}</div>
                <div className="text-axiom-cyan text-sm">LEVEL {activeAgent.level} {activeAgent.classType}</div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {Object.entries(activeAgent.stats).map(([stat, val]) => (
                  <div key={stat} className="p-3 bg-white/5 rounded-lg border border-white/5">
                    <div className="text-[10px] text-white/30">{stat}</div>
                    <div className="text-lg font-mono">{val}</div>
                  </div>
                ))}
              </div>
              <div className="p-4 border border-axiom-gold/20 rounded-xl">
                <div className="text-xs text-axiom-gold mb-2">GOLD BALANCE</div>
                <div className="text-3xl font-bold">{activeAgent.gold}G</div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-bold text-white/50 tracking-widest">ACTIVE TASKS</h3>
                  <button 
                    onClick={() => useStore.getState().clearCompletedTasks(activeAgent.id)}
                    className="text-[8px] text-white/20 hover:text-white/50 transition-colors"
                  >
                    CLEAR COMPLETED
                  </button>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-2 no-scrollbar">
                  {activeAgent.tasks.length === 0 && (
                    <div className="text-[10px] text-white/10 italic text-center py-4">NO TASKS ASSIGNED</div>
                  )}
                  {activeAgent.tasks.map(task => (
                    <div 
                      key={task.id} 
                      className={`p-2 rounded border transition-all flex items-center gap-3 ${task.isCompleted ? 'bg-white/5 border-white/5 opacity-40' : 'bg-white/10 border-white/10'}`}
                    >
                      <div className={`w-1.5 h-1.5 rounded-full ${task.priority > 7 ? 'bg-red-500' : task.priority > 4 ? 'bg-axiom-gold' : 'bg-axiom-cyan'}`} />
                      <div className="flex-1">
                        <div className={`text-[10px] ${task.isCompleted ? 'line-through' : ''}`}>{task.description}</div>
                        <div className="text-[8px] text-white/20 uppercase">PRIORITY: {task.priority}</div>
                      </div>
                      {!task.isCompleted && (
                        <button 
                          onClick={() => useStore.getState().completeTask(activeAgent.id, task.id)}
                          className="p-1 text-white/20 hover:text-axiom-cyan transition-colors"
                        >
                          <Zap size={12} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="p-6 flex justify-between items-start">
        <div className="bg-black/80 border border-axiom-purple/30 p-4 rounded-xl backdrop-blur-md pointer-events-auto">
          <h1 className="text-2xl font-serif text-axiom-purple">Ouroboros Axiom</h1>
          <div className="flex gap-4 mt-2 text-xs text-axiom-cyan">
            <div className="flex items-center gap-1"><Activity size={12}/> {serverStats.tickRate}HZ</div>
            <div className="flex items-center gap-1"><Database size={12}/> {serverStats.memoryUsage}MB</div>
            <div className="flex items-center gap-1"><Shield size={12}/> THREAT: {(serverStats.threatLevel * 100).toFixed(0)}%</div>
          </div>
        </div>

        {activeAgent && (
          <div className="bg-black/80 border border-white/10 p-4 rounded-xl backdrop-blur-md pointer-events-auto flex flex-col gap-1 min-w-[200px]">
            <div className="text-xs text-white/50 flex justify-between">
              <span>{activeAgent.name}</span>
              <span className="text-axiom-cyan">LVL {activeAgent.level}</span>
            </div>
            <div className="text-[10px] text-axiom-gold">STATE: {activeAgent.state}</div>
            {activeAgent.internalDebate && activeAgent.internalDebate.length > 0 && (
              <div className="mt-2 p-2 bg-white/5 rounded border border-white/5 text-[9px] italic text-white/70">
                "{activeAgent.internalDebate[activeAgent.internalDebate.length - 2]}"
              </div>
            )}
          </div>
        )}

        <div className="bg-black/80 border border-axiom-gold/30 p-4 rounded-xl backdrop-blur-md pointer-events-auto flex items-center gap-4">
          <div className="text-right">
            <div className="text-xs text-axiom-gold">Matrix Energy</div>
            <div className="text-xl font-bold">{matrixEnergy}%</div>
          </div>
          <div className="w-32 h-2 bg-white/10 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-axiom-gold" 
              initial={{ width: 0 }} 
              animate={{ width: `${matrixEnergy}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex justify-between items-end p-6">
        <div className="flex flex-col gap-4">
          <HandshakeTerminal />
          <Chat />
          {/* Logs */}
          <div className="w-80 bg-black/80 border border-white/10 p-4 rounded-xl backdrop-blur-md pointer-events-auto max-h-64 overflow-hidden flex flex-col">
            <div className="flex items-center gap-2 mb-2 text-xs text-white/50 border-bottom border-white/10 pb-2">
              <Terminal size={14}/> SYSTEM LOGS
            </div>
            <div className="flex-1 overflow-y-auto text-[10px] space-y-1">
              {logs.map((log) => (
                <div key={log.id} className="flex gap-2">
                  <span className="text-white/30">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                  <span className={log.type === 'THOUGHT' ? 'text-axiom-cyan' : 'text-white'}>{log.message}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col gap-4 pointer-events-auto">
          <button 
            onClick={() => runCognition()}
            className="bg-axiom-purple hover:bg-axiom-purple/80 text-white px-6 py-3 rounded-xl transition-all active:scale-95 flex items-center gap-2"
          >
            <Zap size={18}/> Trigger Neural Link
          </button>
          
          <div className="flex gap-2">
            <button 
              onClick={() => toggleMap(!showMap)}
              className={`p-3 bg-black/80 border rounded-xl transition-all ${showMap ? 'border-axiom-cyan text-axiom-cyan' : 'border-white/10 hover:bg-white/10'}`}
            >
              <MapIcon size={20}/>
            </button>
            <button 
              onClick={() => toggleMarket(!showMarket)}
              className={`p-3 bg-black/80 border rounded-xl transition-all ${showMarket ? 'border-axiom-gold text-axiom-gold' : 'border-white/10 hover:bg-white/10'}`}
            >
              <ShoppingCart size={20}/>
            </button>
            <button 
              onClick={() => toggleAdmin(!showAdmin)}
              className={`p-3 bg-black/80 border rounded-xl transition-all ${showAdmin ? 'border-red-500 text-red-500' : 'border-white/10 hover:bg-white/10'}`}
            >
              <Shield size={20}/>
            </button>
            <button 
              onClick={() => toggleCharacterSheet(!showCharacterSheet)}
              className={`p-3 bg-black/80 border rounded-xl transition-all ${showCharacterSheet ? 'border-axiom-cyan text-axiom-cyan' : 'border-white/10 hover:bg-white/10'}`}
            >
              <User size={20}/>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const initGame = useStore(s => s.initGame);
  const updatePhysics = useStore(s => s.updatePhysics);

  useEffect(() => {
    initGame();
  }, [initGame]);

  return (
    <div className="w-full h-screen bg-axiom-dark overflow-hidden">
      <Canvas camera={{ position: [10, 10, 10], fov: 50 }}>
        <Suspense fallback={null}>
          <World />
        </Suspense>
      </Canvas>
      <UI />
    </div>
  );
}
