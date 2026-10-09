import { useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { ClipboardList, List, Calendar, MoreHorizontal, LogOut } from 'lucide-react'
import { signOut } from 'firebase/auth'
import { auth } from '../lib/firebase'

const MORE_ITEMS = [
  { label: 'Customers', icon: '👥' },
  { label: 'Items', icon: '🏷️' },
  { label: 'Categories', icon: '📂' },
  { label: 'Vouchers', icon: '🎟️' },
  { label: 'Settings', icon: '⚙️' },
  { label: 'Daily Reports', icon: '📊' },
  { label: 'My Timesheet', icon: '🕐' },
  { label: 'Leave', icon: '🌴' },
]

export default function POSLayout() {
  const navigate = useNavigate()
  const [showMore, setShowMore] = useState(false)

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-gray-100">
      {/* Main content — POS fills all space */}
      <div className="flex-1 overflow-hidden">
        <Outlet />
      </div>

      {/* ── BOTTOM NAV — Sign In/Sign Out | Orders | PickUp | More ── */}
      <div className="relative">
        {/* More menu popup */}
        {showMore && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowMore(false)} />
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 z-50 mb-2 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden w-72">
              <div className="grid grid-cols-2 gap-0">
                {MORE_ITEMS.map((item, i) => (
                  <button key={item.label}
                    onClick={() => setShowMore(false)}
                    className={`flex items-center gap-2.5 px-4 py-3.5 hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700
                      ${i % 2 === 0 ? 'border-r border-gray-100' : ''}
                      ${i < MORE_ITEMS.length - 2 ? 'border-b border-gray-100' : ''}
                    `}>
                    <span>{item.icon}</span>
                    {item.label}
                  </button>
                ))}
              </div>
              <div className="border-t border-gray-100">
                <button onClick={() => signOut(auth)}
                  className="w-full flex items-center gap-2.5 px-4 py-3.5 hover:bg-red-50 transition-colors text-sm font-medium text-red-500">
                  <LogOut size={16} /> Sign Out
                </button>
              </div>
            </div>
          </>
        )}

        {/* Nav bar */}
        <div className="bg-white border-t border-gray-200 flex items-center px-4 py-2 gap-1">
          <button
            onClick={() => navigate('/signin')}
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-gray-600 hover:bg-gray-100 transition-colors text-sm font-medium">
            <ClipboardList size={18} />
            <span>Sign In / Out</span>
          </button>

          <button
            onClick={() => navigate('/orders')}
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-gray-600 hover:bg-gray-100 transition-colors text-sm font-medium">
            <List size={18} />
            <span>Orders</span>
          </button>

          <button
            onClick={() => navigate('/roster')}
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-gray-600 hover:bg-gray-100 transition-colors text-sm font-medium">
            <Calendar size={18} />
            <span>PickUp</span>
          </button>

          <button
            onClick={() => setShowMore(m => !m)}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl transition-colors text-sm font-medium ${
              showMore ? 'bg-navy text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}>
            <MoreHorizontal size={18} />
            <span>More</span>
          </button>
        </div>
      </div>
    </div>
  )
}
