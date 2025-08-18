import React from 'react';
import chefBgImage from '../assets/chefsingin.jpg';
import logo from '../assets/logo.svg';

export interface AuthLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}

const AuthLayout: React.FC<AuthLayoutProps> = ({
  children,
  title = "Start bringing your culinary ideas to reality.",
  subtitle = "Create a free account and get full access to all features. No credit card needed. Trusted by 4,000 professionals."
}) => {
  return (
    <div className="min-h-screen">
      {/* Fixed Header with Logo */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white shadow-sm">
        <div className="px-6 sm:px-8 lg:px-16 py-4">
          <img src={logo} alt="Choma Logo" className="w-12 h-12 sm:w-16 sm:h-16" />
        </div>
      </header>

      {/* Main Content */}
      <div className="min-h-screen flex flex-col lg:flex-row">
        {/* Mobile Image Section - Shows at top on mobile, starts from top */}
        <div className="lg:hidden relative h-80 sm:h-96 rounded-b-3xl overflow-hidden">
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url(${chefBgImage})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/20 to-black/60 flex items-center justify-center">
            <div className="text-center text-white px-6">
              <h2 className="text-2xl sm:text-3xl font-bold mb-3">Join Our Chef Community</h2>
              <p className="text-base sm:text-lg opacity-90 leading-relaxed max-w-sm">
                Never forget to go green everyday, because the greener you go the higher you get
              </p>
            </div>
          </div>
        </div>

        {/* Form Section - Only this section accounts for the header */}
        <div className="flex-1 lg:flex-[0_0_35%] lg:h-screen lg:overflow-y-auto rounded-t-3xl lg:rounded-none flex flex-col justify-center px-6 sm:px-8 lg:px-16 bg-white -mt-6 lg:mt-0 relative z-10 py-8 lg:pt-24 lg:pb-8">
          <div className="w-full max-w-2xl mx-auto">
            {children}
          </div>
        </div>

        {/* Desktop Image Section - Hidden on mobile, starts from top */}
        <div className="hidden lg:block lg:w-[65%] lg:h-screen lg:fixed lg:right-0 lg:top-0 lg:z-50">
          <div
            className="w-full h-full bg-cover bg-center bg-no-repeat relative"
            style={{ backgroundImage: `url(${chefBgImage})` }}
          >
            {/* Overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/40 to-black/60 flex items-end">
              <div className="p-12 text-white">
                <h2 className="text-4xl font-bold mb-4 leading-tight">
                  {title}
                </h2>
                <p className="text-lg opacity-90 leading-relaxed">
                  {subtitle}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export { AuthLayout };
export default AuthLayout;
