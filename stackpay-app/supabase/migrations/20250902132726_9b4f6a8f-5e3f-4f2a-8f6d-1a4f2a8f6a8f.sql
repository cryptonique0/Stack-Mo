-- Create tables if they don't exist
create table if not exists public.payments (
   id uuid primary key default uuid_generate_v4(),
   created_at timestamp with time zone default timezone('utc'::text, now()) not null,
   confirmed_at timestamp with time zone,
   expected_amount bigint not null,
   currency text not null,
   description text,
   status text not null default 'pending',
   email text,
   webhook_url text,
   txid text,
   merchant_id uuid
);

create table if not exists public.notification_logs (
   id uuid primary key default uuid_generate_v4(),
   created_at timestamp with time zone default timezone('utc'::text, now()) not null,
   type text not null,
   recipient text not null,
   event text not null,
   status text not null,
   metadata jsonb,
   error text
);

create table if not exists public.webhook_logs (
   id uuid primary key default uuid_generate_v4(),
   created_at timestamp with time zone default timezone('utc'::text, now()) not null,
   merchant_id uuid not null,
   webhook_url text not null,
   event_type text not null,
   payload jsonb not null,
   attempts integer default 0,
   status text not null default 'pending',
   error text,
   last_attempt_at timestamp with time zone,
   next_retry_at timestamp with time zone
);

create index if not exists payments_status_idx on public.payments(status);
create index if not exists payments_created_at_idx on public.payments(created_at);
create index if not exists webhook_logs_status_idx on public.webhook_logs(status);
create index if not exists webhook_logs_next_retry_idx on public.webhook_logs(next_retry_at);

create or replace function public.handle_payment_confirmation()
returns trigger as $$
begin
   if NEW.status = 'confirmed' and OLD.status != 'confirmed' then
       if NEW.webhook_url is not null then
           insert into public.webhook_logs
               (merchant_id, webhook_url, event_type, payload)
           values
               (NEW.merchant_id,
                NEW.webhook_url,
                'payment.confirmed',
                jsonb_build_object(
                    'payment_id', NEW.id,
                    'amount', NEW.expected_amount,
                    'currency', NEW.currency,
                    'status', NEW.status,
                    'txid', NEW.txid
                ));
       end if;

       if NEW.email is not null then
           perform net.http_post(
               url := '/functions/v1/notify/payment-confirmed',
               headers := '{"Content-Type": "application/json"}',
               body := jsonb_build_object(
                   'email', NEW.email,
                   'amount', NEW.expected_amount,
                   'currency', NEW.currency,
                   'txid', NEW.txid
               )::text
           );
       end if;
   end if;

   return NEW;
end;
$$ language plpgsql;

drop trigger if exists on_payment_confirmed on public.payments;
create trigger on_payment_confirmed
   after update on public.payments
   for each row
   execute function public.handle_payment_confirmation();

alter table public.payments enable row level security;
alter table public.notification_logs enable row level security;
alter table public.webhook_logs enable row level security;

create policy "Enable read access for authenticated users only"
   on public.payments for select
   to authenticated
   using (true);

create policy "Enable insert access for authenticated users only"
   on public.payments for insert
   to authenticated
   with check (true);

create policy "Enable update access for authenticated users only"
   on public.payments for update
   to authenticated
   using (true);

create policy "Enable read access for authenticated users only"
   on public.notification_logs for select
   to authenticated
   using (true);

create policy "Enable insert for service role only"
   on public.notification_logs for insert
   to service_role
   with check (true);

create policy "Enable read access for authenticated users only"
   on public.webhook_logs for select
   to authenticated
   using (true);

create policy "Enable insert/update for service role only"
   on public.webhook_logs for all
   to service_role
   using (true)
   with check (true);
