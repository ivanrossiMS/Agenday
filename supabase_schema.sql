-- ========================================================
-- AGENDAY - SCRIPT SQL COMPLETO PARA O SUPABASE
-- Execute este script no SQL Editor do Supabase para criar
-- todas as tabelas, permissões RLS e dados iniciais.
-- ========================================================

-- 1. TABELA DE SERVIÇOS
CREATE TABLE IF NOT EXISTS public.services (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  price NUMERIC NOT NULL DEFAULT 0,
  duration INT NOT NULL DEFAULT 60,
  image_url TEXT DEFAULT '',
  professional_name TEXT DEFAULT '',
  professional_photo_url TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABELA DE AGENDAMENTOS
CREATE TABLE IF NOT EXISTS public.appointments (
  id BIGINT PRIMARY KEY,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  end_time TEXT,
  service TEXT NOT NULL,
  price NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  payment_status TEXT NOT NULL DEFAULT 'open',
  client_name TEXT NOT NULL,
  client_email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABELA DE DATAS FECHADAS
CREATE TABLE IF NOT EXISTS public.closed_dates (
  date_str TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TABELA DE HORÁRIOS BLOQUEADOS
CREATE TABLE IF NOT EXISTS public.blocked_time_slots (
  slot_key TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TABELA DE CLIENTES
CREATE TABLE IF NOT EXISTS public.clients (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT DEFAULT '',
  address TEXT DEFAULT '',
  birth_date TEXT DEFAULT '',
  photo_url TEXT DEFAULT '',
  password TEXT DEFAULT '',
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. TABELA DE REDEFINIÇÃO DE SENHA
CREATE TABLE IF NOT EXISTS public.password_resets (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);


-- 6. TABELA DE CONFIGURAÇÕES DO PROGRAMA DE FIDELIDADE
CREATE TABLE IF NOT EXISTS public.loyalty_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  stamps_required INT DEFAULT 5,
  prize_name TEXT DEFAULT '1 Hidratação Grátis',
  expiration_days INT DEFAULT 90,
  is_active BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. TABELA DE RESGATES DO PROGRAMA DE FIDELIDADE
CREATE TABLE IF NOT EXISTS public.loyalty_claims (
  id BIGINT PRIMARY KEY,
  client_email TEXT NOT NULL,
  client_name TEXT NOT NULL,
  prize_name TEXT NOT NULL,
  date TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. TABELA DE CONFIGURAÇÕES GERAIS DO SITE
CREATE TABLE IF NOT EXISTS public.site_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  hero_title TEXT,
  hero_subtitle TEXT,
  hero_image TEXT,
  about_title TEXT,
  about_text TEXT,
  about_image TEXT,
  business_start TEXT,
  business_end TEXT,
  whatsapp_number TEXT,
  salon_address TEXT,
  maps_link TEXT,
  preparation_steps JSONB,
  logo_url TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================================
-- HABILITAR PERMISSÕES PÚBLICAS (ROW LEVEL SECURITY - RLS)
-- Permite leitura e escrita pública pela anon_key
-- ========================================================

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.closed_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocked_time_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Apagar políticas existentes se houver re-execução
DROP POLICY IF EXISTS "Public access services" ON public.services;
DROP POLICY IF EXISTS "Public access appointments" ON public.appointments;
DROP POLICY IF EXISTS "Public access closed_dates" ON public.closed_dates;
DROP POLICY IF EXISTS "Public access blocked_time_slots" ON public.blocked_time_slots;
DROP POLICY IF EXISTS "Public access clients" ON public.clients;
DROP POLICY IF EXISTS "Public access loyalty_settings" ON public.loyalty_settings;
DROP POLICY IF EXISTS "Public access loyalty_claims" ON public.loyalty_claims;
DROP POLICY IF EXISTS "Public access site_settings" ON public.site_settings;

-- Criar novas políticas públicas completas (select, insert, update, delete)
CREATE POLICY "Public access services" ON public.services FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access appointments" ON public.appointments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access closed_dates" ON public.closed_dates FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access blocked_time_slots" ON public.blocked_time_slots FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access clients" ON public.clients FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access loyalty_settings" ON public.loyalty_settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access loyalty_claims" ON public.loyalty_claims FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access site_settings" ON public.site_settings FOR ALL USING (true) WITH CHECK (true);

-- ========================================================
-- POPOVOAMENTO INICIAL DE DADOS PADRÃO (SEED)
-- ========================================================

-- Inserir Serviços Iniciais (se a tabela estiver vazia)
INSERT INTO public.services (id, name, description, price, duration, image_url, professional_name, professional_photo_url)
VALUES 
  ('cilios', 'Extensão de Cílios', 'Técnicas exclusivas de volume brasileiro e clássico, com fios de seda super leves aplicados fio a fio.', 120, 120, 'https://images.unsplash.com/photo-1512496015851-a1c815b7e143?q=80&w=800&auto=format&fit=crop', 'Ana Silva', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=150&auto=format&fit=crop'),
  ('unhas', 'Nail Art & Spa', 'Spa completo das mãos, blindagem e esmaltação em gel com produtos hipoalergênicos importados.', 80, 90, 'https://images.unsplash.com/photo-1522337660859-02fbefca4702?q=80&w=800&auto=format&fit=crop', 'Camila Oliveira', 'https://i.pravatar.cc/150?u=camila'),
  ('sobrancelhas', 'Design de Sobrancelhas', 'Mapeamento facial personalizado e nanopigmentação para um olhar perfeitamente alinhado.', 60, 45, 'https://images.unsplash.com/photo-1596704017254-9b121068fb31?q=80&w=800&auto=format&fit=crop', 'Julia Santos', 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=150&auto=format&fit=crop')
ON CONFLICT (id) DO NOTHING;

-- Inserir Configurações de Fidelidade Padrão
INSERT INTO public.loyalty_settings (id, stamps_required, prize_name, expiration_days, is_active)
VALUES ('default', 5, '1 Hidratação Grátis', 90, true)
ON CONFLICT (id) DO NOTHING;

-- Inserir Configurações do Site Padrão
INSERT INTO public.site_settings (
  id, hero_title, hero_subtitle, hero_image,
  about_title, about_text, about_image,
  business_start, business_end, whatsapp_number,
  salon_address, maps_link, preparation_steps, logo_url
)
VALUES (
  'default',
  'A sua beleza tratada como uma verdadeira joia',
  'No Agenday, cada detalhe é pensado para oferecer a você uma experiência de beleza inesquecível.',
  'https://images.unsplash.com/photo-1560066984-138dadb4c035?q=80&w=2000&auto=format&fit=crop',
  'Experiência e Exclusividade',
  'Nosso espaço foi desenhado para ser o seu refúgio urbano. Muito mais do que um salão, somos especialistas em elevar a autoestima através de técnicas modernas e atendimento personalizado. Trabalhamos com os melhores produtos do mercado mundial para garantir resultados impecáveis e duradouros.',
  'https://images.unsplash.com/photo-1600948836101-f9ffda59d250?q=80&w=1000&auto=format&fit=crop',
  '09:00',
  '18:00',
  '5511999999999',
  'Agenday Beauty • Av. Afonso Pena, 1234',
  'https://maps.google.com',
  '["Venha sem maquiagem nos olhos", "Informe alergias ou sensibilidades", "Traga uma foto de inspiração"]'::jsonb,
  ''
)
ON CONFLICT (id) DO NOTHING;
