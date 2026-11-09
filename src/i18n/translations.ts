export type Language = 'it' | 'en';

export const translations = {
  it: {
    nav: {
      home: 'Home',
      about: 'Chi Siamo',
      gallery: 'Galleria',
      community: 'Community',
      tools: 'Strumenti',
      members: 'Membri',
      membersSub: 'I giocatori del server',
      projects: 'Progetti',
      projectsSub: 'Farm, redstone e build',
      timeline: 'Timeline',
      timelineSub: 'Storia del mondo (In arrivo)',
      hallOfFame: 'Hall of Fame',
      hallOfFameSub: 'Traguardi (In arrivo)',
      worldMap: 'Mappa del Mondo',
      worldMapSub: 'Vista interattiva (In arrivo)',
      storage: 'Storage',
      storageSub: 'Archivio risorse (In arrivo)',
      archive: 'Archivio',
      archiveSub: 'Schematics e file (In arrivo)',
      status: 'Stato Server',
      statusSub: 'Monitoraggio (In arrivo)',
      discord: 'Discord',
    },
    hero: {
      tag: 'Minecraft Technical SMP',
      titleLine1: 'BUILT',
      titleAccent: 'DIFFERENT.',
      description:
        'Una community Technical Survival Multiplayer focalizzata su ingegneria redstone, farm su larga scala, perimetri e progetti collaborativi.',
      ctaPrimary: 'Esplora Fermium',
      ctaSecondary: 'Entra nel Discord',
      previewPlaceholderTitle: 'Anteprima Mondo — Screenshot Principale',
      previewPlaceholderSub: 'Spazio predisposto per il banner o lo screenshot ufficiale del server',
      scroll: 'Scorri',
    },
    about: {
      tag: 'Chi Siamo',
      title: 'Più di una semplice',
      titleAccent: 'survival.',
      paragraph1:
        'Fermium SMP è una community tecnica di Minecraft nata per progettare e realizzare infrastrutture complesse, impianti redstone avanzati e grandi opere condivise in pura modalità survival.',
      paragraph2:
        'Ogni progetto nasce dalla collaborazione tra i membri: dall’ottimizzazione delle meccaniche di gioco alla cura estetica e funzionale delle costruzioni.',
      features: [
        {
          title: 'Redstone & Automazione',
          desc: 'Circuiti logici, sistemi di smistamento e macchine progettate per la massima efficienza.',
        },
        {
          title: 'Grandi Infrastrutture',
          desc: 'Perimetri, collegamenti rapidi e farm ad alto rendimento costruite in survival.',
        },
        {
          title: 'Progetti Collaborativi',
          desc: 'Un unico mondo condiviso dove ogni membro contribuisce alla realizzazione delle opere.',
        },
      ],
      imagePlaceholderTitle: 'Screenshot Server',
      imagePlaceholderSub: 'Immagine segnaposto — Verrà sostituita con uno screenshot reale di Fermium',
    },
    stats: {
      tag: 'Panoramica',
      title: 'I numeri della community',
      note: 'Valori segnaposto in attesa dei dati ufficiali',
      items: {
        members: { label: 'Membri', sub: 'Giocatori attivi nel server' },
        projects: { label: 'Progetti', sub: 'Valore da inserire' },
        farms: { label: 'Farm', sub: 'Valore da inserire' },
        worldAge: { label: 'Età del Mondo', sub: 'Dal 14 Ottobre 2026' },
      },
    },
    members: {
      tag: 'Community',
      title: 'I Membri di',
      titleAccent: 'Fermium',
      subtitle:
        'I giocatori che fanno parte del server. Le card verranno presto aggiornate con il nuovo stile grafico dinamico basato sulle skin.',
      filters: {
        all: 'Tutti',
        owner: 'Owner',
        member: 'Member',
        trial: 'Trial',
      },
      roles: {
        owner: 'Owner',
        member: 'Member',
        trial: 'Trial',
      },
      legend: {
        owner: 'Owner (Blu chiaro)',
        member: 'Member (Azzurro chiaro)',
        trial: 'Trial (Giallo)',
      },
      skinPlaceholder: 'Render in arrivo',
      viewAll: 'Vedi pagina Membri completa',
    },
    projects: {
      tag: 'Progetti Tecnici',
      title: 'Opere e',
      titleAccent: 'Costruzioni',
      subtitle:
        'Sezione predisposta per raccogliere le farm, i perimetri, i sistemi di storage e le mega-build realizzate nel server.',
      categories: {
        all: 'Tutti',
        farms: 'Farms',
        redstone: 'Redstone',
        infrastructure: 'Infrastrutture',
        perimeters: 'Perimetri',
        storage: 'Storage Systems',
        megabuilds: 'Mega-builds',
      },
      placeholderCardTitle: 'Slot Progetto',
      placeholderCardDesc:
        'Contenuto segnaposto. Qui verranno inseriti il titolo, la descrizione reale, gli autori e lo screenshot del progetto.',
      placeholderImage: 'Screenshot Progetto in arrivo',
      contributorsLabel: 'Membri:',
      detailsLink: 'Dettagli',
      viewAll: 'Esplora tutti i progetti',
    },
    gallery: {
      tag: 'Galleria',
      title: 'Momenti dal',
      titleAccent: 'Mondo',
      subtitle:
        'Raccolta visiva degli screenshot del server. Clicca su un’immagine per aprirla a schermo intero.',
      placeholderTitle: 'Screenshot Server',
      placeholderCaption: 'Segnaposto per immagine della galleria di Fermium SMP',
      viewAll: 'Apri galleria completa',
    },
    cta: {
      title: 'Entra nella community di',
      titleAccent: 'Fermium SMP',
      subtitle:
        'Unisciti al nostro server Discord per seguire gli sviluppi, vedere gli aggiornamenti sui progetti e interagire con i membri.',
      button: 'Unisciti al Discord',
      placeholderNote: 'Il link di invito pubblico verrà attivato a breve.',
    },
    footer: {
      description: 'Community Technical Survival Multiplayer di Minecraft.',
      navigation: 'Navigazione',
      community: 'Community',
      tools: 'Strumenti',
      rights: 'Tutti i diritti riservati.',
      disclaimer:
        'Non è un prodotto ufficiale di Minecraft. Non approvato né associato a Mojang o Microsoft.',
    },
    placeholderPage: {
      badge: 'In Sviluppo',
      description:
        'Questa pagina fa parte dell’architettura predisposta e verrà sviluppata dopo l’approvazione definitiva della Homepage.',
      backHome: 'Torna alla Homepage',
    },
  },
  en: {
    nav: {
      home: 'Home',
      about: 'About',
      gallery: 'Gallery',
      community: 'Community',
      tools: 'Tools',
      members: 'Members',
      membersSub: 'Server players',
      projects: 'Projects',
      projectsSub: 'Farms, redstone & builds',
      timeline: 'Timeline',
      timelineSub: 'World history (Coming soon)',
      hallOfFame: 'Hall of Fame',
      hallOfFameSub: 'Milestones (Coming soon)',
      worldMap: 'World Map',
      worldMapSub: 'Interactive view (Coming soon)',
      storage: 'Storage',
      storageSub: 'Resource index (Coming soon)',
      archive: 'Archive',
      archiveSub: 'Schematics & files (Coming soon)',
      status: 'Server Status',
      statusSub: 'Live monitor (Coming soon)',
      discord: 'Discord',
    },
    hero: {
      tag: 'Minecraft Technical SMP',
      titleLine1: 'BUILT',
      titleAccent: 'DIFFERENT.',
      description:
        'A Technical Survival Multiplayer community focused on redstone engineering, large-scale farms, perimeters, and collaborative world-building.',
      ctaPrimary: 'Explore Fermium',
      ctaSecondary: 'Join our Discord',
      previewPlaceholderTitle: 'World Preview — Main Screenshot',
      previewPlaceholderSub: 'Reserved space for the official server banner or main screenshot',
      scroll: 'Scroll',
    },
    about: {
      tag: 'About Us',
      title: 'More than just',
      titleAccent: 'survival.',
      paragraph1:
        'Fermium SMP is a technical Minecraft community created to design and build complex infrastructure, advanced redstone systems, and large-scale shared projects in survival mode.',
      paragraph2:
        'Every project comes from collaboration among members: from optimizing game mechanics to caring for the aesthetics and functionality of builds.',
      features: [
        {
          title: 'Redstone & Automation',
          desc: 'Logic circuits, sorting systems, and machines engineered for maximum efficiency.',
        },
        {
          title: 'Large-Scale Infrastructure',
          desc: 'Perimeters, fast transit hubs, and high-yield farms built in survival.',
        },
        {
          title: 'Collaborative Projects',
          desc: 'A single shared world where every member contributes to bringing builds to life.',
        },
      ],
      imagePlaceholderTitle: 'Server Screenshot',
      imagePlaceholderSub: 'Placeholder image — Will be replaced with a real Fermium screenshot',
    },
    stats: {
      tag: 'Overview',
      title: 'Community at a glance',
      note: 'Placeholder values awaiting official data',
      items: {
        members: { label: 'Members', sub: 'Active players on the server' },
        projects: { label: 'Projects', sub: 'Value to be added' },
        farms: { label: 'Farms', sub: 'Value to be added' },
        worldAge: { label: 'World Age', sub: 'Since October 14, 2026' },
      },
    },
    members: {
      tag: 'Community',
      title: 'Fermium',
      titleAccent: 'Members',
      subtitle:
        'The players of our server. Cards will soon be updated with the new dynamic skin-based visual style.',
      filters: {
        all: 'All',
        owner: 'Owner',
        member: 'Member',
        trial: 'Trial',
      },
      roles: {
        owner: 'Owner',
        member: 'Member',
        trial: 'Trial',
      },
      legend: {
        owner: 'Owner (Light Blue)',
        member: 'Member (Light Azure)',
        trial: 'Trial (Yellow)',
      },
      skinPlaceholder: 'Render coming soon',
      viewAll: 'View full Members page',
    },
    projects: {
      tag: 'Technical Projects',
      title: 'Builds &',
      titleAccent: 'Engineering',
      subtitle:
        'Prepared section to showcase farms, perimeters, storage systems, and mega-builds created on the server.',
      categories: {
        all: 'All',
        farms: 'Farms',
        redstone: 'Redstone',
        infrastructure: 'Infrastructure',
        perimeters: 'Perimeters',
        storage: 'Storage Systems',
        megabuilds: 'Mega-builds',
      },
      placeholderCardTitle: 'Project Slot',
      placeholderCardDesc:
        'Placeholder content. The real title, description, contributors, and project screenshot will be placed here.',
      placeholderImage: 'Project Screenshot coming soon',
      contributorsLabel: 'Contributors:',
      detailsLink: 'Details',
      viewAll: 'Explore all projects',
    },
    gallery: {
      tag: 'Gallery',
      title: 'World',
      titleAccent: 'Highlights',
      subtitle:
        'Visual collection of server screenshots. Click on any item to view it in fullscreen.',
      placeholderTitle: 'Server Screenshot',
      placeholderCaption: 'Placeholder for Fermium SMP gallery image',
      viewAll: 'Open full gallery',
    },
    cta: {
      title: 'Join the community of',
      titleAccent: 'Fermium SMP',
      subtitle:
        'Join our Discord server to follow updates, see project progress, and connect with members.',
      button: 'Join our Discord',
      placeholderNote: 'The public invite link will be enabled soon.',
    },
    footer: {
      description: 'Minecraft Technical Survival Multiplayer Community.',
      navigation: 'Navigation',
      community: 'Community',
      tools: 'Tools',
      rights: 'All rights reserved.',
      disclaimer:
        'Not an official Minecraft product. Not approved by or associated with Mojang or Microsoft.',
    },
    placeholderPage: {
      badge: 'In Development',
      description:
        'This page is part of the prepared routing architecture and will be built after the Homepage is approved.',
      backHome: 'Back to Homepage',
    },
  },
} as const;
