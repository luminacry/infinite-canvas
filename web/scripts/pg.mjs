// 本地开发用：启动 embedded-postgres（userland，无需 sudo/docker），建库后常驻。
import EmbeddedPostgres from "embedded-postgres";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const dir = resolve(process.cwd(), ".pgdata");
const pg = new EmbeddedPostgres({ databaseDir: dir, user: "postgres", password: "postgres", port: 5433, persistent: true });

const initialised = existsSync(resolve(dir, "PG_VERSION"));
if (!initialised) {
    console.log("initialising postgres data dir...");
    await pg.initialise();
}
await pg.start();
console.log("postgres started on 127.0.0.1:5433");
try {
    await pg.createDatabase("infinite_canvas");
    console.log("database infinite_canvas created");
} catch {
    console.log("database infinite_canvas already exists");
}

process.on("SIGINT", async () => { await pg.stop(); process.exit(0); });
process.on("SIGTERM", async () => { await pg.stop(); process.exit(0); });
console.log("postgres ready; keep this process running");
setInterval(() => {}, 1 << 30);
