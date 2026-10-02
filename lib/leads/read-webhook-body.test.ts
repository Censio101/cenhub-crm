import { describe, expect, it } from "vitest"

import { readWebhookBody } from "@/lib/leads/read-webhook-body"

function req(body: string, contentType: string, extra: Record<string, string> = {}) {
  return new Request("http://localhost/hook", {
    method: "POST",
    headers: { "content-type": contentType, ...extra },
    body,
  })
}

describe("readWebhookBody", () => {
  it("reads a JSON object", async () => {
    const result = await readWebhookBody(req('{"fullName":"Jane"}', "application/json"))
    expect(result).toEqual({ ok: true, body: { fullName: "Jane" } })
  })

  it("reads a form-encoded body and groups repeated keys", async () => {
    const result = await readWebhookBody(
      req("fullName=Jane+Doe&tag=a&tag=b", "application/x-www-form-urlencoded")
    )
    expect(result).toEqual({ ok: true, body: { fullName: "Jane Doe", tag: ["a", "b"] } })
  })

  it("ignores prototype keys in a form body", async () => {
    const result = await readWebhookBody(
      req("__proto__=x&a=1", "application/x-www-form-urlencoded")
    )
    expect(result).toEqual({ ok: true, body: { a: "1" } })
  })

  it("refuses invalid JSON, lists, plain values, multipart and oversized bodies", async () => {
    expect(await readWebhookBody(req("{nope", "application/json"))).toMatchObject({
      ok: false,
      status: 400,
    })
    expect(await readWebhookBody(req("[1,2]", "application/json"))).toMatchObject({
      ok: false,
      status: 400,
    })
    expect(await readWebhookBody(req("42", "application/json"))).toMatchObject({ ok: false })
    expect(await readWebhookBody(req("x", "multipart/form-data; boundary=x"))).toMatchObject({
      ok: false,
      status: 415,
    })
    expect(
      await readWebhookBody(req("{}", "application/json", { "content-length": "2000000" }))
    ).toMatchObject({ ok: false, status: 413 })
  })
})
