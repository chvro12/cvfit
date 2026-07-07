import { Routes, Route } from 'react-router'
import Layout from './components/Layout'
import Home from './pages/Home'
import Dashboard from './pages/Dashboard'
import Pricing from './pages/Pricing'
import Auth from './pages/Auth'
import Admin from './pages/Admin'

export default function App() {
  return (
    <Routes>
      <Route path="/admin" element={<Admin />} />
      <Route path="*" element={
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/app" element={<Dashboard />} />
            <Route path="/tarifs" element={<Pricing />} />
            <Route path="/connexion" element={<Auth />} />
          </Routes>
        </Layout>
      } />
    </Routes>
  )
}
