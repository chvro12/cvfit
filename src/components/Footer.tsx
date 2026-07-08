import { Link } from 'react-router'
import { Mail } from 'lucide-react'

export default function Footer() {
  return (
    <footer
      className="w-full text-white pt-16 pb-8 px-6 lg:px-12"
      style={{
        background: 'var(--navy)',
        borderRadius: '24px 24px 0 0',
      }}
    >
      <div className="max-w-content mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-10 lg:gap-8 mb-12">
          {/* Col 1: Logo + Tagline */}
          <div className="flex flex-col gap-4">
            <Link to="/" className="shrink-0">
              <span className="text-subsection tracking-tight">
                <span className="text-white font-bold">CV</span>
                <span className="font-bold" style={{ color: 'var(--coral)' }}>Fit</span>
              </span>
            </Link>
            <p className="text-caption leading-relaxed" style={{ color: 'rgba(255,255,255,0.7)' }}>
              Adaptez votre CV à chaque offre en quelques secondes
            </p>
            <div className="flex items-center gap-3 mt-2">
              <a
                href="mailto:contact@cvfit.fr"
                className="w-9 h-9 rounded-full flex items-center justify-center transition-colors duration-200"
                style={{ background: 'rgba(255,255,255,0.1)' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(248,90,62,0.3)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)' }}
              >
                <Mail size={16} />
              </a>
            </div>
          </div>

          {/* Col 2: Produit */}
          <div className="flex flex-col gap-4">
            <h4 className="text-small font-semibold uppercase tracking-wider text-white mb-1">
              Produit
            </h4>
            <div className="flex flex-col gap-2.5">
              <Link
                to="/"
                className="text-caption transition-colors duration-200"
                style={{ color: 'rgba(255,255,255,0.7)' }}
                onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--coral)' }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.7)' }}
              >
                Accueil
              </Link>
              <Link
                to="/app"
                className="text-caption transition-colors duration-200"
                style={{ color: 'rgba(255,255,255,0.7)' }}
                onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--coral)' }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.7)' }}
              >
                L'outil
              </Link>
              <Link
                to="/tarifs"
                className="text-caption transition-colors duration-200"
                style={{ color: 'rgba(255,255,255,0.7)' }}
                onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--coral)' }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.7)' }}
              >
                Tarifs
              </Link>
              <Link
                to="/a-propos"
                className="text-caption transition-colors duration-200"
                style={{ color: 'rgba(255,255,255,0.5)' }}
              >
                À propos
              </Link>
            </div>
          </div>

          {/* Col 3: Ressources */}
          <div className="flex flex-col gap-4">
            <h4 className="text-small font-semibold uppercase tracking-wider text-white mb-1">
              Ressources
            </h4>
            <div className="flex flex-col gap-2.5">
              <Link to="/optimiser-cv-ats" className="text-caption transition-colors duration-200" style={{ color: 'rgba(255,255,255,0.7)' }}>Optimiser un CV ATS</Link>
              <Link to="/adapter-cv-offre-emploi" className="text-caption transition-colors duration-200" style={{ color: 'rgba(255,255,255,0.7)' }}>Adapter un CV</Link>
              <Link to="/score-ats-cv" className="text-caption transition-colors duration-200" style={{ color: 'rgba(255,255,255,0.7)' }}>Score ATS</Link>
              <Link to="/analyse-offre-emploi" className="text-caption transition-colors duration-200" style={{ color: 'rgba(255,255,255,0.7)' }}>Analyse d’offre</Link>
              <Link to="/lettre-motivation-ia" className="text-caption transition-colors duration-200" style={{ color: 'rgba(255,255,255,0.7)' }}>Lettre de motivation IA</Link>
              <Link to="/preparation-entretien" className="text-caption transition-colors duration-200" style={{ color: 'rgba(255,255,255,0.7)' }}>Préparation entretien</Link>
            </div>
          </div>

          {/* Col 4: Légal */}
          <div className="flex flex-col gap-4">
            <h4 className="text-small font-semibold uppercase tracking-wider text-white mb-1">
              Légal
            </h4>
            <div className="flex flex-col gap-2.5">
              <Link to="/cgu" className="text-caption transition-colors duration-200" style={{ color: 'rgba(255,255,255,0.7)' }}>CGU</Link>
              <Link to="/confidentialite" className="text-caption transition-colors duration-200" style={{ color: 'rgba(255,255,255,0.7)' }}>Confidentialité</Link>
              <Link to="/mentions-legales" className="text-caption transition-colors duration-200" style={{ color: 'rgba(255,255,255,0.7)' }}>Mentions légales</Link>
            </div>
          </div>

          {/* Col 5: Contact */}
          <div className="flex flex-col gap-4">
            <h4 className="text-small font-semibold uppercase tracking-wider text-white mb-1">
              Contact
            </h4>
            <div className="flex flex-col gap-2.5">
              <a
                href="mailto:contact@cvfit.fr"
                className="text-caption transition-colors duration-200"
                style={{ color: 'rgba(255,255,255,0.7)' }}
                onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--coral)' }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.7)' }}
              >
                contact@cvfit.fr
              </a>
              <span
                className="text-caption cursor-default"
                style={{ color: 'rgba(255,255,255,0.5)' }}
              >
                Support
              </span>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div
          className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3"
          style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}
        >
          <p className="text-small" style={{ color: 'rgba(255,255,255,0.5)' }}>
            &copy; 2025 CVFit. Tous droits réservés.
          </p>
          <p className="text-small" style={{ color: 'rgba(255,255,255,0.5)' }}>
            Français
          </p>
        </div>
      </div>
    </footer>
  )
}
