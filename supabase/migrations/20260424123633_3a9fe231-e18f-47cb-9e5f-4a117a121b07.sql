
CREATE POLICY "users update own profile"
ON public.profiles
FOR UPDATE
TO public
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "approved insert gyms"
ON public.gyms
FOR INSERT
TO public
WITH CHECK (public.is_approved());
