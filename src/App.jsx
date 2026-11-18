import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useAuth } from './context/AuthContext'
import AppLayout from './components/AppLayout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Simulator from './pages/Simulator'
import History from './pages/History'
import Reports from './pages/Reports'
import Configs from './pages/Configs'
import Profile from './pages/Profile'
import Admin from './pages/Admin'
import Loader from './components/Loader'

/** Transição suave entre telas */
function Page({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.28, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  )
}

export default function App() {
  const { session, profile, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-100 dark:bg-deep-900">
        <Loader label="Conectando ao PRISMA..." />
      </div>
    )
  }

  if (!session) {
    return (
      <AnimatePresence mode="wait">
        <Routes location={location} key="auth">
          <Route path="/login" element={<Login />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AnimatePresence>
    )
  }

  return (
    <AppLayout>
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<Page><Dashboard /></Page>} />
          <Route path="/simulador" element={<Page><Simulator /></Page>} />
          <Route path="/historico" element={<Page><History /></Page>} />
          <Route path="/relatorios" element={<Page><Reports /></Page>} />
          <Route path="/configuracoes" element={<Page><Configs /></Page>} />
          <Route path="/perfil" element={<Page><Profile /></Page>} />
          <Route
            path="/admin"
            element={
              profile?.role === 'superadmin' ? (
                <Page><Admin /></Page>
              ) : (
                <Navigate to="/" replace />
              )
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AnimatePresence>
    </AppLayout>
  )
}
