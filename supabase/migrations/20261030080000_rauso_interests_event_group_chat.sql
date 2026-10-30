-- RAUSO: interest-based member discovery and event-only group chat.
-- Existing profiles, outings, RSVPs and messages are preserved.
ALTER TABLE public.rauso_profiles
 ADD COLUMN IF NOT EXISTS interests text[] NOT NULL DEFAULT '{}'::text[];
ALTER TABLE public.rauso_profiles
 ADD CONSTRAINT rauso_profile_interests_limit CHECK (
    cardinality(interests) <= 8 AND
    array_to_string(interests,',') !~ '[<>]' AND
    char_length(array_to_string(interests,',')) <= 240
 );
CREATE TABLE IF NOT EXISTS public.rauso_outing_messages (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 outing_id uuid NOT NULL REFERENCES public.rauso_outings(id) ON DELETE CASCADE,
 sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 body text NOT NULL CHECK (char_length(btrim(body)) BETWEEN 1 AND 2000),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS rauso_outing_messages_outing_time
 ON public.rauso_outing_messages (outing_id,created_at,id);
ALTER TABLE public.rauso_outing_messages ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.rauso_outing_messages FROM PUBLIC,anon;
GRANT SELECT,INSERT ON public.rauso_outing_messages TO authenticated;
CREATE POLICY "RAUSO outing chat read participants" ON public.rauso_outing_messages
 FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.rauso_outings o
          WHERE o.id=outing_id AND o.author_id=(SELECT auth.uid()))
  OR
  EXISTS (SELECT 1 FROM public.rauso_rsvps r
          WHERE r.outing_id=rauso_outing_messages.outing_id
          AND r.user_id=(SELECT auth.uid()) AND r.status='going')
 );
CREATE POLICY "RAUSO outing chat write participants" ON public.rauso_outing_messages
 FOR INSERT TO authenticated WITH CHECK (
  sender_id=(SELECT auth.uid()) AND (
   EXISTS (SELECT 1 FROM public.rauso_outings o
           WHERE o.id=outing_id AND o.author_id=(SELECT auth.uid()))
   OR
   EXISTS (SELECT 1 FROM public.rauso_rsvps r
           WHERE r.outing_id=rauso_outing_messages.outing_id
           AND r.user_id=(SELECT auth.uid()) AND r.status='going')
  )
 );
