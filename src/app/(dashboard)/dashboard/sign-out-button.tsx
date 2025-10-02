"use client";

import { Button } from "@/components/ui/button";
import { createSupabaseClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function SignOutButton() {
  const router = useRouter();

  const onSignOut = async () => {
    const supabase = createSupabaseClient();
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Berhasil keluar");
    router.replace("/");
  };

  return (
    <Button variant="outline" onClick={onSignOut}>
      Keluar
    </Button>
  );
}
