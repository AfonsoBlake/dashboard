-- Allow approved users to UPDATE bookings (matches existing approved-read pattern)
CREATE POLICY "approved update bookings"
ON public.bookings
FOR UPDATE
TO public
USING (is_approved())
WITH CHECK (is_approved());