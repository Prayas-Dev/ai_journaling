import React from 'react';
import { NavLink } from 'react-router-dom';

function NavItem({ icon: Icon, label, to }) {
  return (
    <div className="relative group w-full">
      <NavLink
        to={to}
        className={({ isActive }) =>
          `p-2 w-full rounded-lg flex items-center space-x-3 transition-colors duration-200 
          ${isActive ? "bg-blue-500 text-white" : "hover:bg-neutral-100"}`
        }
      >
        <Icon className="w-6 h-6 mx-auto" />
      </NavLink>
      <span className="absolute left-16 top-1/2 -translate-y-1/2 px-2 py-1 text-sm bg-black text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        {label}
      </span>
    </div>
  );
}

export default NavItem;
