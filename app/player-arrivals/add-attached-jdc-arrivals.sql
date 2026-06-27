-- Add arrivals from "John Deere Classic Travel Information Form.xlsx"
-- Records included: 13
--
-- This script:
--   1. Updates each person's email and phone number.
--   2. Adds the person as a Player if they are missing.
--   3. Replaces any existing arrival for that person.
--   4. Inserts the attached arrival information.
--
-- Dylan Wu is entered as "Rental Car" because no airline or flight number
-- was supplied and the note says he is driving from Chicago.

begin;

create temporary table incoming_arrivals (
  source_id integer,
  first_name text,
  last_name text,
  email text,
  phone text,
  arrival_method text,
  arrival_date date,
  arrival_airport text,
  airline text,
  flight_number text,
  estimated_arrival_time time,
  party_details text,
  submitted_notes text
) on commit drop;

insert into incoming_arrivals (
  source_id,
  first_name,
  last_name,
  email,
  phone,
  arrival_method,
  arrival_date,
  arrival_airport,
  airline,
  flight_number,
  estimated_arrival_time,
  party_details,
  submitted_notes
)
values
  (
    21,
    'Davis',
    'Thompson',
    'savannah.channell@sportfive.com',
    '334-524-5542',
    'Commercial Flight',
    '2026-06-29',
    'MLI',
    'Delta',
    '4644',
    '10:16',
    '1',
    'DT will be traveling solo.'
  ),
  (
    22,
    'Jimmy',
    'Stanger',
    'teristanger1@gmail.com',
    '8137278375',
    'Commercial Flight',
    '2026-06-29',
    'MLI',
    'American Airlines',
    '3698',
    '10:41',
    '1',
    null
  ),
  (
    23,
    'Takumi',
    'Kanaya',
    'hhozawa_contractor@wmeagency.com',
    '+818041616764',
    'Commercial Flight',
    '2026-06-27',
    'MLI',
    'United Airlines',
    '5535',
    '13:56',
    '2',
    null
  ),
  (
    24,
    'Dylan',
    'Wu',
    'dwdwu1@gmail.com',
    '5419418545',
    'Rental Car',
    '2026-06-28',
    'MLI',
    null,
    null,
    '20:00',
    '1',
    'Picking up a courtesy car and driving over from Chicago with his caddie.'
  ),
  (
    25,
    'Davis',
    'Chatfield',
    'Davischatfield@yahoo.com',
    '5083866325',
    'Commercial Flight',
    '2026-06-29',
    'MLI',
    'Delta',
    'DL4958',
    '16:37',
    '1',
    null
  ),
  (
    26,
    'Matthieu',
    'Pavon',
    'myah.petchey@the.team',
    '+447483605395',
    'Commercial Flight',
    '2026-06-28',
    'MLI',
    'United Airlines',
    'UA 5420',
    '21:09',
    '1',
    null
  ),
  (
    27,
    'Stephan',
    'Jaeger',
    'Stephanjaeger@yahoo.com',
    '1-423-994-9169',
    'Commercial Flight',
    '2026-06-29',
    'MLI',
    'Delta',
    '4958',
    '16:37',
    '3 adults, 2 children, and a support dog',
    'SUV requested because of the party size and support dog.'
  ),
  (
    28,
    'Johnny',
    'Keefer',
    'johnkeefer2@gmail.com',
    '858-353-2058',
    'Commercial Flight',
    '2026-06-29',
    'MLI',
    'American Airlines',
    '3875',
    '16:06',
    '1',
    null
  ),
  (
    29,
    'Sam',
    'Ryder',
    'morgan@fairwhaymgmt.com',
    '4076906592',
    'Commercial Flight',
    '2026-06-28',
    'MLI',
    'Delta',
    '4950',
    '22:34',
    '2',
    'Late arrival.'
  ),
  (
    30,
    'Ben',
    'Griffin',
    'ashley.wilmot@sportfive.com',
    '919-265-8202',
    'Commercial Flight',
    '2026-06-30',
    'MLI',
    'United Airlines',
    'UA5535',
    '12:37',
    '1',
    null
  ),
  (
    31,
    'Garrick',
    'Higgo',
    'jsnowie@the.team',
    '(912) 215-9556',
    'Commercial Flight',
    '2026-06-28',
    'MLI',
    'American Airlines',
    '5795',
    '15:59',
    '2',
    null
  ),
  (
    32,
    'Thorbjørn',
    'Olesen',
    'Jack@modestgolf.com',
    '+971 58 528 1305',
    'Commercial Flight',
    '2026-06-29',
    'Chicago ORD',
    'Air Canada',
    'AC4408',
    '12:00',
    '1',
    null
  ),
  (
    33,
    'Adam',
    'Svensson',
    'benny@wearesbx.com',
    '561-267-3101',
    'Commercial Flight',
    '2026-06-28',
    'MLI',
    'Delta',
    '4644',
    '10:16',
    '2',
    null
  );

-- Update contact information for existing people.
update public.people p
set
  email = i.email,
  phone = i.phone,
  role = 'Player'
from incoming_arrivals i
where
  lower(trim(coalesce(p.email, ''))) = lower(trim(i.email))
  or (
    lower(trim(p.first_name)) = lower(trim(i.first_name))
    and lower(trim(p.last_name)) = lower(trim(i.last_name))
  );

-- Add any people who are not already in the people table.
insert into public.people (
  first_name,
  last_name,
  email,
  phone,
  role,
  notes
)
select
  i.first_name,
  i.last_name,
  i.email,
  i.phone,
  'Player',
  null
from incoming_arrivals i
where not exists (
  select 1
  from public.people p
  where
    lower(trim(coalesce(p.email, ''))) = lower(trim(i.email))
    or (
      lower(trim(p.first_name)) = lower(trim(i.first_name))
      and lower(trim(p.last_name)) = lower(trim(i.last_name))
    )
);

-- Match each incoming row to one person record.
create temporary table matched_arrivals on commit drop as
select
  i.*,
  matched.person_id,
  matched.matched_first_name,
  matched.matched_last_name
from incoming_arrivals i
cross join lateral (
  select
    p.id as person_id,
    p.first_name as matched_first_name,
    p.last_name as matched_last_name
  from public.people p
  where
    lower(trim(coalesce(p.email, ''))) = lower(trim(i.email))
    or (
      lower(trim(p.first_name)) = lower(trim(i.first_name))
      and lower(trim(p.last_name)) = lower(trim(i.last_name))
    )
  order by
    case
      when lower(trim(coalesce(p.email, ''))) = lower(trim(i.email)) then 0
      else 1
    end,
    p.id
  limit 1
) matched;

-- Replace an older arrival for any of these people.
delete from public.player_arrivals pa
using matched_arrivals m
where pa.person_id = m.person_id;

-- Insert the attached arrivals.
insert into public.player_arrivals (
  person_id,
  player_first_name,
  player_last_name,
  arrival_method,
  airline,
  flight_number,
  flight_origin,
  tail_number,
  arrival_date,
  estimated_arrival_time,
  notes
)
select
  m.person_id,
  m.matched_first_name,
  m.matched_last_name,
  m.arrival_method,
  case
    when m.arrival_method = 'Commercial Flight' then m.airline
    else null
  end,
  case
    when m.arrival_method = 'Commercial Flight' then m.flight_number
    else null
  end,
  null,
  null,
  m.arrival_date,
  m.estimated_arrival_time,
  concat_ws(
    ' | ',
    'Arrival airport: ' || m.arrival_airport,
    'Party: ' || m.party_details,
    nullif(trim(m.submitted_notes), '')
  )
from matched_arrivals m;

commit;

-- Verification: these should return 13 rows.
select
  pa.player_first_name,
  pa.player_last_name,
  p.email,
  p.phone,
  pa.arrival_method,
  pa.arrival_date,
  pa.estimated_arrival_time,
  pa.airline,
  pa.flight_number,
  pa.notes
from public.player_arrivals pa
join public.people p
  on p.id = pa.person_id
where p.email in (
  'savannah.channell@sportfive.com',
  'teristanger1@gmail.com',
  'hhozawa_contractor@wmeagency.com',
  'dwdwu1@gmail.com',
  'Davischatfield@yahoo.com',
  'myah.petchey@the.team',
  'Stephanjaeger@yahoo.com',
  'johnkeefer2@gmail.com',
  'morgan@fairwhaymgmt.com',
  'ashley.wilmot@sportfive.com',
  'jsnowie@the.team',
  'Jack@modestgolf.com',
  'benny@wearesbx.com'
)
order by
  pa.arrival_date,
  pa.estimated_arrival_time,
  pa.player_last_name;
