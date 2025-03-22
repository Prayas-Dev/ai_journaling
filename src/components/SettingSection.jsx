import React from 'react';
import Switch from './Switch';

function SettingSection() {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center bg-white p-4 border border-neutral-200 rounded-lg shadow-sm">
        <span>Dark Mode</span>
        <Switch />
      </div>
      <div className="flex justify-between items-center bg-white p-4 border border-neutral-200 rounded-lg shadow-sm">
        <span>Enable Notifications</span>
        <button className="bg-neutral-200 px-4 py-2 rounded-lg text-sm hover:bg-neutral-300 transition-all">Toggle</button>
      </div>
    </div>
  );
}

export default SettingSection;
