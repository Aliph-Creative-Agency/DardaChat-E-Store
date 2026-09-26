/**
 * Mock WhatsApp / SMS / email adapters: validate the address and "deliver" instantly. Messages stay visible in the
 * outbox (`messages` table, /dev/outbox). Faults (down/slow/flaky) are applied by `callExternal`, not here.
 */
import { nanoid } from "nanoid";
import { PermanentError } from "../adapters/errors";
import type { Channel, ChannelAdapter } from "./types";

export const E164 = /^\+[1-9]\d{7,14}$/;
export const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function mockAdapter(channel: Channel): ChannelAdapter {
  return {
    channel,
    async send(input, signal) {
      if (signal.aborted) throw new Error("aborted");
      const valid = channel === "email" ? EMAIL.test(input.to) : E164.test(input.to);
      if (!valid) throw new PermanentError(`invalid ${channel === "email" ? "email address" : "E.164 phone"}: ${input.to}`);
      if (!input.text.trim()) throw new PermanentError("empty message text");
      return { providerRef: `mock-${channel}-${nanoid(12)}` };
    },
  };
}

const adapters: Record<Channel, ChannelAdapter> = {
  whatsapp: mockAdapter("whatsapp"),
  sms: mockAdapter("sms"),
  email: mockAdapter("email"),
};

/** The adapter for a channel. Phase 1+ swaps in real providers here (env-selected), keeping the interface. */
export function getChannelAdapter(channel: Channel): ChannelAdapter {
  return adapters[channel];
}
