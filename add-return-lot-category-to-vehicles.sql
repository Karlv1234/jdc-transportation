-- Add Return Lot Category to the vehicle inventory used by the app.
-- Safe to run more than once.

alter table public.vehicles
add column if not exists return_lot_category text;

comment on column public.vehicles.return_lot_category is
'Category used to organize the vehicle when it is returned to the Return Lot.';

-- Verify that the column exists.
select
  column_name,
  data_type,
  is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'vehicles'
  and column_name = 'return_lot_category';

-- Optional inventory check after you populate the values.
select
  car_number,
  dealership,
  return_lot_category
from public.vehicles
order by car_number;
