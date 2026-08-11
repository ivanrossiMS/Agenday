import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Fran Marinho - Studio de Beleza',
    short_name: 'Fran Marinho',
    description: 'Agendamento de beleza exclusivo com Fran Marinho.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#D96B52',
    icons: [],
  }
}
