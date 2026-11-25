alter table public.family_relationships
  drop constraint if exists family_relationships_relationship_check;
alter table public.family_relationships
  add constraint family_relationships_relationship_check
  check (relationship = any(array[
    'head','spouse','child','son','daughter','parent','grandparent',
    'sibling','guardian','dependent','other'
  ]::text[]));
