import { useNavigate } from "react-router-dom";
import { AuthLayout, AuthButton } from "@/components/auth/AuthLayout";

const PendingVerification = () => {
  const navigate = useNavigate();
  return (
    <AuthLayout
      title="Account Pending Approval"
      subtitle="Your account has been created and is awaiting review by a gym admin. You'll get access as soon as it's approved."
    >
      <AuthButton type="button" onClick={() => navigate("/login")}>
        Back to Sign In
      </AuthButton>
    </AuthLayout>
  );
};

export default PendingVerification;
