import { useEffect, useState } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import './App.css'

import Header from './components/general/Header'
import Toast from './components/general/Toast'
import ScrollToTop from './components/general/ScrollToTop'
import Homepage from './pages/Homepage'
import LoginPage  from './pages/LoginPage'
import Register from './pages/Register'
import NewCafe from './pages/NewCafe'
import AdminPage from './pages/AdminPage'
import RateCafePage from './pages/RateCafePage'
import ProfilePage from './pages/ProfilePage'
import BrowseUserFavesPage from './pages/BrowseUserFavesPage'
import MyAreaPage from './pages/MyAreaPage'
import VerifyEmailPage from './pages/VerifyEmailPage'
import ResendVerificationPage from './pages/ResendVerificationPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import ChangePasswordPage from './pages/ChangePasswordPage'
import NotFoundPage from './pages/NotFoundPage'
import ViewOneCafe from './components/cafes/view_cafes/ViewOneCafe'
import { fetchCurrentUser, logoutCurrentUser } from './components/login/authCache'

function App() {
  const [currentUser, setCurrentUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [notifications, setNotifications] = useState([])

  const refreshCurrentUser = async () => {
    const user = await fetchCurrentUser()
    setCurrentUser(user)
    return user
  }

  useEffect(() => {
    refreshCurrentUser().finally(() => setAuthLoading(false))
  }, [])

  // Fetch (and clear) any one-time toasts once we know a real user is
  // logged in, e.g. after a cafe they added gets auto-verified.
  useEffect(() => {
    if (!currentUser) {
      return
    }

    fetch('/api/me/notifications', { credentials: 'include' })
      .then((response) => response.json())
      .then((data) => setNotifications(data.notifications || []))
      .catch(() => {})
  }, [currentUser])

  const dismissNotification = (index) => {
    setNotifications((prev) => prev.filter((_, i) => i !== index))
  }

  const handleLogout = async () => {
    await logoutCurrentUser()
    setCurrentUser(null)
  }

  return (
    <BrowserRouter>
      <ScrollToTop />
      <Header currentUser={currentUser} />
      <Toast notifications={notifications} onDismiss={dismissNotification} />

      <Routes>
        <Route path="/" element={<Homepage />} />
        <Route path="/login" element={<LoginPage onAuthChange={refreshCurrentUser} />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/resend-verification" element={<ResendVerificationPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route
          path="/change-password"
          element={<ChangePasswordPage currentUser={currentUser} authLoading={authLoading} />}
        />
        <Route path="/newcafe" element={<NewCafe currentUser={currentUser} authLoading={authLoading} />} />
        <Route
          path="/cafes/:id"
          element={<ViewOneCafe currentUser={currentUser} onAuthChange={refreshCurrentUser} />}
        />
        <Route
          path="/cafes/:id/rate"
          element={<RateCafePage currentUser={currentUser} authLoading={authLoading} />}
        />
        <Route
          path="/cafes/:id/rate/:categoryId"
          element={<RateCafePage currentUser={currentUser} authLoading={authLoading} />}
        />
        <Route path="/admin" element={<AdminPage currentUser={currentUser} authLoading={authLoading} />} />
        <Route path="/users/:username" element={<ProfilePage currentUser={currentUser} />} />
        <Route path="/browse-user-faves" element={<BrowseUserFavesPage />} />
        <Route
          path="/my-area"
          element={
            <MyAreaPage
              currentUser={currentUser}
              authLoading={authLoading}
              onAuthChange={refreshCurrentUser}
              onLogout={handleLogout}
            />
          }
        />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
