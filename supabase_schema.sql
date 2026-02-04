-- -----------------------------------------------------------------------------
-- 0. CLEANUP (DROP EXISTING TABLES)
-- -----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS update_updated_at_column();

DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.ad_campaigns CASCADE;
DROP TABLE IF EXISTS public.chat_messages CASCADE;
DROP TABLE IF EXISTS public.reviews CASCADE;
DROP TABLE IF EXISTS public.invoices CASCADE;
DROP TABLE IF EXISTS public.transactions CASCADE;
DROP TABLE IF EXISTS public.event_items CASCADE;
DROP TABLE IF EXISTS public.events CASCADE;
DROP TABLE IF EXISTS public.service_providers CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable Full Text Search extension (optional but good for search)
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- -----------------------------------------------------------------------------
-- 1. PROFILES (Users)
-- -----------------------------------------------------------------------------
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    role TEXT CHECK (role IN ('VISITOR', 'CLIENT', 'PROVIDER', 'ADMIN')) DEFAULT 'VISITOR',
    avatar_url TEXT,
    phone TEXT,
    location TEXT,
    is_verified BOOLEAN DEFAULT FALSE,
    kyc_status TEXT CHECK (kyc_status IN ('none', 'pending', 'verified', 'rejected')) DEFAULT 'none',
    subscription_plan TEXT CHECK (subscription_plan IN ('free', 'pro', 'business')) DEFAULT 'free',
    details JSONB DEFAULT '{}'::JSONB, -- For dynamic profile data
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone" 
ON public.profiles FOR SELECT 
USING (true);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles FOR INSERT 
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = id);

CREATE POLICY "Admins can update all profiles"
ON public.profiles FOR UPDATE
USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'ADMIN'));

-- -----------------------------------------------------------------------------
-- 2. SERVICE PROVIDERS
-- -----------------------------------------------------------------------------
CREATE TABLE public.service_providers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    location TEXT,
    price_range TEXT,
    price_value NUMERIC DEFAULT 0,
    price_unit TEXT CHECK (price_unit IN ('event', 'hour', 'item')) DEFAULT 'event',
    image_url TEXT,
    portfolio TEXT[] DEFAULT '{}',
    verified BOOLEAN DEFAULT FALSE,
    rating NUMERIC DEFAULT 0,
    review_count INTEGER DEFAULT 0,
    capacity TEXT,
    cancellation_policy TEXT,
    service_area TEXT,
    warranty_enabled BOOLEAN DEFAULT FALSE,
    availability TEXT[] DEFAULT '{}',
    booked_dates TEXT[] DEFAULT '{}',
    included_items TEXT[] DEFAULT '{}',
    excluded_items TEXT[] DEFAULT '{}',
    add_ons JSONB DEFAULT '[]'::JSONB, -- Array of AddOn objects
    details JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for Service Providers
ALTER TABLE public.service_providers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service providers are viewable by everyone" 
ON public.service_providers FOR SELECT 
USING (true);

CREATE POLICY "Users can create their own service provider profile" 
ON public.service_providers FOR INSERT 
WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update their service provider profile" 
ON public.service_providers FOR UPDATE 
USING (auth.uid() = owner_id);

-- -----------------------------------------------------------------------------
-- 3. EVENTS
-- -----------------------------------------------------------------------------
CREATE TABLE public.events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    date DATE NOT NULL,
    status TEXT CHECK (status IN ('draft', 'confirmed', 'started', 'ended', 'completed', 'cancelled_refunded')) DEFAULT 'draft',
    total_cost NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for Events
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can view their own events" 
ON public.events FOR SELECT 
USING (auth.uid() = client_id);

CREATE POLICY "Clients can create events" 
ON public.events FOR INSERT 
WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Clients can update their own events" 
ON public.events FOR UPDATE 
USING (auth.uid() = client_id);

-- -----------------------------------------------------------------------------
-- 4. EVENT ITEMS (Services within an event)
-- -----------------------------------------------------------------------------
CREATE TABLE public.event_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
    provider_id UUID REFERENCES public.service_providers(id),
    price NUMERIC DEFAULT 0,
    status TEXT CHECK (status IN ('pending', 'confirmed', 'completed_by_provider', 'validated_by_client')) DEFAULT 'pending',
    selected_add_ons TEXT[] DEFAULT '{}',
    service_start_at TIMESTAMPTZ,
    service_end_at TIMESTAMPTZ,
    paid_to_provider BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Prevent time slot overlaps for the same provider
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE public.event_items
ADD CONSTRAINT event_items_no_overlap_per_provider
EXCLUDE USING gist (
    provider_id WITH =,
    tstzrange(service_start_at, service_end_at, '[)') WITH &&
)
WHERE (service_start_at IS NOT NULL AND service_end_at IS NOT NULL);

-- RLS for Event Items
ALTER TABLE public.event_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can view items in their events" 
ON public.event_items FOR SELECT 
USING (EXISTS (SELECT 1 FROM public.events WHERE events.id = event_items.event_id AND events.client_id = auth.uid()));

CREATE POLICY "Providers can view items assigned to them" 
ON public.event_items FOR SELECT 
USING (EXISTS (SELECT 1 FROM public.service_providers WHERE service_providers.id = event_items.provider_id AND service_providers.owner_id = auth.uid()));

-- -----------------------------------------------------------------------------
-- 5. TRANSACTIONS
-- -----------------------------------------------------------------------------
CREATE TABLE public.transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id),
    type TEXT CHECK (type IN ('payment', 'deposit', 'payout', 'refund', 'subscription_fee', 'hold_fee')),
    amount NUMERIC NOT NULL,
    currency TEXT DEFAULT 'EUR',
    status TEXT CHECK (status IN ('pending', 'completed', 'failed', 'held', 'released', 'refunded', 'disputed')) DEFAULT 'pending',
    description TEXT,
    reference_id TEXT, -- Can be Event ID or other reference
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for Transactions
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own transactions" 
ON public.transactions FOR SELECT 
USING (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- 6. INVOICES
-- -----------------------------------------------------------------------------
CREATE TABLE public.invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id),
    transaction_id UUID REFERENCES public.transactions(id),
    amount NUMERIC NOT NULL,
    status TEXT CHECK (status IN ('paid', 'unpaid')) DEFAULT 'unpaid',
    download_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for Invoices
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own invoices" 
ON public.invoices FOR SELECT 
USING (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- 7. REVIEWS
-- -----------------------------------------------------------------------------
CREATE TABLE public.reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_id UUID REFERENCES public.service_providers(id) ON DELETE CASCADE,
    client_id UUID REFERENCES public.profiles(id),
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    content TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for Reviews
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reviews are viewable by everyone" 
ON public.reviews FOR SELECT 
USING (true);

CREATE POLICY "Clients can create reviews" 
ON public.reviews FOR INSERT 
WITH CHECK (auth.uid() = client_id);

-- -----------------------------------------------------------------------------
-- 8. CHAT MESSAGES
-- -----------------------------------------------------------------------------
CREATE TABLE public.chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id UUID REFERENCES public.profiles(id),
    receiver_id UUID REFERENCES public.profiles(id),
    content TEXT NOT NULL,
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for Chat Messages
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own messages" 
ON public.chat_messages FOR SELECT 
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can send messages" 
ON public.chat_messages FOR INSERT 
WITH CHECK (auth.uid() = sender_id);

-- -----------------------------------------------------------------------------
-- 9. AD CAMPAIGNS
-- -----------------------------------------------------------------------------
CREATE TABLE public.ad_campaigns (
    id TEXT PRIMARY KEY, -- Using TEXT to match the 'camp-...' format from service
    provider_id UUID REFERENCES public.service_providers(id) ON DELETE CASCADE,
    target_country TEXT,
    type TEXT,
    creative JSONB,
    duration TEXT,
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    budget_total NUMERIC,
    budget_spent NUMERIC DEFAULT 0,
    status TEXT,
    stats JSONB DEFAULT '{"impressions": 0, "clicks": 0, "reservations": 0, "revenueGenerated": 0, "ctr": 0, "score": 0}'::JSONB,
    events JSONB DEFAULT '[]'::JSONB,
    ai_analysis JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for Ad Campaigns
ALTER TABLE public.ad_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Providers can view their own campaigns" 
ON public.ad_campaigns FOR SELECT 
USING (EXISTS (SELECT 1 FROM public.service_providers WHERE service_providers.id = ad_campaigns.provider_id AND service_providers.owner_id = auth.uid()));

CREATE POLICY "Providers can create campaigns" 
ON public.ad_campaigns FOR INSERT 
WITH CHECK (EXISTS (SELECT 1 FROM public.service_providers WHERE service_providers.id = ad_campaigns.provider_id AND service_providers.owner_id = auth.uid()));

CREATE POLICY "Providers can update their own campaigns" 
ON public.ad_campaigns FOR UPDATE 
USING (EXISTS (SELECT 1 FROM public.service_providers WHERE service_providers.id = ad_campaigns.provider_id AND service_providers.owner_id = auth.uid()));

-- -----------------------------------------------------------------------------
-- 10. NOTIFICATIONS
-- -----------------------------------------------------------------------------
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    type TEXT,
    title TEXT,
    content TEXT,
    data JSONB DEFAULT '{}'::JSONB,
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for Notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications" 
ON public.notifications FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications" 
ON public.notifications FOR INSERT 
WITH CHECK (true); -- Ideally restricted to service role, but for simplicity here

-- -----------------------------------------------------------------------------
-- TRIGGERS & FUNCTIONS
-- -----------------------------------------------------------------------------

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url, role, phone)
  VALUES (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'full_name', 
    new.raw_user_meta_data->>'avatar_url',
    COALESCE(new.raw_user_meta_data->>'role', 'CLIENT'),
    new.raw_user_meta_data->>'phone'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user signup
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger to relevant tables
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_service_providers_updated_at BEFORE UPDATE ON public.service_providers FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON public.events FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- -----------------------------------------------------------------------------
-- 11. KYC REQUESTS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.kyc_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    provider_name TEXT,
    email TEXT,
    id_doc_path TEXT,
    selfie_doc_path TEXT,
    status TEXT CHECK (status IN ('pending', 'verified', 'rejected')) DEFAULT 'pending',
    rejection_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID
);

ALTER TABLE public.kyc_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create their own kyc request"
ON public.kyc_requests FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own kyc request"
ON public.kyc_requests FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all kyc requests"
ON public.kyc_requests FOR SELECT
USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'ADMIN'));

CREATE POLICY "Admins can update all kyc requests"
ON public.kyc_requests FOR UPDATE
USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'ADMIN'));

-- -----------------------------------------------------------------------------
-- STORAGE: KYC DOCUMENTS BUCKET & POLICIES
-- -----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('kyc-documents', 'kyc-documents', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload own kyc docs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'kyc-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can read own kyc docs"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'kyc-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Admins can read all kyc docs"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'kyc-documents'
    AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'ADMIN')
);
