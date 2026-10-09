import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import LoginPage from './pages/LoginPage'
import StaffPinPage from './pages/StaffPinPage'
import OnboardingPage from './pages/OnboardingPage'
import POSLayout from './layouts/POSLayout'
import POSPage from './pages/POSPage'
import OrdersPage from './pages/OrdersPage'
import PlaceholderPage from './pages/PlaceholderPage'
import OrderDetailPage from './pages/OrderDetailPage'
import EditOrderPage from './pages/EditOrderPage'
import TodaysDuePage from './pages/TodaysDuePage'

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

      {/* All app screens — POSLayout (full screen, back button nav) */}
      <Route element={user && onboarded ? <POSLayout /> : <Navigate to="/" />}>
        <Route path="/pos"        element={<POSPage />} />
        <Route path="/orders"     element={<OrdersPage />} />
        <Route path="/orders/:id"  element={<OrderDetailPage />} />
        <Route path="/orders/:id/edit" element={<EditOrderPage />} />
        <Route path="/todaysdue"   element={<TodaysDuePage />} />
        <Route path="/signin"     element={<PlaceholderPage title="Sign In / Sign Out" />} />
        <Route path="/roster"     element={<PlaceholderPage title="PickUp Calendar" />} />
        <Route path="/reports"    element={<PlaceholderPage title="Reports" />} />
        <Route path="/staff"      element={<PlaceholderPage title="Staff" />} />
        <Route path="/customers"  element={<PlaceholderPage title="Customers" />} />
        <Route path="/items"      element={<PlaceholderPage title="Items" />} />
        <Route path="/categories" element={<PlaceholderPage title="Categories" />} />
        <Route path="/vouchers"   element={<PlaceholderPage title="Vouchers" />} />
        <Route path="/settings"   element={<PlaceholderPage title="Settings" />} />
        <Route path="/timesheet"  element={<PlaceholderPage title="My Timesheet" />} />
        <Route path="/leave"      element={<PlaceholderPage title="Leave" />} />
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
