import { ok, handle } from "@/server/http";
import { requireUser } from "@/server/auth";
import { getBalance } from "@/server/services/credit-service";

export async function GET() {
    return handle(async () => {
        const user = await requireUser();
        return ok({ balance: await getBalance(user.id) });
    });
}
