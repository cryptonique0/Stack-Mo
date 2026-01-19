import { Cl } from "@stacks/transactions";
import { describe, expect, it } from "vitest";

const accounts = simnet.getAccounts();
const address1 = accounts.get("wallet_1")!;

describe("hello-world contract test", () => {
  it("should say hello world", () => {
    const { result } = simnet.callPublicFn("hello-world", "say-hi", [], address1);
    expect(result).toBeOk(Cl.stringAscii("hello world"));
  });

  it("should echo the input number", () => {
    const { result } = simnet.callPublicFn("hello-world", "echo-number", [Cl.int("42")], address1);
    expect(result).toBeOk(Cl.int(42));
  });
});
