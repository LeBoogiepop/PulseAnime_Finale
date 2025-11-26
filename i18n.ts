
export type Language = 'en' | 'fr';

let currentLang: Language = 'en';

export const translations = {
  en: {
    // UI General
    "app_subtitle": "Audio Reactive Experience",
    "btn_about_title": "About",
    "btn_audio": "📁 AUDIO",
    "btn_bg": "🖼️ BG",
    "btn_remove_bg": "Remove Image",
    "btn_play": "PLAY",
    "btn_stop": "STOP",
    "mic_off": "MICRO OFF",
    "mic_on": "ON AIR",
    "mic_err": "ERR",
    
    // Modal
    "modal_subtitle": "Interactive Art Solution",
    "modal_team": "Team",
    "modal_stack": "Tech Stack",
    "modal_context": "Context",
    "modal_context_desc": "Creating an immersive synesthetic experience reacting in real-time to sound frequencies.",
    "modal_objectives": "Objectives",
    "modal_obj_1": "Real-time Audio Analysis (FFT)",
    "modal_obj_2": "High-perf GPU Visualization",
    "modal_obj_3": "User Interactivity",
    "modal_obj_4": "Modular Architecture",
    "modal_footer": "Supervisors: Andréa Bareggi & Lamine Amour • ESME Sudria 2025",

    // Settings
    "settings_title": "CONFIGURATION",
    "tab_control": "CONTROL",
    "tab_presets": "PRESETS",
    "preset_placeholder": "PRESET NAME...",
    "btn_save": "SAVE",
    "btn_load": "LOAD",
    "btn_del": "DEL",
    "reboot_btn": "REBOOT SYSTEM",
    "impact_audio": "AUDIO IMPACT",
    "no_params": "NO PARAMETERS AVAILABLE",
    "sens_label": "Audio Sensitivity",
    "shortcuts": "[←/→] NAVIGATE • [SPACE] PAUSE • [H] UI • [R] CONFIG",

    // Sketches
    "sketch_landing_name": "Home",
    "sketch_landing_desc": "The central sphere pulses in rhythm with low frequencies.",
    "landing_cta": "Please choose an experience to start",
    
    "sketch_botanical_name": "Botanical",
    "sketch_botanical_desc": "Mids modulate wind strength on plants. Bass amplifies growth. Treble adds swirls.",
    
    "sketch_partition_name": "Noise Partition",
    "sketch_partition_desc": "Bass resets the canvas. Global energy triggers splits. Treble varies colors.",
    
    "sketch_travel_name": "Travel",
    "sketch_travel_desc": "Sound energy distorts the image space-time. Bass accelerates travel speed.",
    
    "sketch_flow_trails_name": "Flow Trails",
    "sketch_flow_trails_desc": "Mids accelerate particles. Bass increases speed limit and adds white flashes.",
    
    "sketch_plexus_name": "Plexus Net",
    "sketch_plexus_desc": "Volume controls line connection threshold. Treble vibrates points randomly.",
    
    "sketch_noise_abstract_name": "Noise Field",
    "sketch_noise_abstract_desc": "Bass propels the noise field forward. The grid reacts subtly to volume changes.",

    // Parameters
    "param_maxPolys": "Max Partitions",
    "param_imageOpacity": "Image Opacity",
    "param_chaos": "Explosion Chaos",
    "param_speed": "Speed",
    "param_baseDistortion": "Distortion",
    "param_flowScale": "Flow Scale",
    "param_traceLength": "Trail Length",
    "param_particleColor": "Color",
    "param_threshold": "Threshold",
    "param_pointSize": "Point Size",
    "param_lineColor": "Color",
    "param_resolution": "Resolution",
    "param_noiseScale": "Noise Scale",
    "param_wind": "Wind Force",
    "param_growth": "Growth Size",
  },
  fr: {
    // UI General
    "app_subtitle": "Expérience Audio Réactive",
    "btn_about_title": "À Propos",
    "btn_audio": "📁 AUDIO",
    "btn_bg": "🖼️ FOND",
    "btn_remove_bg": "Supprimer l'image",
    "btn_play": "LECTURE",
    "btn_stop": "STOP",
    "mic_off": "MICRO OFF",
    "mic_on": "ON AIR",
    "mic_err": "ERR",

    // Modal
    "modal_subtitle": "Solution d'art interactif",
    "modal_team": "Équipe",
    "modal_stack": "Stack Technique",
    "modal_context": "Contexte",
    "modal_context_desc": "Création d'une expérience synesthésique immersive réagissant en temps réel aux fréquences sonores.",
    "modal_objectives": "Objectifs",
    "modal_obj_1": "Analyse audio temps réel (FFT)",
    "modal_obj_2": "Visualisation GPU performante",
    "modal_obj_3": "Interactivité utilisateur",
    "modal_obj_4": "Architecture modulaire",
    "modal_footer": "Encadrants : Andréa Bareggi & Lamine Amour • ESME Sudria 2025",

    // Settings
    "settings_title": "CONFIGURATION",
    "tab_control": "CONTROLE",
    "tab_presets": "PRESETS",
    "preset_placeholder": "NOM DU PRESET...",
    "btn_save": "SAUVER",
    "btn_load": "CHARGER",
    "btn_del": "SUPPR",
    "reboot_btn": "REBOOT SYSTEM",
    "impact_audio": "IMPACT AUDIO",
    "no_params": "AUCUN PARAMÈTRE DISPONIBLE",
    "sens_label": "Sensibilité Audio",
    "shortcuts": "[←/→] NAVIGATEUR • [ESPACE] PAUSE • [H] UI • [R] CONFIG",

    // Sketches
    "sketch_landing_name": "Accueil",
    "sketch_landing_desc": "La sphère centrale pulse en rythme avec les basses fréquences.",
    "landing_cta": "Merci de choisir une expérience pour commencer",
    
    "sketch_botanical_name": "Jardin Botanique",
    "sketch_botanical_desc": "Les médiums modulent la force du vent sur les plantes. Les basses amplifient leur croissance. Les aigus ajoutent des tourbillons.",
    
    "sketch_partition_name": "Partition de Bruit",
    "sketch_partition_desc": "Les basses réinitialisent le canevas une fois terminé. L'énergie globale déclenche les divisions. Les aigus font varier les couleurs.",
    
    "sketch_travel_name": "Voyage",
    "sketch_travel_desc": "L'énergie sonore déforme l'espace-temps de l'image (Distortion). Les basses accélèrent la vitesse de défilement.",
    
    "sketch_flow_trails_name": "Flux de Particules",
    "sketch_flow_trails_desc": "Les médiums accélèrent les particules. Les basses augmentent la vitesse limite et ajoutent des flashs blancs.",
    
    "sketch_plexus_name": "Réseau Plexus",
    "sketch_plexus_desc": "Le volume sonore contrôle le seuil de connexion des lignes. Les aigus font vibrer les points de manière aléatoire.",
    
    "sketch_noise_abstract_name": "Champ de Bruit",
    "sketch_noise_abstract_desc": "Les basses propulsent le champ de bruit vers l'avant. La grille réagit subtilement aux variations de volume.",

    // Parameters
    "param_maxPolys": "Max Partitions",
    "param_imageOpacity": "Opacité Image",
    "param_chaos": "Chaos Explosion",
    "param_speed": "Vitesse",
    "param_baseDistortion": "Distortion Base",
    "param_flowScale": "Échelle Flux",
    "param_traceLength": "Longueur Traînée",
    "param_particleColor": "Couleur",
    "param_threshold": "Seuil Connexion",
    "param_pointSize": "Taille Points",
    "param_lineColor": "Couleur",
    "param_resolution": "Résolution",
    "param_noiseScale": "Échelle Bruit",
    "param_wind": "Force Vent",
    "param_growth": "Taille Croissance",
  }
};

export const getLang = () => currentLang;

export const setLang = (lang: Language) => {
  currentLang = lang;
};

export const t = (key: string): string => {
  const dict = translations[currentLang] as any;
  return dict[key] || key;
};
