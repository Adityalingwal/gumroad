import React from "react";

interface OnboardingPageProps {
  children: React.ReactNode;
}

const OnboardingPage: React.FC<OnboardingPageProps> = ({ children }) => {
  return (
    <div className="grid grid-flow-col">
      {children}
    </div>
  );
};

export default OnboardingPage;
