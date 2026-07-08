import { Link, useLocation } from 'react-router'

const UPDATED_AT = '8 juillet 2026'

const pages = {
  '/a-propos': {
    title: 'À propos de CVFit',
    intro: 'CVFit aide les candidats à adapter leur CV à chaque offre d’emploi, sans perdre la cohérence de leur parcours.',
    sections: [
      ['Notre mission', 'CVFit part d’un constat simple : un bon CV n’est pas seulement un document bien présenté. Il doit aussi reprendre les bons mots-clés, mettre en avant les expériences pertinentes et rester lisible par les logiciels de recrutement. Notre objectif est d’aider chaque candidat à produire une version claire, ciblée et honnête de son CV pour chaque candidature.'],
      ['Notre approche', 'L’outil analyse l’offre d’emploi, extrait les attentes importantes, compare ces éléments au CV de départ, puis propose des reformulations adaptées. L’utilisateur garde le contrôle : il peut relire, modifier, accepter ou refuser les propositions avant d’exporter son CV.'],
      ['Ce que CVFit ne fait pas', 'CVFit ne doit pas inventer de diplôme, d’employeur, de certification ou d’expérience. Les suggestions doivent rester fidèles au parcours réel de l’utilisateur. L’outil aide à mieux formuler, structurer et prioriser les informations, pas à créer un profil fictif.'],
      ['Contact', 'Pour toute question, vous pouvez nous écrire à contact@cvfit.fr.'],
    ],
  },
  '/cgu': {
    title: 'Conditions générales d’utilisation',
    intro: `Dernière mise à jour : ${UPDATED_AT}. Les présentes conditions encadrent l’utilisation du service CVFit.`,
    sections: [
      ['Objet du service', 'CVFit permet d’importer un CV, de copier une offre d’emploi, de générer des suggestions d’optimisation, une lettre de motivation, une préparation entretien et un suivi de candidatures. Certaines fonctionnalités peuvent évoluer, être ajoutées ou retirées pendant la phase de lancement.'],
      ['Compte utilisateur', 'L’utilisateur est responsable de l’exactitude des informations fournies lors de la création de son compte et de la confidentialité de ses identifiants. Toute activité réalisée depuis le compte est réputée effectuée par son titulaire, sauf preuve contraire.'],
      ['Contenus importés', 'L’utilisateur garantit disposer des droits nécessaires sur les documents et informations importés. Il s’engage à ne pas importer de contenu illicite, discriminatoire, frauduleux ou portant atteinte aux droits de tiers.'],
      ['Utilisation de l’intelligence artificielle', 'Les résultats générés par l’IA sont des propositions d’aide à la rédaction. Ils peuvent contenir des imprécisions. L’utilisateur doit relire et valider les contenus avant toute utilisation dans une candidature. CVFit ne garantit pas l’obtention d’un entretien, d’un emploi ou d’un score ATS déterminé.'],
      ['Responsabilité', 'CVFit fournit un outil d’assistance. L’utilisateur reste seul responsable des candidatures envoyées, des informations communiquées aux recruteurs et des décisions prises à partir des résultats générés.'],
      ['Disponibilité', 'Le service peut être interrompu pour maintenance, correction, mise à jour ou incident technique. CVFit s’efforce de rétablir l’accès dans les meilleurs délais.'],
      ['Résiliation', 'L’utilisateur peut cesser d’utiliser le service à tout moment. CVFit peut suspendre ou supprimer un compte en cas d’usage abusif, frauduleux ou contraire aux présentes conditions.'],
      ['Contact', 'Toute question relative aux présentes conditions peut être adressée à contact@cvfit.fr.'],
    ],
  },
  '/confidentialite': {
    title: 'Politique de confidentialité',
    intro: `Dernière mise à jour : ${UPDATED_AT}. Cette page explique comment CVFit traite les données personnelles.`,
    sections: [
      ['Données collectées', 'CVFit peut collecter l’adresse email, le nom, les CV importés, les offres d’emploi copiées, les documents générés, les candidatures suivies, les lettres de motivation et les préparations entretien. Des données techniques minimales peuvent aussi être traitées pour sécuriser et faire fonctionner le service.'],
      ['Finalités', 'Les données sont utilisées pour créer et sécuriser le compte, fournir les fonctionnalités du service, générer les optimisations demandées, conserver l’historique utilisateur, assurer le support et améliorer la fiabilité de la plateforme.'],
      ['Traitement par IA', 'Les contenus nécessaires à la génération peuvent être transmis à des fournisseurs d’IA côté serveur. Les clés API ne sont pas exposées côté navigateur. L’utilisateur doit éviter d’importer des informations sensibles qui ne sont pas nécessaires à sa candidature.'],
      ['Conservation', 'Les données sont conservées tant que le compte est actif ou aussi longtemps que nécessaire pour fournir le service. L’utilisateur peut demander la suppression de ses données en écrivant à contact@cvfit.fr.'],
      ['Sécurité', 'CVFit met en place des mesures raisonnables pour limiter l’accès non autorisé aux fichiers, protéger les sessions et éviter l’exposition publique des documents importés. Aucun système n’étant infaillible, l’utilisateur doit également protéger ses identifiants.'],
      ['Droits des utilisateurs', 'Conformément au RGPD, l’utilisateur peut demander l’accès, la rectification, la suppression, la limitation ou la portabilité de ses données. Il peut aussi s’opposer à certains traitements lorsque la loi le permet.'],
      ['Contact confidentialité', 'Pour exercer vos droits ou poser une question, écrivez à contact@cvfit.fr.'],
    ],
  },
  '/mentions-legales': {
    title: 'Mentions légales',
    intro: `Dernière mise à jour : ${UPDATED_AT}.`,
    sections: [
      ['Éditeur du site', 'CVFit est un service accessible à l’adresse cvfit.fr. Contact : contact@cvfit.fr. Les informations administratives complètes de l’éditeur devront être finalisées avant le lancement commercial public.'],
      ['Hébergement', 'Le site est hébergé par Hostinger, service d’hébergement web.'],
      ['Propriété intellectuelle', 'Les textes, interfaces, éléments graphiques, marques, logos et contenus du site sont protégés par le droit de la propriété intellectuelle. Toute reproduction non autorisée est interdite.'],
      ['Responsabilité éditoriale', 'Les informations publiées sur le site sont fournies à titre informatif. CVFit s’efforce de maintenir des contenus exacts et à jour, sans garantir l’absence totale d’erreur.'],
      ['Contact', 'Pour toute demande relative au site ou aux mentions légales : contact@cvfit.fr.'],
    ],
  },
}

export default function Legal() {
  const location = useLocation()
  const page = pages[location.pathname as keyof typeof pages] ?? pages['/a-propos']

  return (
    <main className="min-h-[70dvh]" style={{ background: 'var(--off-white)' }}>
      <section className="max-w-[860px] mx-auto px-6 lg:px-12 py-14 lg:py-20">
        <Link to="/" className="text-caption font-semibold hover:underline" style={{ color: 'var(--coral)' }}>CVFit</Link>
        <h1 className="text-section text-navy mt-4 mb-4">{page.title}</h1>
        <p className="text-body-large text-text-gray mb-10">{page.intro}</p>
        <div className="space-y-8">
          {page.sections.map(([title, content]) => (
            <section key={title}>
              <h2 className="text-subsection text-navy mb-2">{title}</h2>
              <p className="text-body text-text-gray leading-relaxed">{content}</p>
            </section>
          ))}
        </div>
      </section>
    </main>
  )
}
