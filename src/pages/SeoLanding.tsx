import { Link, useLocation } from 'react-router'
import { ArrowRight, CheckCircle2 } from 'lucide-react'
import { seoPages } from '../lib/seo'

type LandingPage = {
  eyebrow: string
  h1: string
  intro: string
  sections: Array<{
    title: string
    body: string
    points: string[]
  }>
  faq: Array<{ question: string; answer: string }>
  cta: string
}

const landingPages: Record<string, LandingPage> = {
  '/optimiser-cv-ats': {
    eyebrow: 'Optimisation ATS',
    h1: 'Optimiser un CV ATS sans dénaturer son parcours',
    intro: 'Un bon CV ATS doit rester lisible par un recruteur et par les logiciels de tri. CVFit vous aide à aligner vos formulations avec l’offre, tout en gardant des informations honnêtes et vérifiables.',
    cta: 'Optimiser mon CV',
    sections: [
      {
        title: 'Ce que les ATS cherchent vraiment',
        body: 'Les ATS comparent souvent l’offre et le CV à partir de critères simples : intitulés de poste, compétences, outils, certifications, niveau d’expérience et vocabulaire métier. Un CV trop visuel ou trop vague peut perdre des informations importantes.',
        points: ['Mots-clés présents dans l’offre', 'Structure claire avec sections standard', 'Expériences reliées aux missions attendues'],
      },
      {
        title: 'Comment CVFit intervient',
        body: 'L’outil analyse l’offre, extrait les attentes fortes et propose des reformulations ciblées. Vous gardez la main sur les changements avant l’export.',
        points: ['Analyse de l’offre d’emploi', 'Comparaison avec le contenu du CV', 'Suggestions de résumé, expériences et compétences'],
      },
    ],
    faq: seoPages['/optimiser-cv-ats'].faqs ?? [],
  },
  '/adapter-cv-offre-emploi': {
    eyebrow: 'Candidature ciblée',
    h1: 'Adapter son CV à une offre d’emploi',
    intro: 'Envoyer le même CV partout réduit souvent la pertinence de la candidature. L’objectif n’est pas de tout réécrire, mais de montrer plus clairement les expériences qui répondent à l’offre.',
    cta: 'Adapter un CV',
    sections: [
      {
        title: 'Partir de l’offre, pas d’un CV générique',
        body: 'Une offre indique les missions, compétences, outils et critères prioritaires. En partant de ce texte, vous pouvez ajuster le profil, les compétences et les bullet points les plus importants.',
        points: ['Missions principales', 'Compétences techniques et métier', 'Niveau attendu et contexte de l’entreprise'],
      },
      {
        title: 'Rester fidèle au parcours',
        body: 'CVFit reformule, synthétise et priorise les informations existantes. Les suggestions doivent rester cohérentes avec vos expériences réelles.',
        points: ['Pas d’expérience inventée', 'Formulations plus précises', 'Ordre des informations plus pertinent'],
      },
    ],
    faq: seoPages['/adapter-cv-offre-emploi'].faqs ?? [],
  },
  '/score-ats-cv': {
    eyebrow: 'Score ATS',
    h1: 'Comprendre et améliorer son score ATS',
    intro: 'Le score ATS donne une indication utile, mais il ne remplace pas la qualité du parcours. CVFit l’utilise comme repère pour améliorer la correspondance entre votre CV et l’offre.',
    cta: 'Analyser mon score',
    sections: [
      {
        title: 'Pourquoi le score varie',
        body: 'Deux offres proches peuvent utiliser des mots-clés différents. Le score dépend aussi du niveau de détail de votre CV et du format exporté.',
        points: ['Présence des compétences demandées', 'Clarté du fichier', 'Cohérence entre titre, profil et expériences'],
      },
      {
        title: 'Ce qu’il faut améliorer en priorité',
        body: 'La meilleure optimisation consiste à clarifier ce qui existe déjà : outils utilisés, résultats obtenus, périmètre des missions et vocabulaire attendu par le recruteur.',
        points: ['Résumé professionnel ciblé', 'Bullet points orientés impact', 'Compétences regroupées proprement'],
      },
    ],
    faq: seoPages['/score-ats-cv'].faqs ?? [],
  },
  '/lettre-motivation-ia': {
    eyebrow: 'Lettre de motivation',
    h1: 'Créer une lettre de motivation IA contextualisée',
    intro: 'Une lettre utile doit relier l’offre, l’entreprise et votre parcours. CVFit génère une base personnalisée à partir de votre CV et du poste visé.',
    cta: 'Créer une lettre',
    sections: [
      {
        title: 'Éviter les textes génériques',
        body: 'Une bonne lettre reprend les enjeux de l’offre et explique pourquoi votre profil répond à ces besoins, sans phrases creuses.',
        points: ['Accroche adaptée au poste', 'Arguments issus du CV', 'Ton professionnel et naturel'],
      },
      {
        title: 'Garder le contrôle',
        body: 'La génération sert de base de travail. Vous pouvez ajuster le ton, raccourcir certains passages et valider les informations avant l’envoi.',
        points: ['Contenu modifiable', 'Cohérence avec le CV optimisé', 'Formulation non littérale'],
      },
    ],
    faq: [
      {
        question: 'Une lettre générée par IA est-elle détectable ?',
        answer: 'Le risque vient surtout des textes vagues et répétitifs. CVFit privilégie une lettre contextualisée, que l’utilisateur doit relire et personnaliser.',
      },
      {
        question: 'La lettre reprend-elle l’offre d’emploi ?',
        answer: 'Oui, elle s’appuie sur l’offre et le CV pour construire des arguments cohérents avec le poste.',
      },
    ],
  },
  '/preparation-entretien': {
    eyebrow: 'Entretien',
    h1: 'Préparer un entretien à partir d’une offre',
    intro: 'Après l’optimisation du CV, CVFit peut aider à préparer les questions probables, les points forts à défendre et les exemples à mobiliser.',
    cta: 'Préparer mon entretien',
    sections: [
      {
        title: 'Anticiper les questions',
        body: 'L’offre permet d’identifier les sujets que le recruteur risque d’explorer : compétences clés, expériences passées, résultats et motivation.',
        points: ['Questions probables', 'Angles de réponse', 'Points faibles à préparer'],
      },
      {
        title: 'Relier les réponses au CV',
        body: 'Les réponses sont plus solides quand elles s’appuient sur des expériences concrètes. CVFit vous aide à retrouver les éléments pertinents dans votre parcours.',
        points: ['Exemples issus du CV', 'Réponses structurées', 'Arguments adaptés au poste'],
      },
    ],
    faq: [
      {
        question: 'La préparation entretien utilise-t-elle mon CV ?',
        answer: 'Oui, elle s’appuie sur votre CV et l’offre pour proposer des questions et des pistes de réponse contextualisées.',
      },
      {
        question: 'Puis-je l’utiliser pour plusieurs offres ?',
        answer: 'Oui, chaque préparation doit être adaptée à l’offre ciblée pour rester pertinente.',
      },
    ],
  },
  '/analyse-offre-emploi': {
    eyebrow: 'Analyse d’offre',
    h1: 'Analyser une offre d’emploi avant d’adapter son CV',
    intro: 'Avant de modifier un CV, il faut comprendre ce que l’offre demande vraiment : missions, compétences prioritaires, mots-clés et signaux de contexte.',
    cta: 'Analyser une offre',
    sections: [
      {
        title: 'Identifier les critères importants',
        body: 'Certaines exigences sont indispensables, d’autres sont secondaires. L’analyse aide à distinguer ce qui doit apparaître clairement dans le CV.',
        points: ['Compétences obligatoires', 'Mots-clés métier', 'Responsabilités principales'],
      },
      {
        title: 'Transformer l’analyse en actions',
        body: 'Une fois les critères identifiés, CVFit propose des ajustements sur le profil, les expériences, les compétences et les formulations.',
        points: ['Résumé professionnel', 'Expériences pertinentes', 'Compétences ordonnées par priorité'],
      },
    ],
    faq: [
      {
        question: 'Pourquoi analyser l’offre avant le CV ?',
        answer: 'Parce que l’offre donne le vocabulaire et les priorités du recruteur. Cela évite une optimisation trop générale.',
      },
      {
        question: 'CVFit extrait-il les mots-clés automatiquement ?',
        answer: 'Oui, l’outil extrait les mots-clés et les attentes importantes pour guider l’adaptation du CV.',
      },
    ],
  },
}

export default function SeoLanding() {
  const location = useLocation()
  const page = landingPages[location.pathname] ?? landingPages['/optimiser-cv-ats']

  return (
    <main style={{ background: 'var(--off-white)' }}>
      <section className="pt-[116px] pb-12 lg:pb-16 px-6 lg:px-12">
        <div className="max-w-[980px] mx-auto">
          <p className="text-caption font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--coral)' }}>
            {page.eyebrow}
          </p>
          <h1 className="text-section text-navy max-w-[760px] mb-5">{page.h1}</h1>
          <p className="text-body-large text-text-gray leading-relaxed max-w-[760px] mb-8">{page.intro}</p>
          <Link
            to="/app"
            className="inline-flex items-center gap-2 text-button text-white px-5 py-3 rounded-[12px]"
            style={{ background: 'var(--coral)' }}
          >
            {page.cta}
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      <section className="px-6 lg:px-12 pb-16">
        <div className="max-w-[980px] mx-auto grid md:grid-cols-2 gap-6">
          {page.sections.map((section) => (
            <article key={section.title} className="bg-white border border-mid-gray rounded-[8px] p-6">
              <h2 className="text-subsection text-navy mb-3">{section.title}</h2>
              <p className="text-body text-text-gray leading-relaxed mb-5">{section.body}</p>
              <ul className="space-y-3">
                {section.points.map((point) => (
                  <li key={point} className="flex items-start gap-3 text-body text-dark-gray">
                    <CheckCircle2 size={18} className="mt-0.5 shrink-0" style={{ color: 'var(--success)' }} />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="px-6 lg:px-12 pb-20">
        <div className="max-w-[980px] mx-auto">
          <h2 className="text-subsection text-navy mb-5">Questions fréquentes</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {page.faq.map((item) => (
              <article key={item.question} className="bg-white border border-mid-gray rounded-[8px] p-5">
                <h3 className="text-card-title text-navy mb-2">{item.question}</h3>
                <p className="text-body text-text-gray leading-relaxed">{item.answer}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}
