import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: files, error: listError } = await supabase.storage
      .from("profile-images")
      .list("", { limit: 1000 });

    if (listError) throw listError;

    const allFiles: string[] = [];

    for (const file of files ?? []) {
      if (file.id) {
        allFiles.push(file.name);
      } else {
        const { data: subFiles } = await supabase.storage
          .from("profile-images")
          .list(file.name, { limit: 1000 });
        for (const sub of subFiles ?? []) {
          allFiles.push(`${file.name}/${sub.name}`);
        }
      }
    }

    if (allFiles.length > 0) {
      const { error: removeError } = await supabase.storage
        .from("profile-images")
        .remove(allFiles);
      if (removeError) throw removeError;
    }

    return new Response(
      JSON.stringify({ deleted: allFiles.length, files: allFiles }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
