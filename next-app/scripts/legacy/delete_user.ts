import { query } from './lib/db';

async function run() {
  try {
    console.log("Starting deletion for 8241043@horus.edu.eg...");
    const authRes = await query(`DELETE FROM auth.users WHERE email='8241043@horus.edu.eg';`);
    console.log("Deleted from auth.users:", authRes.rowCount);

    const publicRes = await query(`DELETE FROM public.users WHERE email='8241043@horus.edu.eg';`);
    console.log("Deleted from public.users:", publicRes.rowCount);

    const appRes = await query(`DELETE FROM public.applications WHERE email='8241043@horus.edu.eg';`);
    console.log("Deleted from public.applications:", appRes.rowCount);

    console.log("Deletion completed.");
  } catch (error) {
    console.error("Error during deletion:", error);
  } finally {
    process.exit(0);
  }
}

run();
