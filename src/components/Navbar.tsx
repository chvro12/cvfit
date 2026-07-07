import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router'
import { Menu, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const easeOutExpo = [0.16, 1, 0.3, 1] as [number, number, number, number]

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  const scrollToSection = (id: string) => {
    if (location.pathname !== '/') {
      return
    }
    const el = document.getElementById(id)
    if (el) {
      const offset = 80
      const top = el.getBoundingClientRect().top + window.scrollY - offset
      window.scrollTo({ top, behavior: 'smooth' })
    }
    setMobileOpen(false)
  }

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 h-[68px] flex items-center transition-shadow duration-300"
      style={{
        background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(224,224,224,0.5)',
        boxShadow: scrolled ? '0 2px 12px rgba(0,0,0,0.06)' : 'none',
      }}
    >
      <div className="max-w-content mx-auto w-full px-6 lg:px-12 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center shrink-0">
          <span className="text-subsection tracking-tight">
            <span className="text-navy font-bold">CV</span>
            <span className="text-coral font-bold">Fit</span>
          </span>
        </Link>

        {/* Desktop Nav Links */}
        <div className="hidden md:flex items-center gap-8 absolute left-1/2 -translate-x-1/2">
          <Link
            to="/"
            className="text-nav text-navy hover:text-coral transition-colors duration-200"
          >
            Accueil
          </Link>
          <button
            onClick={() => scrollToSection('comment-ca-marche')}
            className="text-nav text-navy hover:text-coral transition-colors duration-200 cursor-pointer bg-transparent border-none"
          >
            Comment ça marche
          </button>
          <button
            onClick={() => scrollToSection('tarifs')}
            className="text-nav text-navy hover:text-coral transition-colors duration-200 cursor-pointer bg-transparent border-none"
          >
            Tarifs
          </button>
        </div>

        {/* Desktop CTAs */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            to="/connexion"
            className="text-button text-navy px-5 py-2.5 rounded-[10px] hover:bg-navy-50 transition-all duration-200"
          >
            Se connecter
          </Link>
          <Link
            to="/app"
            className="text-button text-white px-5 py-2 rounded-[12px] transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            style={{
              background: 'var(--coral)',
              boxShadow: 'none',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--coral-dark)'
              e.currentTarget.style.boxShadow = '0 4px 16px rgba(248,90,62,0.35)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--coral)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            Commencer
          </Link>
        </div>

        {/* Mobile Hamburger */}
        <button
          className="md:hidden p-2 text-navy"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: easeOutExpo }}
            className="md:hidden absolute top-[68px] left-0 right-0 overflow-hidden"
            style={{
              background: 'rgba(255,255,255,0.98)',
              backdropFilter: 'blur(12px)',
              borderBottom: '1px solid rgba(224,224,224,0.5)',
            }}
          >
            <div className="px-6 py-6 flex flex-col gap-4">
              <Link
                to="/"
                className="text-nav text-navy py-2 hover:text-coral transition-colors"
              >
                Accueil
              </Link>
              <button
                onClick={() => scrollToSection('comment-ca-marche')}
                className="text-nav text-navy py-2 hover:text-coral transition-colors text-left bg-transparent border-none cursor-pointer"
              >
                Comment ça marche
              </button>
              <button
                onClick={() => scrollToSection('tarifs')}
                className="text-nav text-navy py-2 hover:text-coral transition-colors text-left bg-transparent border-none cursor-pointer"
              >
                Tarifs
              </button>
              <hr className="border-mid-gray my-2" />
              <Link
                to="/connexion"
                className="text-button text-navy py-2.5 text-center rounded-[10px] hover:bg-navy-50 transition-all"
              >
                Se connecter
              </Link>
              <Link
                to="/app"
                className="text-button text-white py-2.5 text-center rounded-[12px] transition-all"
                style={{ background: 'var(--coral)' }}
              >
                Commencer
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  )
}
