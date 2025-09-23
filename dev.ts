import type { FlintConfig } from "./types.ts";

import watch from "./watch.ts";
import { parseArgs } from "@std/cli/parse-args";
import build from "./build.ts";
import serve from "./serve.ts";

const watchScript = `<script type="module">
	let esrc = new EventSource("/_watch");
	let inError = false;

	esrc.addEventListener("message", () => {
			inError = false;

			window.location.reload();
	});

	esrc.addEventListener("error", () => {
		inError = true;
	});

	esrc.addEventListener("open", () => {
		if (inError) {
			window.location.reload();
		}
	});
</script>
`;

export default async function (config: FlintConfig) {
  const flags = parseArgs(Deno.args, {
    string: ["port"],
  });

  const { urls, etags } = await build({
    ...config,
    routes: config.routes.filter((r) => r.once),
  });

  config.etags = etags;

  config.resolve = (key: string) => urls[key] ?? key;

  const fetch = serve(config);

  Deno.serve(
    {
      port: flags.port ? +flags.port : 4000,
    },
    async (req) => {
      const url = new URL(req.url);

      if (url.pathname === "/_watch") {
        return watch(config.dist);
      }

      const response = await fetch(req);

      if (response.headers.get("content-type") !== "text/html") {
        return response;
      }

      let body = await response.text();

      body += watchScript;

      return new Response(body, {
        status: response.status,
        headers: response.headers,
      });
    },
  );
}
