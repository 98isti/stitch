import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import LoginPage from './pages/LoginPage'
import StaffPinPage from './pages/StaffPinPage'
import AppShell from './layouts/AppShell'
import OrdersPage from './pages/OrdersPage'
import POSPage from './pages/POSPage'
import PlaceholderPage from './pages/PlaceholderPage'

function AppRoutes() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-navy flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-tan border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/orders" /> : <LoginPage />} />
      <Route path="/pin" element={<StaffPinPage />} />
      <Route path="/" element={user ? <Navigate to="/pos" /> : <Navigate to="/login" />} />
      <Route element={user ? <AppShell /> : <Navigate to="/login" />}>
        <Route path="/pos" element={<POSPage />} />
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/reports" element={<PlaceholderPage title="Reports" />} />
        <Route path="/signin" element={<PlaceholderPage title="Sign-In Book" />} />
        <Route path="/roster" element={<PlaceholderPage title="Roster" />} />
        <Route path="/staff" element={<PlaceholderPage title="Staff" />} />
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
