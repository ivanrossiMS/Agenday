import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Agenday - Gestão de Beleza',
    short_name: 'Agenday',
    description: 'Sistema de agendamento ultra moderno para salões e barbearias.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#0f172a',
    icons: [],
  }
}
