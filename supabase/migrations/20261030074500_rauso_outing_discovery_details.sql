-- RAUSO: persist optional event details already entered by organizers.
-- Existing event rows remain unchanged; NULL signifies "not specified".
-- This migration does not modify RLS policies, RSVP records or user data.
ALTER TABLE public.rauso_outings
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS family_friendly boolean,
  ADD COLUMN IF NOT EXISTS meeting_type text,
  ADD COLUMN IF NOT EXISTS transport_mode text,
  ADD COLUMN IF NOT EXISTS ride_role text,
  ADD COLUMN IF NOT EXISTS departure_place text,
  ADD COLUMN IF NOT EXISTS transport_line text,
  ADD COLUMN IF NOT EXISTS seats_offered integer;

DO $migration$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'rauso_outings_category_length') THEN
    ALTER TABLE public.rauso_outings ADD CONSTRAINT rauso_outings_category_length CHECK (category IS NULL OR char_length(category) BETWEEN 1 AND 40);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'rauso_outings_transport_valid') THEN
    ALTER TABLE public.rauso_outings ADD CONSTRAINT rauso_outings_transport_valid CHECK (transport_mode IS NULL OR transport_mode IN ('auto','ubahn','bus','zug','zufuss'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'rauso_outings_ride_role_valid') THEN
    ALTER TABLE public.rauso_outings ADD CONSTRAINT rauso_outings_ride_role_valid CHECK (ride_role IS NULL OR ride_role IN ('none','offer','seek'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'rauso_outings_seats_range') THEN
    ALTER TABLE public.rauso_outings ADD CONSTRAINT rauso_outings_seats_range CHECK (seats_offered IS NULL OR seats_offered BETWEEN 1 AND 6);
  END IF;
END
$migration$;
