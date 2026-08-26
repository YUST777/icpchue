-- Job Applications for ICPC HUE 2027 Community Roles
CREATE TABLE IF NOT EXISTS job_applications (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  student_id TEXT NOT NULL,
  phone TEXT NOT NULL,
  faculty TEXT NOT NULL,
  academic_level TEXT NOT NULL,
  national_id TEXT,
  
  -- Selected committees (array of: media, mentor, organizing, instructor)
  committees TEXT[] NOT NULL DEFAULT '{}',
  
  -- Media Committee fields
  media_skills TEXT[] DEFAULT '{}',
  has_camera BOOLEAN DEFAULT false,
  portfolio_link TEXT,
  
  -- Mentor Committee fields
  codeforces_handle TEXT,
  contest_experience TEXT,
  weekly_availability TEXT,
  
  -- Organizing Committee fields
  has_ecpc_tshirt BOOLEAN DEFAULT false,
  tshirt_size TEXT,
  campus_days TEXT,
  organizing_experience TEXT,
  
  -- Instructor fields
  preferred_teaching_level TEXT,
  teaching_experience TEXT,
  
  -- Meta
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Prevent duplicate applications
CREATE UNIQUE INDEX IF NOT EXISTS idx_job_applications_email ON job_applications(email);
CREATE UNIQUE INDEX IF NOT EXISTS idx_job_applications_student_id ON job_applications(student_id);

-- Enable RLS
ALTER TABLE job_applications ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts (public application form)
CREATE POLICY "Allow public inserts on job_applications"
  ON job_applications FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Allow authenticated reads (admin dashboard)
CREATE POLICY "Allow authenticated reads on job_applications"
  ON job_applications FOR SELECT
  TO authenticated
  USING (true);
