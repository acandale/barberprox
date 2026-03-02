

## Admin Multi-Appointment Booking

### Overview
Add the ability for admin users to create appointments on behalf of any client directly from the Admin panel. Regular users continue to book only for themselves. The dashboard will continue showing the next upcoming appointment.

### Changes

#### 1. New Component: `src/components/admin/AdminBookAppointment.tsx`
- A dialog/form accessible from the Admin Appointments tab via a "New Appointment" button
- Fields:
  - **Client selector**: Dropdown listing all profiles (fetched from `profiles` table -- admin has SELECT access)
  - **Service selector**: Dropdown from the `services` table
  - **Date picker**: Calendar with same disabled-date logic (work hours, vacations, blocked days)
  - **Time slot selector**: Generated from work hours, excluding conflicts
- On submit: Insert into `appointments` table with the selected client's `user_id`, using the admin's existing RLS policy ("Admins can manage all appointments")
- Admin can book multiple appointments in sequence without leaving the page

#### 2. Update `src/pages/Admin.tsx`
- Add a "New Appointment" button in the Appointments tab header (next to calendar controls)
- Wire it to open the `AdminBookAppointment` dialog
- Invalidate the appointments query on successful booking

#### 3. Dashboard (`src/pages/Dashboard.tsx`) -- No changes needed
- Already shows the next upcoming confirmed appointment and lists additional ones below
- This behavior is correct as-is

### Technical Details
- No database changes required -- the existing `appointments` table and RLS policies already support admin inserts for any `user_id`
- The time slot generation logic from `Booking.tsx` will be extracted/reused in the admin component
- The client list will be fetched from `profiles` table (admin has SELECT access via RLS)

