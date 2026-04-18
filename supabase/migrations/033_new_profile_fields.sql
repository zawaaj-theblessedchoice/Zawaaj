-- Add new profile fields: islamic background, smoker, place of birth
ALTER TABLE zawaaj_profiles
  ADD COLUMN IF NOT EXISTS islamic_background text CHECK (islamic_background IN ('born_muslim', 'reverted')),
  ADD COLUMN IF NOT EXISTS smoker boolean,
  ADD COLUMN IF NOT EXISTS place_of_birth text;
