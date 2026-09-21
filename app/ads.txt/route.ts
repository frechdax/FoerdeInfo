export const dynamic = "force-dynamic";

export async function GET() {
  const client =
    process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_CLIENT ||
    "ca-pub-8846945812828956";
  const publisherId = client.replace(/^ca-/, "");

  const body = /^pub-\d+$/.test(publisherId)
    ? `google.com, ${publisherId}, DIRECT, f08c47fec0942fa0\n`
    : "# Google AdSense publisher ID not configured yet.\n";

  return new Response(body, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=300",
    },
  });
}
