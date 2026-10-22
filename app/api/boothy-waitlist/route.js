export const runtime = "nodejs";

function reply(data, status = 200) {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(request) {
  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    return reply({ error: "Use the signup form." }, 415);
  }
  let input;
  try {
    const text = await request.text();
    if (text.length > 4096) return reply({ error: "This submission is too large." }, 413);
    input = JSON.parse(text);
    if (!input || typeof input !== "object" || Array.isArray(input)
      || Object.keys(input).some(key => !["email", "consent", "website"].includes(key))) {
      return reply({ error: "Check your email and consent." }, 400);
    }
    if (typeof input.email !== "string" || input.email.trim().length > 254
      || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim())) {
      return reply({ error: "Enter a valid email address." }, 400);
    }
    if (input.consent !== true || (input.website !== undefined && input.website !== "")) {
      return reply({ error: "Please agree to receive the launch update." }, 400);
    }
  } catch {
    return reply({ error: "Check your email and try again." }, 400);
  }
  try {
    // Keep signups in the existing database without forwarding browser cookies or headers.
    const upstream = await fetch("https://boothy.floot.app/_api/waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ json: {
        email: input.email.trim().toLowerCase(), consent: true, website: "",
      } }),
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    const envelope = await upstream.json();
    if (upstream.ok && envelope.json?.saved === true) return reply({ saved: true });
    return reply({ error: "We couldn’t save your email. Please try again." }, upstream.status === 400 ? 400 : 503);
  } catch {
    return reply({ error: "We couldn’t save your email. Please try again." }, 503);
  }
}
