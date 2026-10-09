import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import LoginPage from './pages/LoginPage'
import StaffPinPage from './pages/StaffPinPage'
import OnboardingPage from './pages/OnboardingPage'
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
      <Route path="/pin" element={<StaffPinPage />} />
      <Route path="/onboarding" element={
        !user ? <Navigate to="/login" /> :
        onboarded ? <Navigate to="/pos" /> :
        <OnboardingPage />
      } />
      <Route path="/" element={
        !user ? <Navigate to="/login" /> :
        !onboarded ? <Navigate to="/onboarding" /> :
        <Navigate to="/pos" />
      } />

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
        <Route path="/roster"            element={<PlaceholderPage title="PickUp Calendar" />} />
        <Route path="/reports"           element={<PlaceholderPage title="Reports" />} />
        <Route path="/timesheet"         element={<PlaceholderPage title="My Timesheet" />} />
        <Route path="/leave"             element={<PlaceholderPage title="Leave" />} />
        <Route path="/billing"           element={<BillingPage />} />
        <Route path="/admin"             element={<AdminPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  )
}
