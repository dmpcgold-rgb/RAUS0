-- RAUSO 2.9.9: keep each account's group-chat read position on the server.
-- Membership checks match rauso_outing_messages: organizer or confirmed RSVP.
-- No existing chat messages or user records are modified.
CREATE TABLE IF NOT EXISTS public.rauso_outing_chat_reads (
 outing_id uuid NOT NULL REFERENCES public.rauso_outings(id) ON DELETE CASCADE,
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 last_read_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY (outing_id,user_id)
);
ALTER TABLE public.rauso_outing_chat_reads ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.rauso_outing_chat_reads FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON TABLE public.rauso_outing_chat_reads TO authenticated;
CREATE POLICY "RAUSO chat read marker self select"
 ON public.rauso_outing_chat_reads FOR SELECT TO authenticated
 USING (user_id=(SELECT auth.uid()));
CREATE POLICY "RAUSO chat read marker self insert"
 ON public.rauso_outing_chat_reads FOR INSERT TO authenticated
 WITH CHECK (
  user_id=(SELECT auth.uid()) AND
  (EXISTS (SELECT 1 FROM public.rauso_outings o
           WHERE o.id=outing_id AND o.author_id=(SELECT auth.uid()))
   OR EXISTS (SELECT 1 FROM public.rauso_rsvps r
           WHERE r.outing_id=rauso_outing_chat_reads.outing_id
           AND r.user_id=(SELECT auth.uid()) AND r.status='going'))
 );
CREATE POLICY "RAUSO chat read marker self update"
 ON public.rauso_outing_chat_reads FOR UPDATE TO authenticated
 USING (user_id=(SELECT auth.uid()))
 WITH CHECK (
  user_id=(SELECT auth.uid()) AND
  (EXISTS (SELECT 1 FROM public.rauso_outings o
           WHERE o.id=outing_id AND o.author_id=(SELECT auth.uid()))
   OR EXISTS (SELECT 1 FROM public.rauso_rsvps r
           WHERE r.outing_id=rauso_outing_chat_reads.outing_id
           AND r.user_id=(SELECT auth.uid()) AND r.status='going'))
 );
-- SECURITY INVOKER: unread counters only consider messages visible under existing RLS.
CREATE OR REPLACE FUNCTION public.rauso_group_chat_unread_counts()
 RETURNS TABLE (outing_id uuid,unread_count bigint)
 LANGUAGE sql STABLE SECURITY INVOKER
 SET search_path = ''
 AS $fn$
  SELECT m.outing_id,COUNT(*)::bigint AS unread_count
  FROM public.rauso_outing_messages m
  LEFT JOIN public.rauso_outing_chat_reads r
    ON r.outing_id=m.outing_id AND r.user_id=(SELECT auth.uid())
  WHERE (SELECT auth.uid()) IS NOT NULL
    AND m.sender_id<>(SELECT auth.uid())
    AND m.created_at>COALESCE(r.last_read_at,'epoch'::timestamptz)
  GROUP BY m.outing_id
 $fn$;
REVOKE ALL ON FUNCTION public.rauso_group_chat_unread_counts() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.rauso_group_chat_unread_counts() TO authenticated;
