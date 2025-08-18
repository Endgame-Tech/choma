import React from 'react';
import AuthLayout from '../components/AuthLayout';

const SignUp: React.FC = () => {
  return (
    <AuthLayout>
      <div className="flex flex-col items-center justify-center h-full">
        <h1 className="text-3xl font-bold mb-4">Create your account.</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">Already have an account? <a href="/login" className="text-blue-500 hover:underline">Sign In</a></p>
        <form className="w-full">
          <div className="mb-4">
            <label className="block text-gray-700 dark:text-gray-300 mb-2" htmlFor="fullName">
              Full name *
            </label>
            <input
              type="text"
              id="fullName"
              className="w-full px-4 py-2 border rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Steven Stallion"
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 dark:text-gray-300 mb-2" htmlFor="email">
              Email address *
            </label>
            <input
              type="email"
              id="email"
              className="w-full px-4 py-2 border rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Example@gmail.com"
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 dark:text-gray-300 mb-2" htmlFor="password">
              Password *
            </label>
            <input
              type="password"
              id="password"
              className="w-full px-4 py-2 border rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="**************"
            />
          </div>
          <div className="flex items-center mb-4">
            <input type="checkbox" id="terms" className="mr-2" />
            <label htmlFor="terms" className="text-gray-700 dark:text-gray-300">I agree to the terms and condition</label>
          </div>
          <button
            type="submit"
            className="w-full bg-yellow-500 text-white py-2 rounded-lg hover:bg-yellow-600 transition-colors"
          >
            Sign Up
          </button>
        </form>
      </div>
    </AuthLayout>
  );
};

export default SignUp;
