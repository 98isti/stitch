import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { PrinterProvider } from './context/PrinterContext'
import { StaffProvider } from './context/StaffContext'
import LoginPage from './pages/LoginPage'
import SignUpPage from './pages/SignUpPage'
import ExtrasPage from './pages/ExtrasPage'
import LeavePage from './pages/LeavePage'
import QuickItemsPage from './pages/QuickItemsPage'
import StaffPinPage from './pages/StaffPinPage'
import OnboardingPage from './pages/OnboardingPage'
import LocationSetupPage from './pages/LocationSetupPage'
import DeviceSetupPage, { DEVICE_MODE_KEY } from './pages/DeviceSetupPage'
import DashboardPage from './pages/DashboardPage'
import ManagementOrdersPage from './pages/ManagementOrdersPage'
import ManagementReportPage from './pages/ManagementReportPage'
import ManagementSignInPage from './pages/ManagementSignInPage'
import ManagementMorePage from './pages/ManagementMorePage'
import ManagementLayout from './layouts/ManagementLayout'
import POSLayout from './layouts/POSLayout'
import POSPage from './pages/POSPage'
import OrdersPage from './pages/OrdersPage'
import OrderDetailPage from './pages/OrderDetailPage'
import EditOrderPage from './pages/EditOrderPage'
import TodaysDuePage from './pages/TodaysDuePage'
import StaffPage from './pages/StaffPage'
import SignInPage from './pages/SignInPage'
import SettingsPage from './pages/SettingsPage'
import CategoriesPage from './pages/CategoriesPage'
import ItemsPage from './pages/ItemsPage'
import CustomersPage from './pages/CustomersPage'
import LocationsPage from './pages/LocationsPage'
import VouchersPage from './pages/VouchersPage'
import BillingPage from './pages/BillingPage'
import AdminPage from './pages/AdminPage'
import PlaceholderPage from './pages/PlaceholderPage'
import ReportsPage from './pages/ReportsPage'
import PickUpPage from './pages/PickUpPage'
import PickupCalendarPage from './pages/PickupCalendarPage'
import TeamPerformancePage from './pages/TeamPerformancePage'
import RosterPage from './pages/RosterPage'
import ManagementLeavePage from './pages/ManagementLeavePage'
import ManagementPayrollPage from './pages/ManagementPayrollPage'
import AvgSalesPage from './pages/AvgSalesPage'
import AvgSalesByDayPage from './pages/AvgSalesByDayPage'

function AppRoutes() {
  const { user, loading, onboarded } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-navy flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-tan border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" /> : <LoginPage />} />
      <Route path="/signup" element={user ? <Navigate to="/" /> : <SignUpPage />} />
      <Route path="/pin" element={<StaffPinPage />} />
      <Route path="/location-setup" element={
        !user ? <Navigate to="/login" /> :
        !onboarded ? <Navigate to="/onboarding" /> :
        <LocationSetupPage />
      } />
      <Route path="/onboarding" element={
        !user ? <Navigate to="/login" /> :
        onboarded ? <Navigate to="/pos" /> :
        <OnboardingPage />
      } />
      <Route path="/" element={
        !user ? <Navigate to="/login" /> :
        !onboarded ? <Navigate to="/onboarding" /> :
        (() => {
          const mode = localStorage.getItem(DEVICE_MODE_KEY)
          if (mode === 'management') return <Navigate to="/dashboard" />
          return <Navigate to="/pos" />
        })()
      } />

      <Route path="/device-setup" element={
        !user ? <Navigate to="/login" /> :
        !onboarded ? <Navigate to="/onboarding" /> :
        <DeviceSetupPage />
      } />

      <Route element={user && onboarded ? <ManagementLayout /> : <Navigate to="/" />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/mgmt-orders" element={<ManagementOrdersPage />} />
        <Route path="/mgmt-report" element={<ManagementReportPage />} />
        <Route path="/mgmt-team" element={<ManagementSignInPage />} />
        <Route path="/mgmt-more" element={<ManagementMorePage />} />
        <Route path="/mgmt-pickup-calendar" element={<PickupCalendarPage />} />
        <Route path="/mgmt-team-performance" element={<TeamPerformancePage />} />
        <Route path="/mgmt-roster" element={<RosterPage />} />
        <Route path="/mgmt-leave" element={<ManagementLeavePage />} />
        <Route path="/mgmt-payroll" element={<ManagementPayrollPage />} />
        <Route path="/mgmt-avg-sales" element={<AvgSalesPage />} />
        <Route path="/mgmt-avg-by-day" element={<AvgSalesByDayPage />} />
      </Route>

      <Route element={user && onboarded ? <POSLayout /> : <Navigate to="/" />}>
        <Route path="/pos"               element={<POSPage />} />
        <Route path="/orders"            element={<OrdersPage />} />
        <Route path="/orders/:id"        element={<OrderDetailPage />} />
        <Route path="/orders/:id/edit"   element={<EditOrderPage />} />
        <Route path="/todaysdue"         element={<TodaysDuePage />} />
        <Route path="/signin"            element={<SignInPage />} />
        <Route path="/staff"             element={<StaffPage />} />
        <Route path="/settings"          element={<SettingsPage />} />
        <Route path="/categories"        element={<CategoriesPage />} />
        <Route path="/items"             element={<ItemsPage />} />
        <Route path="/customers"         element={<CustomersPage />} />
        <Route path="/locations"         element={<LocationsPage />} />
        <Route path="/vouchers"          element={<VouchersPage />} />
        <Route path="/extras"             element={<ExtrasPage />} />
        <Route path="/quick-items"         element={<QuickItemsPage />} />
        <Route path="/pickup"            element={<PickUpPage />} />
        <Route path="/roster"            element={<PlaceholderPage title="Roster" />} />
        <Route path="/reports"           element={<ReportsPage />} />
        <Route path="/timesheet"         element={<PlaceholderPage title="My Timesheet" />} />
        <Route path="/leave"             element={<LeavePage />} />
        <Route path="/billing"           element={<BillingPage />} />
        <Route path="/admin"             element={<AdminPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  )
}

export default function App() {
  return (
    <PrinterProvider>
      <AuthProvider>
        <StaffProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </StaffProvider>
      </AuthProvider>
    </PrinterProvider>
  )
}