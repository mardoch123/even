-- -----------------------------------------------------------------------------
-- SEED DATA FOR EVENEO V3 (UPDATED)
-- -----------------------------------------------------------------------------

-- Enable pgcrypto for password hashing
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Clear existing data
TRUNCATE TABLE public.notifications, public.ad_campaigns, public.chat_messages, public.reviews, public.invoices, public.transactions, public.event_items, public.events, public.service_providers, public.profiles CASCADE;

-- -----------------------------------------------------------------------------
-- 0. AUTH USERS (REQUIRED FOR FOREIGN KEYS)
-- -----------------------------------------------------------------------------
INSERT INTO auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
VALUES 
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'authenticated', 'authenticated', 'admin@eveneo.com', crypt('password123', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{}', NOW(), NOW(), '', '', '', ''),
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b22', 'authenticated', 'authenticated', 'client@gmail.com', crypt('password123', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{}', NOW(), NOW(), '', '', '', ''),
    ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c33', 'authenticated', 'authenticated', 'dj.mix@gmail.com', crypt('password123', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{}', NOW(), NOW(), '', '', '', ''),
    ('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380d44', 'authenticated', 'authenticated', 'chef.delice@gmail.com', crypt('password123', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{}', NOW(), NOW(), '', '', '', ''),
    ('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380e55', 'authenticated', 'authenticated', 'photo.art@gmail.com', crypt('password123', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{}', NOW(), NOW(), '', '', '', '')
ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 1. PROFILES
-- -----------------------------------------------------------------------------
INSERT INTO public.profiles (id, email, full_name, role, avatar_url, phone, location, is_verified, kyc_status, subscription_plan)
VALUES 
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'admin@eveneo.com', 'Admin User', 'ADMIN', 'https://ui-avatars.com/api/?name=Admin&background=0D8ABC&color=fff', '+33600000000', 'Paris, France', true, 'verified', 'business'),
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b22', 'client@gmail.com', 'Sophie Martin', 'CLIENT', 'https://ui-avatars.com/api/?name=Sophie+Martin&background=random', '+33612345678', 'Lyon, France', true, 'none', 'free'),
    ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c33', 'dj.mix@gmail.com', 'DJ Mix Master', 'PROVIDER', 'https://ui-avatars.com/api/?name=DJ+Mix&background=random', '+33698765432', 'Paris, France', true, 'verified', 'pro'),
    ('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380d44', 'chef.delice@gmail.com', 'Chef Délice', 'PROVIDER', 'https://ui-avatars.com/api/?name=Chef+Delice&background=random', '+33611223344', 'Marseille, France', true, 'verified', 'business'),
    ('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380e55', 'photo.art@gmail.com', 'Photo Art Studio', 'PROVIDER', 'https://ui-avatars.com/api/?name=Photo+Art&background=random', '+33655443322', 'Bordeaux, France', true, 'verified', 'free')
ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 2. SERVICE PROVIDERS
-- -----------------------------------------------------------------------------
INSERT INTO public.service_providers (id, owner_id, name, category, description, location, price_range, price_value, price_unit, image_url, rating, review_count, verified, portfolio, availability, included_items, excluded_items, add_ons, cancellation_policy, service_area, warranty_enabled, booked_dates, details)
VALUES
    ('f0eebc99-9c0b-4ef8-bb6d-6bb9bd380f66', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c33', 'DJ Mix Master Events', 'DJ', 'Ambiance assurée pour tous vos événements. Spécialiste mariages et soirées privées. Avec plus de 10 ans d''expérience, je m''adapte à tous les styles musicaux pour faire danser vos invités jusqu''au bout de la nuit.', 'Paris, Île-de-France', '€€', 500, 'event', 'https://images.unsplash.com/photo-1571266028243-3716f02d2d2e?auto=format&fit=crop&w=800&q=80', 4.8, 12, true, 
    ARRAY['https://images.unsplash.com/photo-1598387993441-a364f854c3e1?auto=format&fit=crop&w=800&q=80', 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=800&q=80', 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=800&q=80'], 
    ARRAY['Lundi', 'Vendredi', 'Samedi'], 
    ARRAY['Sonorisation complète (jusqu''à 200 pers)', 'Éclairage d''ambiance', 'Micro HF', 'Rendez-vous de préparation'], 
    ARRAY['Heures supplémentaires après 4h du matin', 'Frais de déplacement hors Île-de-France'],
    '[{"id": "opt1", "name": "Machine à fumée", "price": 50, "description": "Pour une ambiance encore plus folle"}, {"id": "opt2", "name": "Heure supplémentaire", "price": 100, "description": "Par heure entamée après la fin prévue"}]'::JSONB,
    'Annulation gratuite jusqu''à 30 jours avant l''événement. 50% de frais sinon.',
    'Paris et toute l''Île-de-France',
    true,
    ARRAY['2025-06-15', '2025-07-20'],
    '{"styles": ["Généraliste", "House", "Disco", "Pop"], "equipment": "Pioneer Nexus 2"}'::JSONB
    ),
    ('10eebc99-9c0b-4ef8-bb6d-6bb9bd380177', 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380d44', 'Traiteur Délice Royal', 'Traiteur', 'Une cuisine raffinée pour vos papilles. Produits frais et locaux. Nous créons des menus sur mesure pour vos mariages, baptêmes et événements d''entreprise.', 'Marseille, PACA', '€€€', 80, 'item', 'https://images.unsplash.com/photo-1555244162-803834f70033?auto=format&fit=crop&w=800&q=80', 4.9, 25, true, 
    ARRAY['https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=80', 'https://images.unsplash.com/photo-1467003909585-2f8a7270028d?auto=format&fit=crop&w=800&q=80', 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=800&q=80'], 
    ARRAY['Tous les jours'], 
    ARRAY['Menu complet (Entrée, Plat, Dessert)', 'Service à table', 'Vaisselle et nappage', 'Pain et eaux minérales'], 
    ARRAY['Boissons alcoolisées', 'Droit de bouchon', 'Mobilier (Tables/Chaises)'],
    '[{"id": "opt1", "name": "Atelier Cocktail", "price": 15, "description": "+15€ par personne (Animation 1h)"}, {"id": "opt2", "name": "Pièce montée", "price": 250, "description": "Prix fixe pour 50 pers."}]'::JSONB,
    'Acompte de 30% à la réservation. Solde 1 semaine avant.',
    'Marseille, Aix-en-Provence, Toulon',
    true,
    ARRAY['2025-08-10', '2025-09-05'],
    '{"cuisineType": "Gastronomique Française", "dietaryOptions": ["Végétarien", "Sans Gluten"]}'::JSONB
    ),
    ('20eebc99-9c0b-4ef8-bb6d-6bb9bd380288', 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380e55', 'Lumière & Instant', 'Photographe', 'Capturer vos moments les plus précieux avec une touche artistique. Photographe passionné spécialisé dans le reportage de mariage et les portraits lifestyle.', 'Bordeaux, Nouvelle-Aquitaine', '€€', 150, 'hour', 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=800&q=80', 4.7, 8, true, 
    ARRAY['https://images.unsplash.com/photo-1520854221256-17451cc330e7?auto=format&fit=crop&w=800&q=80', 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=800&q=80'], 
    ARRAY['Week-end'], 
    ARRAY['Prise de vue illimitée', 'Tri et post-traitement', 'Galerie privée en ligne', '10 tirages papier 13x18'], 
    ARRAY['Album photo luxe (en option)', 'Séance engagement'],
    '[{"id": "opt1", "name": "Album Photo Luxe", "price": 300, "description": "Album 30x30cm, 40 pages, couverture lin"}, {"id": "opt2", "name": "Séance Engagement", "price": 200, "description": "Séance couple avant le mariage"}]'::JSONB,
    'Annulation possible jusqu''à 15 jours avant.',
    'Bordeaux et Gironde',
    false,
    ARRAY['2025-06-21', '2025-07-12'],
    '{"style": "Fine Art", "deliveryTime": "3 semaines"}'::JSON
    )
ON CONFLICT (id) DO UPDATE SET
    description = EXCLUDED.description,
    portfolio = EXCLUDED.portfolio,
    included_items = EXCLUDED.included_items,
    excluded_items = EXCLUDED.excluded_items,
    add_ons = EXCLUDED.add_ons,
    cancellation_policy = EXCLUDED.cancellation_policy,
    service_area = EXCLUDED.service_area,
    warranty_enabled = EXCLUDED.warranty_enabled,
    booked_dates = EXCLUDED.booked_dates,
    details = EXCLUDED.details;

-- -----------------------------------------------------------------------------
-- 3. EVENTS
-- -----------------------------------------------------------------------------
INSERT INTO public.events (id, client_id, name, date, status, total_cost)
VALUES
    ('30eebc99-9c0b-4ef8-bb6d-6bb9bd380399', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b22', 'Anniversaire Sophie', '2025-06-15', 'confirmed', 1500),
    ('40eebc99-9c0b-4ef8-bb6d-6bb9bd380400', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b22', 'Soirée d''entreprise', '2025-09-20', 'draft', 0)
ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 4. EVENT ITEMS
-- -----------------------------------------------------------------------------
INSERT INTO public.event_items (id, event_id, provider_id, price, status, paid_to_provider, service_start_at, service_end_at)
VALUES
    ('50eebc99-9c0b-4ef8-bb6d-6bb9bd380511', '30eebc99-9c0b-4ef8-bb6d-6bb9bd380399', 'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380f66', 500, 'confirmed', true, '2025-06-15T18:00:00+00', '2025-06-15T22:00:00+00'),
    ('60eebc99-9c0b-4ef8-bb6d-6bb9bd380622', '30eebc99-9c0b-4ef8-bb6d-6bb9bd380399', '10eebc99-9c0b-4ef8-bb6d-6bb9bd380177', 1000, 'confirmed', false, '2025-06-15T16:00:00+00', '2025-06-15T20:00:00+00')
ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 5. REVIEWS
-- -----------------------------------------------------------------------------
INSERT INTO public.reviews (id, provider_id, client_id, rating, content)
VALUES
    ('70eebc99-9c0b-4ef8-bb6d-6bb9bd380733', 'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380f66', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b22', 5, 'Super DJ ! Il a mis le feu à la piste toute la soirée. Je recommande vivement.'),
    ('80eebc99-9c0b-4ef8-bb6d-6bb9bd380844', '10eebc99-9c0b-4ef8-bb6d-6bb9bd380177', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b22', 5, 'Délicieux et très professionnel. Les invités ont adoré.')
ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 6. TRANSACTIONS
-- -----------------------------------------------------------------------------
INSERT INTO public.transactions (id, user_id, type, amount, status, description, reference_id)
VALUES
    ('90eebc99-9c0b-4ef8-bb6d-6bb9bd380955', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b22', 'payment', 1500, 'completed', 'Paiement Anniversaire Sophie', '30eebc99-9c0b-4ef8-bb6d-6bb9bd380399'),
    ('a1eebc99-9c0b-4ef8-bb6d-6bb9bd380a66', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c33', 'payout', 450, 'completed', 'Virement prestation DJ (90%)', '50eebc99-9c0b-4ef8-bb6d-6bb9bd380511')
ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 7. AD CAMPAIGNS
-- -----------------------------------------------------------------------------
INSERT INTO public.ad_campaigns (id, provider_id, target_country, type, creative, duration, budget_total, budget_spent, status, stats)
VALUES
    ('camp-001', 'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380f66', 'France', 'local', '{"headline": "DJ Mariage Pro", "tagline": "Ambiance inoubliable", "tags": ["DJ", "Mariage", "Fête"]}'::JSONB, '30d', 100, 25.50, 'active', '{"impressions": 1250, "clicks": 45, "reservations": 2, "revenueGenerated": 1000, "ctr": 0.036, "score": 85}'::JSONB)
ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 8. NOTIFICATIONS
-- -----------------------------------------------------------------------------
INSERT INTO public.notifications (id, user_id, type, title, content, read)
VALUES
    ('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b77', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c33', 'booking_confirmed', 'Nouvelle Réservation', 'Vous avez une nouvelle demande pour le 15 Juin.', false),
    ('c1eebc99-9c0b-4ef8-bb6d-6bb9bd380c88', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b22', 'payment_received', 'Paiement Confirmé', 'Nous avons bien reçu votre paiement de 1500€.', true)
ON CONFLICT (id) DO NOTHING;
