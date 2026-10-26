// Public build: the real collector lives in a private repo (see scripts/overlay-private.mjs).
export async function POST() {
    return new Response(null, { status: 204 });
}
