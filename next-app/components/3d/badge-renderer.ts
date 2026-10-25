import * as THREE from 'three';
import { GLTFLoader, DRACOLoader } from 'three-stdlib';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

/**
 * One WebGL renderer draws every badge on the page. Browsers allow only ~16
 * WebGL contexts, so a page of 45 badges with one canvas each had to swap the
 * extras for pictures. Here each badge owns a plain 2D canvas and the shared
 * renderer copies its frame into it, so every badge stays a live 3D model.
 */

const MAX_DPR = 1.5;
const MAX_FPS_TILES = 14;

interface Shared {
    renderer: THREE.WebGLRenderer;
    env: THREE.Texture | null;
    size: number;
}

let shared: Shared | null = null;
let rafId = 0;
const tiles = new Set<TileImpl>();
const models = new Map<string, Promise<THREE.Group>>();
let gltfLoader: GLTFLoader | null = null;

function getShared(): Shared | null {
    if (shared) return shared;
    try {
        const canvas = document.createElement('canvas');
        const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true });
        renderer.setClearColor(0x000000, 0);
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.setPixelRatio(1);
        renderer.setSize(256, 256, false);
        const s: Shared = { renderer, env: null, size: 256 };
        canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); shared = null; });
        // A plain studio room: metal backs reflect soft light, not the street photo.
        const pmrem = new THREE.PMREMGenerator(renderer);
        s.env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
        pmrem.dispose();
        shared = s;
        return s;
    } catch {
        return null;
    }
}

function loadModelScene(url: string): Promise<THREE.Group> {
    let pending = models.get(url);
    if (!pending) {
        if (!gltfLoader) {
            const draco = new DRACOLoader();
            draco.setDecoderPath('/draco/');
            gltfLoader = new GLTFLoader();
            gltfLoader.setDRACOLoader(draco);
        }
        const loader = gltfLoader;
        pending = new Promise<THREE.Group>((resolve, reject) => {
            loader.load(url, gltf => resolve(gltf.scene), undefined, reject);
        });
        pending.catch(() => models.delete(url));
        models.set(url, pending);
    }
    return pending;
}

export interface Tile {
    setVisible(v: boolean): void;
    dispose(): void;
}

interface Options {
    canvas: HTMLCanvasElement;
    url: string;
    scale: number;
    spin: boolean;
    onReady: () => void;
    onError: () => void;
}

class TileImpl implements Tile {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(45, 1, 2.5, 9);
    holder = new THREE.Group();
    sway = new THREE.Group();
    visible = false;
    ready = false;
    disposed = false;
    dragY = 0;
    dragX = 0;
    spinY = 0;
    phase = Math.random() * 6;
    lastDraw = 0;
    ctx: CanvasRenderingContext2D | null;
    private dragging = false;
    private last = { x: 0, y: 0 };
    private cleanup: Array<() => void> = [];

    constructor(readonly o: Options) {
        this.ctx = o.canvas.getContext('2d');
        this.camera.position.set(0, 0, 5);
        this.scene.add(new THREE.AmbientLight(0xffffff, 1.5));
        const spot = new THREE.SpotLight(0xffffff, 2, 0, 0.25, 1);
        spot.position.set(10, 10, 10);
        this.scene.add(spot);
        const point = new THREE.PointLight(0xffffff, 1);
        point.position.set(-10, -10, -10);
        this.scene.add(point);
        this.scene.add(this.sway);
        this.sway.add(this.holder);
        if (shared?.env) this.scene.environment = shared.env;

        loadModelScene(o.url).then(src => {
            if (this.disposed) return;
            const model = src.clone();
            const box = new THREE.Box3().setFromObject(model);
            const center = box.getCenter(new THREE.Vector3());
            model.position.sub(center);
            const wrap = new THREE.Group();
            wrap.add(model);
            wrap.scale.setScalar(o.scale * 1.45);
            this.holder.add(wrap);
            this.ready = true;
            o.onReady();
        }).catch(() => { if (!this.disposed) o.onError(); });

        const c = o.canvas;
        const down = (e: PointerEvent) => { this.dragging = true; this.last = { x: e.clientX, y: e.clientY }; c.setPointerCapture(e.pointerId); };
        const move = (e: PointerEvent) => {
            if (!this.dragging) return;
            this.dragY += (e.clientX - this.last.x) * 0.012;
            this.dragX = Math.max(-0.5, Math.min(0.5, this.dragX + (e.clientY - this.last.y) * 0.008));
            this.last = { x: e.clientX, y: e.clientY };
        };
        const up = () => { this.dragging = false; };
        c.addEventListener('pointerdown', down);
        c.addEventListener('pointermove', move);
        c.addEventListener('pointerup', up);
        c.addEventListener('pointercancel', up);
        this.cleanup.push(() => {
            c.removeEventListener('pointerdown', down);
            c.removeEventListener('pointermove', move);
            c.removeEventListener('pointerup', up);
            c.removeEventListener('pointercancel', up);
        });
    }

    setVisible(v: boolean) {
        this.visible = v;
        if (v) start();
    }

    update(t: number, dt: number) {
        if (this.o.spin) this.spinY += dt * 0.7;
        const sway = this.o.spin ? 0 : Math.sin(t * 0.5 + this.phase) * 0.2;
        this.holder.rotation.y = this.spinY + sway + this.dragY;
        this.holder.rotation.x = this.dragX;
        // Gentle float, like the old scene.
        this.sway.position.y = Math.sin(t * 2 + this.phase) * 0.05;
    }

    dispose() {
        this.disposed = true;
        tiles.delete(this);
        this.cleanup.forEach(fn => fn());
    }
}

let lastT = 0;
function frame(now: number) {
    rafId = 0;
    const s = getShared();
    const active = [...tiles].filter(t => t.visible && t.ready && !t.disposed);
    if (!s || active.length === 0) return;
    const dt = Math.min(0.1, (now - lastT) / 1000 || 0.016);
    lastT = now;
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);

    // Least recently drawn first, so a busy page shares the frame budget instead of starving some badges.
    active.sort((a, b) => a.lastDraw - b.lastDraw);
    let drawn = 0;
    for (const t of active) {
        if (drawn >= MAX_FPS_TILES) break;
        t.lastDraw = now;
        const c = t.o.canvas;
        const w = Math.max(2, Math.round(c.clientWidth * dpr));
        const h = Math.max(2, Math.round(c.clientHeight * dpr));
        const need = Math.max(w, h);
        if (need > s.size) { s.size = need; s.renderer.setSize(need, need, false); }
        if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
        t.update(now / 1000, dt);
        t.camera.aspect = w / h;
        t.camera.updateProjectionMatrix();
        s.renderer.setViewport(0, 0, w, h);
        s.renderer.setScissor(0, 0, w, h);
        s.renderer.setScissorTest(true);
        s.renderer.clear();
        s.renderer.render(t.scene, t.camera);
        // Viewport origin is the bottom-left of the shared canvas.
        t.ctx?.clearRect(0, 0, w, h);
        t.ctx?.drawImage(s.renderer.domElement, 0, s.size - h, w, h, 0, 0, w, h);
        drawn++;
    }
    rafId = requestAnimationFrame(frame);
}

function start() {
    if (!rafId) rafId = requestAnimationFrame(frame);
}

export function acquireTile(o: Options): Tile {
    getShared();
    const impl = new TileImpl(o);
    tiles.add(impl);
    return impl;
}
