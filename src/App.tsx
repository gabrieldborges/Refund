import {BrowserRouter, Route, Routes} from 'react-router'
import MainLayout from './components/core/MainLayout'
import PageHome from './pages/PageHome'
import PageComponents from './pages/PageComponents'

export default function App() {
  return (
    <BrowserRouter>
    <Routes>
      <Route element={<MainLayout/>}>
        <Route path="/" element={<PageHome />} />
        <Route path="/components" element={<PageComponents />} />
      </Route>
    </Routes>
    </BrowserRouter>
  )
}