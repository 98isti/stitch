import { useNavigate } from 'react-router-dom'
import { getAuth, signOut } from 'firebase/auth'
import { DEVICE_MODE_KEY } from './DeviceSetupPage'
import {
  Users, Settings, Calendar, UserCircle,
  Ticket, CreditCard, LogOut, RefreshCw, TrendingUp, CalendarDays, UmbrellaOff, DollarSign, BarChart3, ClipboardList
} from 'lucide-react'

const SECTIONS = [
  {
    title: 'Operations',
    items: [
      { label: 'Pick-Up Calendar', icon: Calendar,    path: '/mgmt-pickup-calendar' },
      { label: 'Team Performance', icon: TrendingUp,  path: '/mgmt-team-performance' },
      { label: 'Labour %',         icon: ClipboardList, path: '/mgmt-labour' },
      { label: 'Daily Sales',       icon: BarChart3,     path: '/mgmt-daily-sales' },
      { label: 'Customers',        icon: UserCircle,  path: '/customers' },
      { label: 'Vouchers',         icon: Ticket,      path: '/vouchers' },
    ],
  },
  {
    title: 'Team',
    items: [
      { label: 'Staff',            icon: Users,        path: '/staff' },
      { label: 'Payroll',          icon: DollarSign,   path: '/mgmt-payroll' },
      { label: 'Roster',           icon: CalendarDays, path: '/mgmt-roster' },
      { label: 'Leave Requests',   icon: UmbrellaOff,  path: '/mgmt-leave' },
    ],
  },
  {
    title: 'Analytics',
    items: [
      { label: 'Avg Sales',        icon: BarChart3,    path: '/mgmt-avg-sales' },
      { label: 'Avg by Day',       icon: BarChart3,    path: '/mgmt-avg-by-day' },
      { label: 'Monthly Averages', icon: BarChart3,    path: '/mgmt-monthly-avg' },
      { label: 'OCR',              icon: BarChart3,    path: '/mgmt-ocr' },
    ],
  },
  {
    title: 'System',
    items: [
      { label: 'Settings',         icon: Settings,    path: '/settings' },
      { label: 'Billing',          icon: CreditCard,  path: '/billing' },
    ],
  },
]

export default function ManagementMorePage() {
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut(getAuth())
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

      <div className="px-4 mt-4 space-y-6 pb-6">
        {SECTIONS.map(section => (
          <div key={section.title}>
            {/* Section header */}
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-1 mb-2">
              {section.title}
            </p>
            <div className="bg-white rounded-2xl shadow-sm divide-y divide-gray-100 overflow-hidden">
              {section.items.map(item => (
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
          </div>
        ))}

        {/* Sign out + reset */}
        <div className="bg-white rounded-2xl shadow-sm divide-y divide-gray-100 overflow-hidden">
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
