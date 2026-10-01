// Placeholder deployment used to provision the Cloudflare Worker and bindings.
// It has no public workers.dev endpoint or custom domain. Replace this entry
// with the Workers-compatible app build before attaching chat.melearn.io.
export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === "/healthz") {
      return Response.json({ service: "melearn-chat", status: "migration-pending" }, { status: 503 });
    }
    return new Response("Application deployment is not ready.", {
      status: 503,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  },
};
