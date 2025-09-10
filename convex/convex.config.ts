import { defineApp } from "convex/server";
import rateLimiter from "@convex-dev/rate-limiter/convex.config";
import resend from "@convex-dev/resend/convex.config";

const app = defineApp();
app.use(rateLimiter);
app.use(resend);

export default app;