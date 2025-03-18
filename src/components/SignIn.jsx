import React from "react";

const SignIn = () => {
  const handleGoogleSignIn = () => {
    window.location.href = 'http://localhost:5000/auth/google';
  };



  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <button
        onClick={handleGoogleSignIn}
        className="px-6 py-3 text-white bg-blue-600 rounded-md hover:bg-blue-700 transition"
      >
        Sign In with Google
      </button>
    </div>
  );
};

export default SignIn;
