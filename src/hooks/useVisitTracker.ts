import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useVisitTracker(page: string) {
  useEffect(() => {
    // Generate a simple anonymous hash from user agent + date
    const hash = btoa(navigator.userAgent.slice(0, 30) + new Date().toDateString()).slice(0, 20);
    
    supabase.from("site_visits").insert({
      page,
      visitor_hash: hash,
    }).then(() => {});
  }, [page]);
}
