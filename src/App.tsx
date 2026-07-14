import {BrowserRouter, Route, Routes} from 'react-router'
import MainLayout from './components/core/MainLayout'
import ProtectedRoute from './components/core/ProtectedRoute'
import PageHome from './pages/PageHome'
import PageComponents from './pages/PageComponents'
import PageRefundDetails from './pages/PageRefundDetails'
import PageSuccess from './pages/PageSuccess'
import PageLogin from './pages/PageLogin'
import PageRegister from './pages/PageRegister'
import { AuthProvider } from './context/AuthContext'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
      <Routes>
        <Route path="/login" element={<PageLogin />} />
        <Route path="/register" element={<PageRegister />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<MainLayout/>}>
            <Route path="/" element={<PageHome />} />
            <Route path="/refunds/:id" element={<PageRefundDetails />} />
            <Route path="/success" element={<PageSuccess />} />
            <Route path="/components" element={<PageComponents />} />
          </Route>
        </Route>
      </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
