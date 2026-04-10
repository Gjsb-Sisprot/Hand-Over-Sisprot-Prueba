import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ConversationList } from "@/components/dashboard/conversation-list";
import { getConversations } from "@/lib/actions/conversations";

export default async function ConversationsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: agent } = await supabase
    .from("agents")
    .select("*")
    .eq("id", user.id)
    .single();

  const conversations = await getConversations(undefined, true);

  return (
    <ConversationList
      initialConversations={conversations}
      agent={agent}
    />
  );
}
