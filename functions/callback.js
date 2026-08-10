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

function popupResponse(status, content, responseStatus = 200) {
  const authorizationMessage = `authorization:github:${status}:${JSON.stringify(content)}`;
  const safeMessage = JSON.stringify(authorizationMessage).replace(/</g, "\\u003c");
  const html = `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8"><title>Portfolio CMS sign-in</title></head>
  <body>
    <p>Finishing GitHub sign-in...</p>
    <script>
      (() => {
        const authorizationMessage = ${safeMessage};
        const receiveMessage = (event) => {
          if (event.source !== window.opener) return;
          window.opener.postMessage(authorizationMessage, event.origin);
          window.removeEventListener("message", receiveMessage);
        };

        window.addEventListener("message", receiveMessage);
        if (window.opener) window.opener.postMessage("authorizing:github", "*");
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
    },
  });
}

export async function onRequest({ request, env }) {
  if (!env.GITHUB_CLIENT_SECRET) {
    return popupResponse("error", { message: "GitHub OAuth is not configured." }, 500);
  }

  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const returnedState = requestUrl.searchParams.get("state");
  const savedState = getCookie(request, "decap_oauth_state");

  if (!code || !safeEqual(returnedState, savedState)) {
    return popupResponse("error", { message: "The sign-in request expired or was invalid." }, 400);
  }

  const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "Omar-Khalifa-Portfolio-CMS",
    },
    body: new URLSearchParams({
      client_id: GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: `${requestUrl.origin}/callback`,
    }),
  });

  const result = await tokenResponse.json();

  if (!tokenResponse.ok || result.error || !result.access_token) {
    return popupResponse(
      "error",
      { message: result.error_description || result.error || "GitHub sign-in failed." },
      401,
    );
  }

  return popupResponse("success", {
    token: result.access_token,
    provider: "github",
  });
}
