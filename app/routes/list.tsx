import { NavLink, Outlet } from "@remix-run/react";

export default function Index() {
  return (
    <>
      <aside
        className="fixed top-0 left-0 w-40 h-screen border-r border-gray-200"
        aria-label="Sidebar"
      >
        <div className="h-full px-3 py-4 overflow-y-auto">
          <ul className="space-y-2">
            <li className="border-b border-gray-200">
              <NavLink
                to="/list/today"
                className={({ isActive }) => {
                  return `flex group grow p-2 border-b-2 rounded-t-lg ${
                    isActive
                      ? "text-blue-600 border-blue-600 active"
                      : "border-transparent hover:text-gray-600 hover:border-gray-300"
                  }`;
                }}
              >
                🚀 今日の予定
              </NavLink>
            </li>
            <li className="border-b border-gray-200">
              <NavLink
                to="/list/all"
                className={({ isActive }) => {
                  return `flex group grow p-2 border-b-2 rounded-t-lg ${
                    isActive
                      ? "text-blue-600 border-blue-600 active"
                      : "border-transparent hover:text-gray-600 hover:border-gray-300"
                  }`;
                }}
              >
                🎮 タスク
              </NavLink>
            </li>
            <li className="border-b border-gray-200">
              <NavLink
                to="/list/planned"
                className={({ isActive }) => {
                  return `flex group grow p-2 border-b-2 rounded-t-lg ${
                    isActive
                      ? "text-blue-600 border-blue-600 active"
                      : "border-transparent hover:text-gray-600 hover:border-gray-300"
                  }`;
                }}
              >
                🗓 今後の予定
              </NavLink>
            </li>
          </ul>
        </div>
      </aside>
      <div className="ml-44">
        <Outlet />
      </div>
    </>
  );
}
