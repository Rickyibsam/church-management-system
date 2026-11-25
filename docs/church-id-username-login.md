# Church ID and username authentication

The application supports email-free church registration and username/password access.

## Registration
- The first church administrator registers a church and chooses a username/password.
- Supabase Auth stores an internal, non-deliverable login alias; the user never needs to provide an email address.
- The database generates a unique Church ID in the format `CH-000001`.
- The registering account becomes the church owner and the Main Church branch is created.

## Login
- Users enter Church ID, username, and password.
- The login Edge Function resolves the Church ID and username to the internal Auth identity, verifies active church membership, and signs in with Supabase Auth.
- Passwords are handled only by Supabase Auth; they are never stored in application tables.

## Branch users
- Church owners/admins can create users with username, temporary password, role, and optional branch assignment.
- Usernames are unique within a church, so different churches may use the same username.
- Only the church owner may create another church administrator.
- Each user receives a separate Supabase Auth account.

## Security and operational notes
- `church_login_accounts` has RLS enabled and no client-facing policies or grants; only trusted Edge Functions use the service role.
- Edge Functions validate the application Origin and never return internal Auth aliases.
- Church data remains protected by the existing tenant and branch RLS policies.
- Passwords must be at least 12 characters.
- Email is optional and not used for ordinary registration or login. Email invitations remain a separate legacy workflow and are not required for username-based accounts.
- Configure the Supabase Edge Function secret `APP_ALLOWED_ORIGIN` to the exact value `https://church-management-system.ibsamricky.workers.dev` before using the new endpoints.
- Password recovery without email must be provided by a verified Church Owner/Super Admin reset workflow or a separately designed recovery code process. Do not store plaintext passwords or expose service-role credentials.
- Public self-service registration should receive abuse/rate-limit protection before wide public launch.

