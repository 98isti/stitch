import { useNavigate } from 'react-router-dom'
import { getAuth, signOut } from 'firebase/auth'
import { DEVICE_MODE_KEY } from './DeviceSetupPage'
import {
  Users, Settings, Calendar, Tag, UserCircle,
  Ticket, CreditCard, LogOut, RefreshCw
} from 'lucide-react'

const ITEMS = [
  { label: 'Staff',          icon: Users,       path: '/staff' },
  { label: 'Pick-Up Calendar', icon: Calendar,  path: '/pickup' },
  { label: 'Customers',      icon: UserCircle,  path: '/customers' },
  { label: 'Vouchers',       icon: Ticket,      path: '/vouchers' },
  { label: 'Categories',     icon: Tag,         path: '/categories' },
  { label: 'Settings',       icon: Settings,    path: '/settings' },
  { label: 'Billing',        icon: CreditCard,  path: '/billing' },
]

export default function ManagementMorePage() {
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut(getAuth())
    // Keep device mode — just clear auth session
    navigate('/login', { replace: true })
  }

  function handleResetDevice() {
    if (!confirm('Reset this device? You\'ll be asked to choose shop terminal or management again.')) return
    localStorage.removeItem(DEVICE_MODE_KEY)
    localStorage.removeItem('stitch_active_location')
    signOut(getAuth()).then(() => navigate('/login', { replace: true }))
  }

  return (
    <div className="flex flex-col h-full bg-gray-50 overflow-y-auto">
      <div className="px-4 pt-6 pb-2">
        <h1 className="text-2xl font-bold text-gray-900">More</h1>
      </div>

      <div className="px-4 mt-4">
        <div className="bg-white rounded-2xl shadow-sm divide-y divide-gray-100 overflow-hidden">
          {ITEMS.map(item => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className="w-full flex items-center gap-3 px-4 py-4 hover:bg-gray-50 transition-colors text-left"
            >
              <item.icon size={20} className="text-gray-500 flex-shrink-0" />
              <span className="text-sm font-medium text-gray-900">{item.label}</span>
            </button>
          ))}
        </div>

        {/* Sign out + reset */}
        <div className="bg-white rounded-2xl shadow-sm divide-y divide-gray-100 overflow-hidden mt-4">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-4 py-4 hover:bg-gray-50 transition-colors text-left"
          >
            <LogOut size={20} className="text-gray-500" />
            <span className="text-sm font-medium text-gray-900">Sign out</span>
          </button>
          <button
            onClick={handleResetDevice}
            className="w-full flex items-center gap-3 px-4 py-4 hover:bg-gray-50 transition-colors text-left"
          >
            <RefreshCw size={20} className="text-gray-400" />
            <span className="text-sm font-medium text-gray-400">Reset this device</span>
          </button>
        </div>
      </div>
    </div>
  )
}
