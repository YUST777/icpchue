'use client'

import { useEffect, memo } from 'react'
import ReactFlow, {
    Background,
    Controls,
    useNodesState,
    useEdgesState,
    Handle,
    Position,
    ReactFlowProvider,
    useReactFlow
} from 'reactflow'
import dagre from 'dagre'
import { motion, AnimatePresence } from 'framer-motion'
import {
    SiNextdotjs,
    SiNginx,
    SiPostgresql,
    SiRedis,
    SiDocker,
    SiCloudflare,
    SiExpress,
    SiFramer,
    SiThreedotjs,
    SiJsonwebtokens,
    SiTailwindcss
} from 'react-icons/si'
// Using Lucide icons for generics
import { LuGlobe, LuMail, LuGavel, LuMaximize2, LuX } from 'react-icons/lu'
import { useMapExpanded } from '@/context/MapExpandedContext'
import 'reactflow/dist/style.css'

// --- Custom Node Component ---
const IconNode = memo(({ data }: { data: { label: string; title?: string; subline?: string; icon?: React.ReactNode } }) => {
    return (
        <div className="flex flex-col items-center justify-center w-full h-full px-2 text-center">
            <Handle type="target" position={Position.Top} className="!bg-white/20 !w-1 !h-1" />

            <div className="mb-1.5 text-xl text-white/90">
                {data.icon}
            </div>

            <div className="text-[9px] font-bold text-white/90 uppercase tracking-wider mb-0.5">
                {data.title || data.label}
            </div>

            {data.subline && (
                <div className="text-[7px] text-gray-400 font-mono leading-tight">
                    {data.subline}
                </div>
            )}

            <Handle type="source" position={Position.Bottom} className="!bg-white/20 !w-1 !h-1" />
        </div>
    )
})

IconNode.displayName = 'IconNode'

const nodeTypes = {
    iconNode: IconNode,
}

// --- Graph Data ---
const initialNodes = [
    { id: 'Browser', type: 'iconNode', data: { title: 'Browser', subline: 'Client', icon: <LuGlobe /> } },
    { id: 'Cloudflare', type: 'iconNode', data: { title: 'Cloudflare', subline: 'CDN • WAF', icon: <SiCloudflare className="text-orange-500" /> } },
    { id: 'NGINX', type: 'iconNode', data: { title: 'NGINX', subline: 'Proxy', icon: <SiNginx className="text-green-500" /> } },
    { id: 'Frontend', type: 'iconNode', data: { title: 'Next.js 16', subline: 'React 19', icon: <SiNextdotjs /> } },
    { id: 'Backend', type: 'iconNode', data: { title: 'Express', subline: 'Node API', icon: <SiExpress /> } },
    { id: 'External', type: 'iconNode', data: { title: 'External APIs', subline: 'Scrapers', icon: <LuGlobe className="text-purple-500" /> } },
    { id: 'Framer', type: 'iconNode', data: { title: 'Framer', subline: 'Motion', icon: <SiFramer /> } },
    { id: 'Three', type: 'iconNode', data: { title: 'Three.js', subline: 'R3F', icon: <SiThreedotjs /> } },
    { id: 'Tailwind', type: 'iconNode', data: { title: 'Tailwind', subline: 'CSS 4', icon: <SiTailwindcss className="text-cyan-400" /> } },
    { id: 'Security', type: 'iconNode', data: { title: 'Security', subline: 'JWT • AES', icon: <SiJsonwebtokens className="text-pink-500" /> } },
    { id: 'MainDB', type: 'iconNode', data: { title: 'PostgreSQL', subline: 'Primary DB', icon: <SiPostgresql className="text-blue-400" /> } },
    { id: 'Redis', type: 'iconNode', data: { title: 'Redis', subline: 'Cache', icon: <SiRedis className="text-red-500" /> } },
    { id: 'Email', type: 'iconNode', data: { title: 'Email Service', subline: 'SMTP', icon: <LuMail /> } },
    { id: 'Judge0', type: 'iconNode', data: { title: 'Judge0', subline: 'Engine', icon: <LuGavel /> } },
    { id: 'Worker', type: 'iconNode', data: { title: 'Worker', subline: 'Isolated', icon: <SiDocker className="text-blue-500" /> } },
    { id: 'JudgeDB', type: 'iconNode', data: { title: 'Judge DB', subline: 'PostgreSQL', icon: <SiPostgresql className="text-blue-400" /> } },
]

const initialEdges = [
    { id: 'e1', source: 'Browser', target: 'Cloudflare', animated: true },
    { id: 'e2', source: 'Cloudflare', target: 'NGINX', animated: true },
    { id: 'e3', source: 'NGINX', target: 'Frontend', animated: true },
    { id: 'e4', source: 'NGINX', target: 'Backend', animated: true },
    { id: 'e-f1', source: 'Frontend', target: 'Framer', type: 'smoothstep' },
    { id: 'e-f2', source: 'Frontend', target: 'Three', type: 'smoothstep' },
    { id: 'e-f3', source: 'Frontend', target: 'Tailwind', type: 'smoothstep' },
    { id: 'e-f4', source: 'Frontend', target: 'MainDB', animated: true, style: { stroke: '#3b82f6' } }, // Next.js server actions/API
    { id: 'e-f5', source: 'Frontend', target: 'Security', type: 'smoothstep' },
    { id: 'e-b1', source: 'Backend', target: 'Security', type: 'smoothstep' },
    { id: 'e-b2', source: 'Backend', target: 'MainDB', animated: true },
    { id: 'e-b3', source: 'Backend', target: 'Redis', animated: true },
    { id: 'e-b4', source: 'Backend', target: 'Email', type: 'smoothstep' },
    { id: 'e-b5', source: 'Backend', target: 'Judge0', animated: true, style: { stroke: '#ef4444' } },
    { id: 'e-b6', source: 'Backend', target: 'External', animated: true, style: { strokeDasharray: '5,5' } },
    { id: 'e-j1', source: 'Judge0', target: 'Worker', animated: true },
    { id: 'e-j2', source: 'Judge0', target: 'Redis' },
    { id: 'e-j3', source: 'Judge0', target: 'JudgeDB' },
    { id: 'e-j4', source: 'Worker', target: 'JudgeDB' },
]

// --- Layout Helpers ---
// Create graph once at module level
const dagreGraph = new dagre.graphlib.Graph()
dagreGraph.setDefaultEdgeLabel(() => ({}))

const nodeWidth = 120
const nodeHeight = 80

// Pre-compute layout ONCE at module level (not in render)
const computeLayout = () => {
    dagreGraph.setGraph({ rankdir: 'TB' })

    initialNodes.forEach((node) => {
        dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight })
    })

    initialEdges.forEach((edge) => {
        dagreGraph.setEdge(edge.source, edge.target)
    })

    dagre.layout(dagreGraph)

    // Return NEW arrays with positions (don't mutate original)
    const layoutedNodes = initialNodes.map((node) => {
        const nodeWithPosition = dagreGraph.node(node.id)
        const isHighlighted = ['Frontend', 'Backend'].includes(node.id)
        return {
            ...node,
            position: {
                x: nodeWithPosition.x - nodeWidth / 2,
                y: nodeWithPosition.y - nodeHeight / 2,
            },
            style: {
                width: nodeWidth,
                height: nodeHeight,
                background: isHighlighted ? '#111' : '#0a0a0a',
                border: isHighlighted ? '1px solid rgba(255,255,255,0.2)' : '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.5)',
            },
        }
    })

    return { nodes: layoutedNodes, edges: initialEdges }
}

// Compute layout once at module load
const { nodes: precomputedNodes, edges: precomputedEdges } = computeLayout()

// --- Component Definition ---

const ArchitectureMapContent = memo(({ interactive }: { interactive: boolean }) => {
    const [nodes, , onNodesChange] = useNodesState(precomputedNodes)
    const [edges, , onEdgesChange] = useEdgesState(precomputedEdges)
    const { fitView } = useReactFlow()

    // Fit view on init
    const onInit = () => {
        setTimeout(() => fitView({ padding: 0.2 }), 50)
    }

    return (
        <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            onInit={onInit}
            minZoom={0.1}
            maxZoom={2}
            nodesDraggable={interactive}
            nodesConnectable={false}
            zoomOnScroll={interactive}
            panOnDrag={interactive}
            zoomOnPinch={interactive}
            panOnScroll={interactive}
            preventScrolling={!interactive}
            proOptions={{ hideAttribution: true }}
            className="bg-[#050505]"
        >
            <Background color="#222" gap={24} size={1} />
            {interactive && <Controls style={{ background: '#111', border: '1px solid #333', color: '#fff' }} />}
        </ReactFlow>
    )
})

ArchitectureMapContent.displayName = 'ArchitectureMapContent'

const ArchitectureMap = ({ interactive = false }: { interactive?: boolean }) => {
    return (
        <ReactFlowProvider>
            <ArchitectureMapContent interactive={interactive} />
        </ReactFlowProvider>
    )
}

export default function BuildingPublicly() {
    const { expandedId, setExpandedId } = useMapExpanded()
    const isExpanded = expandedId === 'main-architecture'

    // Close on ESC
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setExpandedId(null)
        }
        window.addEventListener('keydown', handleEsc)
        return () => window.removeEventListener('keydown', handleEsc)
    }, [setExpandedId])

    return (
        <section className="w-full bg-black py-20 md:py-32 px-4 md:px-6 border-t border-white/5 relative z-10 overflow-hidden">
            <div className="max-w-7xl mx-auto">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">

                    {/* LEFT: Text Content */}
                    <motion.div
                        initial={{ opacity: 0, x: -50 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8 }}
                        className="text-left"
                    >
                        <h2 className="text-3xl md:text-6xl font-display font-bold text-white mb-6 tracking-tighter">
                            <span className="bg-gradient-to-r from-[#f29d37] to-[#f5c75d] bg-clip-text text-transparent">System Architecture</span>
                        </h2>

                        <p className="text-gray-400 text-base md:text-lg leading-relaxed mb-6 max-w-md">
                            A scalable, distributed system built to handle thousands of concurrent code submissions securely.
                            Powered by Next.js 16, Express, PostgreSQL, Redis, and Judge0.
                        </p>

                        <p className="text-gray-500 text-sm font-mono flex items-center gap-2 mt-12">
                            <span className="animate-bounce">↓</span>
                            Scroll down to read the development log
                        </p>
                    </motion.div>

                    {/* RIGHT: Mini Map Preview */}
                    <motion.div
                        className="relative w-full aspect-video rounded-3xl overflow-hidden border border-white/10 group cursor-pointer"
                        onClick={() => setExpandedId('main-architecture')}
                        initial={{ opacity: 0, scale: 0.9 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8 }}
                    >
                        <div className="absolute inset-0 z-10 bg-black/0 group-hover:bg-black/10 transition-colors pointer-events-none" />
                        <div className="absolute top-4 right-4 z-20 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 flex items-center gap-2 text-xs text-white/70 opacity-0 group-hover:opacity-100 transition-opacity">
                            <LuMaximize2 className="w-3 h-3" />
                            <span>Click to Explore</span>
                        </div>

                        {/* Static Preview Map */}
                        <ArchitectureMap interactive={false} />
                    </motion.div>
                </div>
            </div>

            {/* EXPANDED FULLSCREEN MODAL */}
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
                                <h3 className="text-2xl font-display font-bold text-white uppercase tracking-tight">ICPC HUE ARCHITECTURE</h3>
                                <p className="text-gray-400 text-xs font-mono">Interactive Mode • Scroll to Zoom</p>
                            </div>
                            <button
                                onClick={(e) => { e.stopPropagation(); setExpandedId(null); }}
                                className="pointer-events-auto bg-white/10 hover:bg-white/20 text-white p-3 rounded-full backdrop-blur-md transition-colors"
                            >
                                <LuX className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Full Interactive Map */}
                        <div className="w-full h-full">
                            <ArchitectureMap key="expanded" interactive={true} />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </section>
    )
}
