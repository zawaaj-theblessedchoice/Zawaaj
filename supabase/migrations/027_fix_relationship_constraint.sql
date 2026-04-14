-- Migration 027: Expand zfa_relationship_check to include sister + other_female_relative
--
-- The child registration form offers 'sister' and 'other_female_relative' as valid
-- guardian options, but the original constraint only covered the parent registration values.
-- Both are legitimate guardian relationships and must be allowed.

ALTER TABLE zawaaj_family_accounts
  DROP CONSTRAINT IF EXISTS zfa_relationship_check;

ALTER TABLE zawaaj_family_accounts
  ADD CONSTRAINT zfa_relationship_check CHECK (
    contact_relationship = ANY (ARRAY[
      'mother', 'grandmother', 'aunt', 'female_guardian',
      'father', 'male_guardian',
      'sister', 'other_female_relative'
    ])
  );
