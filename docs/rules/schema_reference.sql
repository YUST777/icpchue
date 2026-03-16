-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.api_access_log (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  endpoint text NOT NULL,
  ip_address text,
  user_agent text,
  method text,
  status_code integer,
  accessed_at timestamp with time zone DEFAULT now(),
  CONSTRAINT api_access_log_pkey PRIMARY KEY (id)
);
CREATE TABLE public.applications (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  application_type text NOT NULL DEFAULT 'trainee'::text,
  name text NOT NULL,
  faculty text NOT NULL,
  student_id text NOT NULL UNIQUE,
  national_id text NOT NULL UNIQUE,
  student_level text NOT NULL,
  telephone text NOT NULL,
  address text,
  has_laptop boolean DEFAULT false,
  codeforces_profile text,
  leetcode_profile text,
  leetcode_data jsonb,
  codeforces_data jsonb,
  scraping_status text DEFAULT 'pending'::text,
  ip_address text,
  user_agent text,
  email text,
  submitted_at timestamp with time zone DEFAULT now(),
  telegram_username text,
  email_hash character varying,
  email_blind_index text,
  national_id_blind_index text,
  telephone_blind_index text,
  student_id_blind_index text,
  CONSTRAINT applications_pkey PRIMARY KEY (id)
);
CREATE TABLE public.email_verification_otps (
  email character varying NOT NULL,
  otp_code character varying NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT email_verification_otps_pkey PRIMARY KEY (email)
);
CREATE TABLE public.login_logs (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  ip_address text,
  user_agent text,
  logged_in_at timestamp with time zone DEFAULT now(),
  user_id bigint,
  CONSTRAINT login_logs_pkey PRIMARY KEY (id),
  CONSTRAINT login_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.news_reactions (
  id integer NOT NULL DEFAULT nextval('news_reactions_id_seq'::regclass),
  news_id character varying NOT NULL,
  user_id integer NOT NULL,
  reaction_type character varying NOT NULL CHECK (reaction_type::text = ANY (ARRAY['like'::character varying, 'heart'::character varying, 'fire'::character varying]::text[])),
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT news_reactions_pkey PRIMARY KEY (id),
  CONSTRAINT news_reactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.page_views (
  entity_type character varying NOT NULL,
  entity_id character varying NOT NULL,
  views_count bigint DEFAULT 0,
  CONSTRAINT page_views_pkey PRIMARY KEY (entity_type, entity_id)
);
CREATE TABLE public.password_resets (
  id integer NOT NULL DEFAULT nextval('password_resets_id_seq'::regclass),
  email character varying NOT NULL,
  token_hash text NOT NULL,
  expires_at timestamp without time zone NOT NULL,
  created_at timestamp without time zone DEFAULT now(),
  used boolean DEFAULT false,
  CONSTRAINT password_resets_pkey PRIMARY KEY (id)
);
CREATE TABLE public.problem_test_cases (
  id integer NOT NULL DEFAULT nextval('problem_test_cases_id_seq'::regclass),
  sheet_id text NOT NULL,
  problem_id text NOT NULL,
  input text NOT NULL,
  expected_output text NOT NULL,
  is_sample boolean DEFAULT false,
  is_hidden boolean DEFAULT false,
  ordinal integer NOT NULL DEFAULT 0,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT problem_test_cases_pkey PRIMARY KEY (id)
);
CREATE TABLE public.recap_2025 (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  student_id text NOT NULL UNIQUE,
  username text NOT NULL,
  avatar_url text,
  days_active integer DEFAULT 0,
  total_solved integer DEFAULT 0,
  total_submissions integer DEFAULT 0,
  top_problem text,
  top_problem_attempts integer DEFAULT 0,
  rank_percentile integer DEFAULT 100,
  max_streak integer DEFAULT 0,
  preferred_language text DEFAULT 'C++'::text,
  top_tags jsonb DEFAULT '[]'::jsonb,
  difficulty_solved jsonb DEFAULT '{"easy": 0, "hard": 0, "medium": 0}'::jsonb,
  achievements jsonb DEFAULT '[]'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  time_spent_minutes integer DEFAULT 0,
  CONSTRAINT recap_2025_pkey PRIMARY KEY (id)
);
CREATE TABLE public.training_submissions (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  user_id bigint NOT NULL,
  sheet_id text NOT NULL,
  problem_id text NOT NULL,
  source_code text NOT NULL,
  language text DEFAULT 'C++20 (GCC 13-64)'::text,
  verdict text NOT NULL,
  time_ms integer,
  memory_kb integer,
  test_cases_passed integer DEFAULT 0,
  total_test_cases integer DEFAULT 0,
  compile_error text,
  runtime_error text,
  submitted_at timestamp with time zone DEFAULT now(),
  ip_address text,
  tab_switches integer DEFAULT 0,
  paste_events integer DEFAULT 0,
  time_to_solve_seconds integer,
  attempt_number integer DEFAULT 1,
  CONSTRAINT training_submissions_pkey PRIMARY KEY (id),
  CONSTRAINT training_submissions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.user_achievements (
  id integer NOT NULL DEFAULT nextval('user_achievements_id_seq'::regclass),
  user_id bigint,
  achievement_id text NOT NULL,
  earned_at timestamp with time zone DEFAULT now(),
  seen boolean DEFAULT false,
  CONSTRAINT user_achievements_pkey PRIMARY KEY (id),
  CONSTRAINT user_achievements_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.users (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  application_id bigint,
  is_verified boolean DEFAULT false,
  last_login_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  profile_picture_url text,
  telegram_username text,
  role text DEFAULT 'trainee'::text,
  profile_visibility text DEFAULT 'public'::text,
  codeforces_data jsonb,
  codeforces_handle text,
  is_shadow_banned boolean DEFAULT false,
  cheating_flags integer DEFAULT 0,
  show_on_cf_leaderboard boolean DEFAULT true,
  show_on_sheets_leaderboard boolean DEFAULT true,
  show_public_profile boolean DEFAULT true,
  profile_picture character varying,
  email_blind_index text,
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.applications(id)
);
CREATE TABLE public.view_logs (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  user_id bigint NOT NULL,
  entity_type character varying NOT NULL,
  entity_id character varying NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT view_logs_pkey PRIMARY KEY (id)
);
CREATE TABLE public.website_analytics (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  path text NOT NULL,
  ip_address text,
  user_agent text,
  referer text,
  session_id text,
  country text,
  device_type text,
  browser text,
  os text,
  visited_at timestamp with time zone DEFAULT now(),
  CONSTRAINT website_analytics_pkey PRIMARY KEY (id)
);
