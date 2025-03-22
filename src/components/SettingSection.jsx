import PropTypes from 'prop-types';
import React from 'react';

function SettingSection({ userData }) {
  return (
    <div className="space-y-4">
      {/* Dump signed in user data */}
      <div className="bg-white p-4 border border-neutral-200 rounded-lg shadow-sm">
        <h3 className="font-bold mb-2">User Data</h3>
        <pre className="text-xs bg-gray-100 p-2 rounded">
          {JSON.stringify(userData, null, 2)}
        </pre>
      </div>

      <div className="flex justify-between items-center bg-white p-4 border border-neutral-200 rounded-lg shadow-sm">
        <span>Dark Mode</span>
        <button className="bg-neutral-200 px-4 py-2 rounded-lg text-sm hover:bg-neutral-300 transition-all">
          Enable
        </button>
      </div>
      <div className="flex justify-between items-center bg-white p-4 border border-neutral-200 rounded-lg shadow-sm">
        <span>Enable Notifications</span>
        <button className="bg-neutral-200 px-4 py-2 rounded-lg text-sm hover:bg-neutral-300 transition-all">
          Toggle
        </button>
      </div>
    </div>
  );
}

SettingSection.propTypes = {
  userData: PropTypes.object,
};

export default SettingSection;
