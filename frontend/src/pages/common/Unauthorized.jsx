import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Card, CardHeader, CardBody } from "../../components/ui/Card";

function LockIcon() {
  return (
    <svg
      width="42"
      height="42"
      viewBox="0 0 24 24"
      fill="none"
      className="text-blue-900"
    >
      <path
        d="M7 10V7a5 5 0 0 1 10 0v3"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <rect
        x="5"
        y="10"
        width="14"
        height="10"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.8"
      />
    </svg>
  );
}

export default function Unauthorized() {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown((c) => c - 1);
    }, 1000);

    const timeout = setTimeout(() => {
      navigate("/login", { replace: true });
    }, 5000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [navigate]);

  return (
    <div className="max-w-xl mx-auto">
      <Card>
        <CardHeader
          title="Access restricted"
          subtitle="You’re not authorized to view this section."
        />

        <CardBody>
          <div className="flex items-start gap-4 mb-6">
            <div className="shrink-0">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center">
                <LockIcon />
              </div>
            </div>

            <div>
              <p className="text-sm text-gray-700 leading-relaxed">
                This page is limited to users with elevated permissions.
                If you believe this access should be granted, please contact
                the <span className="font-medium">Owner or Superuser</span>.
              </p>
            </div>
          </div>

          <div className="border-t border-gray-100 my-4" />

          <div className="flex items-center justify-between text-sm">
            <div className="text-gray-600">
              Redirecting to login in{" "}
              <span className="font-semibold text-gray-900">
                {countdown}
              </span>{" "}
              seconds
            </div>

            <Link
              to="/login"
              className="font-medium text-blue-700 hover:text-blue-900 underline underline-offset-4"
            >
              Go to login
            </Link>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}