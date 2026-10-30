-- RAUSO 2.9.9: move the group read cursor only to a real, visible message.
-- SECURITY INVOKER keeps both the message and read-state RLS checks in force.
-- The ON CONFLICT update is monotonic across concurrent devices.
CREATE OR REPLACE FUNCTION public.rauso_mark_group_read(
  p_outing_id uuid, p_seen_message_id uuid
) RETURNS void
LANGUAGE plpgsql SECURITY INVOKER SET search_path = ''
AS $function$
DECLARE v_seen_at timestamptz;
BEGIN
  IF (select auth.uid()) IS NULL THEN
    RAISE EXCEPTION 'Anmeldung erforderlich' USING ERRCODE='42501';
  END IF;
  SELECT m.created_at INTO v_seen_at
  FROM public.rauso_outing_messages AS m
  WHERE m.id=p_seen_message_id AND m.outing_id=p_outing_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Nachricht nicht sichtbar' USING ERRCODE='42501';
  END IF;
  INSERT INTO public.rauso_outing_read_states(outing_id,user_id,last_read_at)
    VALUES(p_outing_id,(select auth.uid()),v_seen_at)
  ON CONFLICT (outing_id,user_id) DO UPDATE SET
    last_read_at=GREATEST(public.rauso_outing_read_states.last_read_at,EXCLUDED.last_read_at);
END;
$function$;
REVOKE ALL ON FUNCTION public.rauso_mark_group_read(uuid,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rauso_mark_group_read(uuid,uuid) TO authenticated;
