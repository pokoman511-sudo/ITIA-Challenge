const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({
  "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
}[c]));

exports.handler = async (event) => {
  const username = String(event.queryStringParameters?.username || "")
    .replace(/^@+/, "").toLowerCase();

  if (!/^[a-z0-9_]{1,15}$/.test(username)) {
    return { statusCode: 302, headers: { Location: "/" }, body: "" };
  }

  const base = `https://${event.headers.host || "itia-challenge.netlify.app"}`;
  const appUrl = process.env.APPS_SCRIPT_URL;
  let result = null;

  if (appUrl) {
    try {
      const u = new URL(appUrl);
      u.searchParams.set("action", "publicResult");
      u.searchParams.set("handle", username);
      const r = await fetch(u.toString());
      const data = await r.json();
      if (data.ok && data.found) result = data;
    } catch (_) {}
  }

  const title = result
    ? `I participated in the ITIA Challenge and scored ${result.score}/10!`
    : "I participated in the ITIA Knowledge Challenge!";

  const description = result
    ? `${result.rank}! I know the story, the details, and the feeling. ITIA is home. 🎨❤️`
    : "Take the ITIA Knowledge Challenge. Where art feels like home.";

  const image = `${base}/og/${encodeURIComponent(username)}.png`;
  const redirect = `${base}/?user=${encodeURIComponent(username)}`;

  const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${base}/${encodeURIComponent(username)}">

<meta property="og:type" content="website">
<meta property="og:site_name" content="ITIA Challenge">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${base}/${encodeURIComponent(username)}">
<meta property="og:image" content="${image}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">

<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${image}">

<meta http-equiv="refresh" content="0;url=${redirect}">
</head>
<body>
<p>${esc(title)}</p>
<p>${esc(description)}</p>
<a href="${redirect}">Continue to ITIA Challenge</a>
<script>location.replace(${JSON.stringify(redirect)})</script>
</body>
</html>`;

  return {
    statusCode: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=60"
    },
    body: html
  };
};
