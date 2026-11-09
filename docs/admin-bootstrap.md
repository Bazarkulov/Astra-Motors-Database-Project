# Bootstrap the first administrator

Do not put a service key or password in SQL, source control, or chat.

1. In the Supabase dashboard, create an Auth user using the intended administrator's email. Set the password there and enable any desired MFA options.
2. In the SQL editor for the correct project, insert the matching staff profile. Replace the three sample values with verified details:

```sql
insert into public.employee (auth_user_id, first_name, last_name, email, role)
select id, 'First', 'Last', lower(email), 'admin'
from auth.users
where lower(email) = lower('admin@example.com')
on conflict (auth_user_id) do update
set first_name = excluded.first_name,
    last_name = excluded.last_name,
    email = excluded.email,
    role = 'admin',
    is_active = true;
```

3. Configure the app's Supabase URL and publishable key, then visit `/admin/login` and sign in with the Auth account.
4. Create further employees through an authorized administrative process and assign only the role they need.

The database migration does not create a default employee or password.
