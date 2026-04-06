import { os } from "@orpc/server";
const authed = os.use((req) => req.next());
console.log(Object.keys(authed));
