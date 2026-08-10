const GITHUB_CLIENT_ID = "Ov23li4ZXs4IWdhl2NIV";

function randomState() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export async function onRequest({ request, env }) {
  const requestUrl = new URL(request.url);
  const state = randomState();
  const authorizeUrl = new URL("https://github.com/login/oauth/authorize");

  authorizeUrl.searchParams.set("client_id", GITHUB_CLIENT_ID);
  authorizeUrl.searchParams.set("redirect_uri", `${requestUrl.origin}/callback`);
  authorizeUrl.searchParams.set("scope", "public_repo");
  authorizeUrl.searchParams.set("state", state);

  return new Response(null, {
    status: 302,
    headers: {
      Location: authorizeUrl.toString(),
      "Cache-Control": "no-store",
      "Set-Cookie": [
        `decap_oauth_state=${state}`,
        "Path=/callback",
        "HttpOnly",
        "Secure",
        "SameSite=Lax",
        "Max-Age=600",
      ].join("; "),
    },
  });
}
