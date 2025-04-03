import PropTypes from "prop-types";
import React from "react";

function SettingSection({ userData, handleLogout }) {
  return (
    <div className="space-y-4 m-5">
      {/* User Info Card */}
      <div className="bg-white p-4 border border-neutral-200 rounded-lg shadow-sm">
        <h3 className="font-bold text-lg mb-3">User Information</h3>
        <div className="space-y-2">
          <div className="flex items-center">
            <span className="font-semibold w-24">User ID:</span>
            <span className="text-gray-700 break-all">{userData.id}</span>
          </div>
          <div className="flex items-center">
            <span className="font-semibold w-24">Email:</span>
            <span className="text-gray-700">{userData.email}</span>
          </div>
          <div className="flex items-center">
            <span className="font-semibold w-24">Issued At:</span>
            <span className="text-gray-700">{new Date(userData.iat * 1000).toLocaleString()}</span>
          </div>
          <div className="flex items-center">
            <span className="font-semibold w-24">Expires At:</span>
            <span className="text-gray-700">{new Date(userData.exp * 1000).toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Dark Mode Toggle */}
      <div className="flex justify-between items-center bg-white p-4 border border-neutral-200 rounded-lg shadow-sm">
        <span>Dark Mode</span>
        <button className="bg-neutral-200 px-4 py-2 rounded-lg text-sm hover:bg-neutral-300 transition-all">
          Enable
        </button>
      </div>

      {/* Notifications Toggle */}
      <div className="flex justify-between items-center bg-white p-4 border border-neutral-200 rounded-lg shadow-sm">
        <span>Enable Notifications</span>
        <button className="bg-neutral-200 px-4 py-2 rounded-lg text-sm hover:bg-neutral-300 transition-all">
          Toggle
        </button>
      </div>

      {/* Logout Button */}
      <div className="flex justify-between items-center bg-white p-4 border border-neutral-200 rounded-lg shadow-sm">
        <span>Logout of your account</span>
        <button 
          onClick={handleLogout}
          className="bg-red-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-600 transition-all">
          Logout
        </button>
      </div>
    </div>
  );
}

SettingSection.propTypes = {
  userData: PropTypes.object,
  handleLogout: PropTypes.func.isRequired,
};

export default SettingSection;
