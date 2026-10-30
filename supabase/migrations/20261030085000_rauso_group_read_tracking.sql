-- RAUSO 2.9.9: per-member read cursors for confirmed outing group chats.
-- No existing messages, RSVP rows or private-chat read receipts are modified.
CREATE TABLE IF NOT EXISTS public.rauso_outing_read_states (
  outing_id uuid NOT NULL REFERENCES public.rauso_outings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_read_at timestamptz NOT NULL,
  PRIMARY KEY (outing_id, user_id)
);
CREATE INDEX IF NOT EXISTS rauso_outing_read_states_user_idx
 ON public.rauso_outing_read_states (user_id);
ALTER TABLE public.rauso_outing_read_states ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.rauso_outing_read_states FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.rauso_outing_read_states TO authenticated;

CREATE POLICY "RAUSO group reads self select" ON public.rauso_outing_read_states
 FOR SELECT TO authenticated
 USING (user_id=(select auth.uid()) AND (
   EXISTS(SELECT 1 FROM public.rauso_outings o
          WHERE o.id=outing_id AND o.author_id=(select auth.uid()))
   OR EXISTS(SELECT 1 FROM public.rauso_rsvps r
          WHERE r.outing_id=rauso_outing_read_states.outing_id
          AND r.user_id=(select auth.uid()) AND r.status='going')
 ));
CREATE POLICY "RAUSO group reads self insert" ON public.rauso_outing_read_states
 FOR INSERT TO authenticated
 WITH CHECK (user_id=(select auth.uid()) AND (
   EXISTS(SELECT 1 FROM public.rauso_outings o
          WHERE o.id=outing_id AND o.author_id=(select auth.uid()))
   OR EXISTS(SELECT 1 FROM public.rauso_rsvps r
          WHERE r.outing_id=rauso_outing_read_states.outing_id
          AND r.user_id=(select auth.uid()) AND r.status='going')
 ));
CREATE POLICY "RAUSO group reads self update" ON public.rauso_outing_read_states
 FOR UPDATE TO authenticated
 USING (user_id=(select auth.uid()) AND (
   EXISTS(SELECT 1 FROM public.rauso_outings o
          WHERE o.id=outing_id AND o.author_id=(select auth.uid()))
   OR EXISTS(SELECT 1 FROM public.rauso_rsvps r
          WHERE r.outing_id=rauso_outing_read_states.outing_id
          AND r.user_id=(select auth.uid()) AND r.status='going')
 ))
 WITH CHECK (user_id=(select auth.uid()) AND (
   EXISTS(SELECT 1 FROM public.rauso_outings o
          WHERE o.id=outing_id AND o.author_id=(select auth.uid()))
   OR EXISTS(SELECT 1 FROM public.rauso_rsvps r
          WHERE r.outing_id=rauso_outing_read_states.outing_id
          AND r.user_id=(select auth.uid()) AND r.status='going')
 ));

-- SECURITY INVOKER preserves the messages/read-states RLS restrictions.
-- Counts are exact even if chat preview requests are paginated/truncated.
CREATE OR REPLACE FUNCTION public.rauso_group_unread_counts()
RETURNS TABLE(outing_id uuid, unread_count bigint)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = ''
AS $function$
  SELECT m.outing_id, count(*)::bigint AS unread_count
  FROM public.rauso_outing_messages AS m
  LEFT JOIN public.rauso_outing_read_states AS r
    ON r.outing_id=m.outing_id AND r.user_id=(select auth.uid())
  WHERE m.sender_id <> (select auth.uid())
    AND (r.last_read_at IS NULL OR m.created_at > r.last_read_at)
  GROUP BY m.outing_id
$function$;
REVOKE ALL ON FUNCTION public.rauso_group_unread_counts() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rauso_group_unread_counts() TO authenticated;
