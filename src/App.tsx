import { Routes, Route } from 'react-router'
import Layout from './components/Layout'
import Home from './pages/Home'
import Dashboard from './pages/Dashboard'
import Pricing from './pages/Pricing'
import Auth from './pages/Auth'
import Admin from './pages/Admin'
import Espace from './pages/Espace'
import Legal from './pages/Legal'
import SeoLanding from './pages/SeoLanding'
import Seo from './components/Seo'

export default function App() {
  return (
    <Routes>
      <Route path="/admin" element={<Admin />} />
      <Route path="*" element={
        <Layout>
          <Seo />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/app" element={<Dashboard />} />
            <Route path="/espace" element={<Espace />} />
            <Route path="/adaptations" element={<Espace />} />
            <Route path="/bibliotheque-cv" element={<Espace />} />
            <Route path="/lettres-motivation" element={<Espace />} />
            <Route path="/candidatures" element={<Espace />} />
            <Route path="/tarifs" element={<Pricing />} />
            <Route path="/connexion" element={<Auth />} />
            <Route path="/optimiser-cv-ats" element={<SeoLanding />} />
            <Route path="/adapter-cv-offre-emploi" element={<SeoLanding />} />
            <Route path="/score-ats-cv" element={<SeoLanding />} />
            <Route path="/lettre-motivation-ia" element={<SeoLanding />} />
            <Route path="/preparation-entretien" element={<SeoLanding />} />
            <Route path="/analyse-offre-emploi" element={<SeoLanding />} />
            <Route path="/a-propos" element={<Legal />} />
            <Route path="/cgu" element={<Legal />} />
            <Route path="/confidentialite" element={<Legal />} />
            <Route path="/mentions-legales" element={<Legal />} />
          </Routes>
        </Layout>
      } />
    </Routes>
  )
}
