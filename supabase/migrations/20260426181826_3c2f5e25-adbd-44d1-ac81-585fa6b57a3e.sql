
-- Allow approved authenticated users to read & resolve escalated questions for their gym
CREATE POLICY "approved read escalated_questions"
ON public.escalated_questions
FOR SELECT
TO authenticated
USING (
  is_approved()
  AND gym_id = (
    SELECT profiles.gym_id::text FROM profiles WHERE profiles.id = auth.uid()
  )
);

CREATE POLICY "approved update escalated_questions"
ON public.escalated_questions
FOR UPDATE
TO authenticated
USING (
  is_approved()
  AND gym_id = (
    SELECT profiles.gym_id::text FROM profiles WHERE profiles.id = auth.uid()
  )
)
WITH CHECK (
  is_approved()
  AND gym_id = (
    SELECT profiles.gym_id::text FROM profiles WHERE profiles.id = auth.uid()
  )
);
