// convex/crons.ts
import { cronJobs } from "convex/server";
import {api} from "./_generated/api";

const crons = cronJobs();

// aqui roda toda hora; se quiser acelerar, use { minutes: 5 } ou até { minutes: 1 }
crons.interval(
    "Clean old messages",
    { hours: 1 },
   api.messages.clearOldMessages
);

export default crons;
