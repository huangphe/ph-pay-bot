import { supabase } from "@/lib/supabase";

export default async function DebugPage() {
  const { data } = await supabase.from("expenses").select("*").order("created_at", { ascending: false }).limit(10);
  return (
    <pre className="p-10 bg-black text-green-500 overflow-auto">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}
