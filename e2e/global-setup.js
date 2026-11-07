import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendDir = path.resolve(__dirname, "../../meetcutes-elixir");

/**
 * Recreates/reset the deterministic E2E users before the suite runs.
 *
 * The script is idempotent, so rerunning the suite always starts from a known
 * state (active accounts, no relationships, no avatar, both visibility).
 */
export default async function globalSetup() {
  execSync("mix run priv/e2e/seed.exs", {
    cwd: backendDir,
    stdio: "inherit",
    shell: true,
  });
}
