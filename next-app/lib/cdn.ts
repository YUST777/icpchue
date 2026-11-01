// Videos and 3D models live in the public repo YUST777/icpchue-assets, served by jsDelivr.
// Pinned to a commit so files are cached for good; bump the hash after changing that repo.
const BASE = 'https://cdn.jsdelivr.net/gh/YUST777/icpchue-assets@988f908';

/** Maps a former `/3d/..` or `/videos/..` path to its CDN address. */
export const cdn = (path: string) => (/^\/(3d|videos)\//.test(path) ? BASE + path : path);
