'use client'

import React, { useEffect } from 'react'
import ReactFlow, {
    Background,
    Controls,
    Handle,
    Position,
    ReactFlowProvider,
    useNodesState,
    useEdgesState,
    useReactFlow,
    Edge,
    Node,
} from 'reactflow'
import 'reactflow/dist/style.css'
import dagre from 'dagre'
import {
    SiCloudflare,
    SiNginx,
    SiExpress,
    SiPostgresql,
    SiJsonwebtokens,
    SiGnubash
} from 'react-icons/si'
import {
    LuShieldCheck,
    LuLock,
    LuFingerprint,
    LuGlobe,
    LuEyeOff,
    LuX,
    LuMaximize2,
    LuBot,
    LuFileSearch,
    LuServer
} from 'react-icons/lu'
import { SiGoogle, SiDocker } from 'react-icons/si'
import { motion, AnimatePresence } from 'framer-motion'
import { useMapExpanded } from '@/context/MapExpandedContext'

// --- Custom Node Component ---
const IconNode = ({ data }: { data: { label: string; title?: string; subline?: string; highlight?: boolean; icon?: React.ReactElement } }) => {
    return (
        <div className={`
            relative flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-300
            ${data.highlight
                ? 'bg-[#E8C15A]/10 border-[#E8C15A] shadow-[0_0_15px_rgba(232,193,90,0.2)]'
                : 'bg-zinc-900/90 border-zinc-800 hover:border-zinc-600'
            }
        `}>
            {/* Connection Handles */}
            <Handle type="target" position={Position.Top} className="!bg-zinc-600 !w-1 !h-1 !border-none" />

            {/* Icon Box */}
            <div className={`
                p-2 rounded-lg
                ${data.highlight ? 'bg-[#E8C15A] text-black' : 'bg-zinc-800 text-zinc-400'}
            `}>
                {data.icon && React.cloneElement(data.icon, { size: 18 } as Record<string, unknown>)}
            </div>

            {/* Text Content */}
            <div>
                <div className={`text-xs font-bold ${data.highlight ? 'text-[#E8C15A]' : 'text-zinc-200'}`}>
                    {data.title || data.label}
                </div>
                <div className="text-[10px] text-zinc-500 font-medium tracking-wide uppercase">
                    {data.subline}
                </div>
            </div>

            <Handle type="source" position={Position.Bottom} className="!bg-zinc-600 !w-1 !h-1 !border-none" />
        </div>
    )
}

const nodeTypes = {
    iconNode: IconNode,
}

// --- Data: Nodes & Edges ---
// We'll organize this flow from Top to Bottom
// 1. External (Browser/Client)
// 2. Perimeter (Cloudflare, Nginx)
// 3. Application (Express, Middleware)
// 4. Security Services (Auth/JWT, Encryption, Hashing)
// 5. Data (PostgreSQL)

const initialNodes: Node[] = [
    // 1. Client
    { id: 'Browser', position: { x: 0, y: 0 }, type: 'iconNode', data: { title: 'Client Browser', subline: 'HSTS Preloaded • TLS 1.3', icon: <LuGlobe /> } },

    // 2. Perimeter
    { id: 'Cloudflare', position: { x: 0, y: 0 }, type: 'iconNode', data: { title: 'Cloudflare', subline: 'WAF • DDoS • DNSSEC', icon: <SiCloudflare />, highlight: true } },
    { id: 'Nginx', position: { x: 0, y: 0 }, type: 'iconNode', data: { title: 'NGINX Proxy', subline: 'Rate Limiting', icon: <SiNginx /> } },

    // 3. Application Node
    { id: 'Backend', position: { x: 0, y: 0 }, type: 'iconNode', data: { title: 'Express API', subline: 'Helmet • CORS • Rate Limits', icon: <SiExpress /> } },

    // 3.5 Middleware (Bot Shield & Recaptcha)
    { id: 'BotShield', position: { x: 0, y: 0 }, type: 'iconNode', data: { title: 'Bot Shield', subline: 'User-Agent Filtering', icon: <LuBot /> } },
    { id: 'Recaptcha', position: { x: 0, y: 0 }, type: 'iconNode', data: { title: 'Google reCAPTCHA', subline: 'Score > 0.5', icon: <SiGoogle /> } },

    // 4. Security Logic Group
    { id: 'Inputs', position: { x: 0, y: 0 }, type: 'iconNode', data: { title: 'Input Sanitization', subline: 'XSS Filter', icon: <SiGnubash /> } },
    { id: 'Auth', position: { x: 0, y: 0 }, type: 'iconNode', data: { title: 'Zero-Trust Auth', subline: 'JWT + Crypto', icon: <SiJsonwebtokens />, highlight: true } },

    // 4.5 Execution Environment (Judge0 branch)
    { id: 'Judge0', position: { x: 0, y: 0 }, type: 'iconNode', data: { title: 'Code Sandboxing', subline: 'Judge0 / Syscall Filter', icon: <LuServer /> } },
    { id: 'Docker', position: { x: 0, y: 0 }, type: 'iconNode', data: { title: 'Isolated Containers', subline: 'Alpine • No Network', icon: <SiDocker /> } },

    // 4.6 Audit Layer
    { id: 'AuditLogs', position: { x: 0, y: 0 }, type: 'iconNode', data: { title: 'Audit Trail', subline: 'PII Redacted Logs', icon: <LuFileSearch /> } },

    // 5. Crypto Layer
    { id: 'AES', position: { x: 0, y: 0 }, type: 'iconNode', data: { title: 'AES-256', subline: 'Encryption at Rest', icon: <LuLock /> } },
    { id: 'BlindIndex', position: { x: 0, y: 0 }, type: 'iconNode', data: { title: 'Blind Index', subline: 'HMAC-SHA256', icon: <LuEyeOff />, highlight: true } },
    { id: 'Bcrypt', position: { x: 0, y: 0 }, type: 'iconNode', data: { title: 'Bcrypt', subline: 'Salted Hash', icon: <LuFingerprint /> } },

    // 6. Data Layer
    { id: 'DB', position: { x: 0, y: 0 }, type: 'iconNode', data: { title: 'PostgreSQL', subline: 'RLS Policies', icon: <SiPostgresql /> } },
]

const initialEdges: Edge[] = [
    // Flow: Browser -> Cloudflare -> Nginx -> Backend
    { id: 'e1', source: 'Browser', target: 'Cloudflare', animated: true, style: { stroke: '#4ade80' } },
    { id: 'e2', source: 'Cloudflare', target: 'Nginx', animated: true, style: { stroke: '#4ade80' } },
    { id: 'e3', source: 'Nginx', target: 'Backend', animated: true, style: { stroke: '#4ade80' } },

    // Backend -> BotShield -> Recaptcha
    { id: 'e3-1', source: 'Backend', target: 'BotShield', type: 'smoothstep', animated: true },
    { id: 'e3-2', source: 'BotShield', target: 'Recaptcha', type: 'smoothstep', animated: true },

    // Recaptcha splits to Inputs/Auth
    { id: 'e4', source: 'Recaptcha', target: 'Inputs', type: 'smoothstep', animated: true },
    { id: 'e5', source: 'Recaptcha', target: 'Auth', type: 'smoothstep', animated: true },

    // Branch: Execution Engine
    { id: 'e-exec-1', source: 'Recaptcha', target: 'Judge0', type: 'smoothstep', animated: true, style: { stroke: '#E8C15A' } },
    { id: 'e-exec-2', source: 'Judge0', target: 'Docker', type: 'smoothstep', animated: true, style: { stroke: '#E8C15A' } },

    // Branch: Audit
    { id: 'e-audit', source: 'Recaptcha', target: 'AuditLogs', type: 'smoothstep', animated: true },

    // Auth flows to Crypto
    { id: 'e6', source: 'Auth', target: 'Bcrypt', type: 'smoothstep' }, // Passwords
    { id: 'e7', source: 'Auth', target: 'AES', type: 'smoothstep' }, // Sensitive PII
    { id: 'e8', source: 'Auth', target: 'BlindIndex', type: 'smoothstep' }, // Searchable Encrypted Fields

    // Crypto flows to DB
    { id: 'e9', source: 'Bcrypt', target: 'DB', animated: true, style: { strokeDasharray: '5 5' } },
    { id: 'e10', source: 'AES', target: 'DB', animated: true, style: { strokeDasharray: '5 5' } },
    { id: 'e11', source: 'BlindIndex', target: 'DB', animated: true, style: { strokeDasharray: '5 5' } },

    // DB -> Audit
    { id: 'e-db-audit', source: 'DB', target: 'AuditLogs', animated: true, style: { strokeDasharray: '5 5', opacity: 0.5 } },
]

// --- Layout Logic (Dagre) ---
const nodeWidth = 200
const nodeHeight = 80

const dagreGraph = new dagre.graphlib.Graph()
dagreGraph.setDefaultEdgeLabel(() => ({}))

const computeLayout = () => {
    dagreGraph.setGraph({ rankdir: 'TB', ranksep: 60, nodesep: 40 })

    initialNodes.forEach((node) => {
        dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight })
    })

    initialEdges.forEach((edge) => {
        dagreGraph.setEdge(edge.source, edge.target)
    })

    dagre.layout(dagreGraph)

    return {
        nodes: initialNodes.map((node) => {
            const nodeWithPosition = dagreGraph.node(node.id)
            return {
                ...node,
                targetPosition: Position.Top,
                sourcePosition: Position.Bottom,
                position: {
                    x: nodeWithPosition.x - nodeWidth / 2,
                    y: nodeWithPosition.y - nodeHeight / 2,
                },
            }
        }),
        edges: initialEdges,
    }
}

const { nodes: layoutNodes, edges: layoutEdges } = computeLayout()

// --- Main Component ---
const SecurityArchitectureContent = ({ interactive = false }: { interactive?: boolean }) => {
    const [nodes, , onNodesChange] = useNodesState(layoutNodes)
    const [edges, , onEdgesChange] = useEdgesState(layoutEdges)
    const { fitView } = useReactFlow()

    // Initial Fit
    useEffect(() => {
        setTimeout(() => {
            fitView({ padding: 0.1, duration: 800 })
        }, 100)
    }, [fitView])

    return (
        <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={interactive ? onNodesChange : undefined}
            onEdgesChange={interactive ? onEdgesChange : undefined}
            fitView
            attributionPosition="bottom-right"
            nodesDraggable={interactive}
            nodesConnectable={false}
            zoomOnScroll={interactive}
            panOnDrag={interactive}
            proOptions={{ hideAttribution: true }}
            className="bg-[#050505]"
        >
            {interactive && <Controls className="bg-zinc-900 border-zinc-800 fill-zinc-400" />}
            <Background color="#333" gap={20} size={1} />
        </ReactFlow>
    )
}

const ArchitectureMap = ({ interactive = false }: { interactive?: boolean }) => {
    return (
        <ReactFlowProvider>
            <SecurityArchitectureContent interactive={interactive} />
        </ReactFlowProvider>
    )
}

export default function SecurityArchitecture() {
    const { expandedId, setExpandedId } = useMapExpanded()
    const isExpanded = expandedId === 'security-architecture'

    // Close on ESC
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setExpandedId(null)
        }
        window.addEventListener('keydown', handleEsc)
        return () => window.removeEventListener('keydown', handleEsc)
    }, [setExpandedId])

    return (
        <>
            {/* INLINE CARD */}
            <div className="w-full h-[500px] bg-black/50 border border-white/5 rounded-3xl overflow-hidden backdrop-blur-sm relative group">
                {/* Header / Legend */}
                <div className="absolute top-4 left-4 z-10 flex gap-2">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-black/60 rounded-full border border-white/10 backdrop-blur-md">
                        <LuShieldCheck className="text-[#E8C15A]" size={14} />
                        <span className="text-[10px] font-bold text-white uppercase tracking-wider">Security Architecture</span>
                    </div>
                </div>

                {/* Click Overlay */}
                <div
                    className="absolute inset-0 z-20 bg-transparent cursor-pointer"
                    onClick={() => setExpandedId('security-architecture')}
                >
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <div className="bg-black/80 backdrop-blur-md text-white text-xs font-bold px-4 py-2 rounded-full border border-white/10 shadow-xl transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 flex items-center gap-2">
                            <LuMaximize2 size={12} />
                            Click to Explore
                        </div>
                    </div>
                </div>

                <ArchitectureMap interactive={false} />
            </div>

            {/* EXPANDED MODAL */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        className="fixed inset-0 z-[9999] bg-[#050505] flex flex-col"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.3, ease: 'easeOut' }}
                    >
                        {/* Header / Controls */}
                        <div className="absolute top-0 left-0 right-0 z-50 p-6 flex justify-between items-start pointer-events-none">
                            <div>
                                <h3 className="text-2xl font-display font-bold text-white uppercase tracking-tight">SECURITY ARCHITECTURE</h3>
                                <p className="text-gray-400 text-xs font-mono">Defense-in-Depth Visualized</p>
                            </div>
                            <button
                                onClick={(e) => { e.stopPropagation(); setExpandedId(null); }}
                                className="pointer-events-auto bg-white/10 hover:bg-white/20 text-white p-3 rounded-full backdrop-blur-md transition-colors"
                            >
                                <LuX className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="w-full h-full">
                            <ArchitectureMap interactive={true} />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    )
}
