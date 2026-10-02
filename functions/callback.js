const GITHUB_CLIENT_ID = "Ov23li4ZXs4IWdhl2NIV";

function getCookie(request, name) {
  const cookieHeader = request.headers.get("Cookie") || "";
  const prefix = `${name}=`;

  for (const part of cookieHeader.split(";")) {
    const cookie = part.trim();
    if (cookie.startsWith(prefix)) return cookie.slice(prefix.length);
  }

  return "";
}

function safeEqual(left, right) {
  if (!left || !right || left.length !== right.length) return false;

  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }

  return mismatch === 0;
}

function popupResponse(origin, status, content, responseStatus = 200) {
  const authorizationMessage = `authorization:github:${status}:${JSON.stringify(content)}`;
  const safeMessage = JSON.stringify(authorizationMessage).replace(/</g, "\\u003c");
  const safeOrigin = JSON.stringify(origin).replace(/</g, "\\u003c");
  const nonce = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(18))));
  const html = `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8"><title>Portfolio CMS sign-in</title></head>
  <body>
    <p>Finishing GitHub sign-in...</p>
    <script nonce="${nonce}">
      (() => {
        const authorizationMessage = ${safeMessage};
        const expectedOrigin = ${safeOrigin};
        const opener = window.opener;
        const receiveMessage = (event) => {
          if (event.source !== opener || event.origin !== expectedOrigin) return;
          opener.postMessage(authorizationMessage, expectedOrigin);
          window.removeEventListener("message", receiveMessage);
        };

        if (opener) {
          window.addEventListener("message", receiveMessage);
          opener.postMessage("authorizing:github", expectedOrigin);
        }
      })();
    </script>
  </body>
</html>`;

  return new Response(html, {
    status: responseStatus,
    headers: {
      "Content-Type": "text/html; charset=UTF-8",
      "Cache-Control": "no-store",
      "Set-Cookie": "decap_oauth_state=; Path=/callback; HttpOnly; Secure; SameSite=Lax; Max-Age=0",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex, nofollow",
      "Referrer-Policy": "no-referrer",
      "Content-Security-Policy": `default-src 'none'; script-src 'nonce-${nonce}'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'`,
    },
  });
}

export async function onRequest({ request, env }) {
  const requestUrl = new URL(request.url);

  if (request.method !== "GET") {
    return new Response("Method not allowed", {
      status: 405,
      headers: {
        Allow: "GET",
        "Cache-Control": "no-store",
        "X-Robots-Tag": "noindex, nofollow",
      },
    });
  }

  if (!env.GITHUB_CLIENT_SECRET) {
    return popupResponse(requestUrl.origin, "error", { message: "GitHub OAuth is not configured." }, 500);
  }

  const code = requestUrl.searchParams.get("code");
  const returnedState = requestUrl.searchParams.get("state");
  const savedState = getCookie(request, "decap_oauth_state");

  if (!code || !safeEqual(returnedState, savedState)) {
    return popupResponse(requestUrl.origin, "error", { message: "The sign-in request expired or was invalid." }, 400);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  let tokenResponse;
  let result;
  try {
    tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Omar-Khalifa-Portfolio-CMS",
      },
      signal: controller.signal,
      body: new URLSearchParams({
        client_id: GITHUB_CLIENT_ID,
        client_secret: env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: `${requestUrl.origin}/callback`,
      }),
    });
    result = await tokenResponse.json();
  } catch {
    return popupResponse(requestUrl.origin, "error", { message: "GitHub sign-in is temporarily unavailable. Please try again." }, 502);
  } finally {
    clearTimeout(timeout);
  }

  if (!tokenResponse.ok || !result || result.error || typeof result.access_token !== "string" || !result.access_token) {
    return popupResponse(
      requestUrl.origin,
      "error",
      { message: result?.error_description || result?.error || "GitHub sign-in failed." },
      401,
    );
  }

  return popupResponse(requestUrl.origin, "success", {
    token: result.access_token,
    provider: "github",
  });
}
