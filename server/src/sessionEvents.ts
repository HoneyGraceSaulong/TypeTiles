import { EventEmitter } from "events";

// Same-process immediate socket eviction; persistent DB checks remain authoritative.
export const sessionEvents = new EventEmitter();
