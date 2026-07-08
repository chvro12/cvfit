import { Link } from 'react-router'
import { motion } from 'framer-motion'
import { CheckCircle } from 'lucide-react'

const easeOutExpo = [0.16, 1, 0.3, 1] as [number, number, number, number]

const includedFeatures = [
  'Adaptation de CV avec OpenAI',
  'Extraction des mots-clés de l\'offre',
  'Score ATS avant / après',
  'Éditeur de CV et export PDF',
]

export default function Pricing() {
  return (
    <div className="w-full min-h-[70vh]" style={{ background: 'var(--off-white)' }}>
      <section className="max-w-[760px] mx-auto px-6 lg:px-12 py-16 sm:py-24 text-center">
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: easeOutExpo }}
          className="text-small font-semibold uppercase tracking-[0.1em]"
          style={{ color: 'var(--coral)' }}
        >
          Tarification
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.05, ease: easeOutExpo }}
          className="text-section-mobile sm:text-section-tablet lg:text-section mt-3"
          style={{ color: 'var(--navy)' }}
        >
          Le plan payant arrive bientôt
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: easeOutExpo }}
          className="text-body-large mt-4"
          style={{ color: 'var(--text-gray)' }}
        >
          Pour le moment, CVFit reste ouvert pendant la phase de lancement. La facturation et les abonnements seront ajoutés plus tard.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.18, ease: easeOutExpo }}
          className="mt-10 bg-white border border-mid-gray rounded-[20px] p-8 text-left"
        >
          <h2 className="text-card-title text-navy mb-5">Disponible maintenant</h2>
          <ul className="flex flex-col gap-3">
            {includedFeatures.map(feature => (
              <li key={feature} className="flex items-center gap-3">
                <CheckCircle size={18} className="shrink-0" style={{ color: 'var(--success)' }} />
                <span className="text-body" style={{ color: 'var(--dark-gray)' }}>{feature}</span>
              </li>
            ))}
          </ul>
          <Link
            to="/app"
            className="mt-8 inline-flex justify-center text-button text-white px-7 py-3.5 rounded-[12px] transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            style={{ background: 'var(--coral)', boxShadow: '0 4px 16px rgba(248,90,62,0.25)' }}
          >
            Adapter mon CV
          </Link>
        </motion.div>
      </section>
    </div>
  )
}
