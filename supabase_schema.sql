-- Employees Table
CREATE TABLE employees (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL,
  department TEXT NOT NULL,
  salary NUMERIC NOT NULL,
  hiring_type TEXT NOT NULL DEFAULT 'CLT',
  hiring_date DATE DEFAULT CURRENT_DATE,
  status TEXT DEFAULT 'active',
  cpf TEXT,
  phone TEXT,
  birth_date DATE,
  gender TEXT,
  address TEXT,
  bank_name TEXT,
  bank_agency TEXT,
  bank_account TEXT,
  education_level TEXT
);

-- Job Openings Table
CREATE TABLE job_openings (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  title TEXT NOT NULL,
  department TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'open'
);

-- Candidates Table
CREATE TABLE candidates (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  job_id BIGINT REFERENCES job_openings(id),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  resume_path TEXT,
  status TEXT DEFAULT 'applied'
);

-- Shifts Table
CREATE TABLE shifts (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  employee_id BIGINT REFERENCES employees(id),
  date DATE NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL
);

-- Time Logs Table
CREATE TABLE time_logs (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  employee_id BIGINT REFERENCES employees(id),
  date DATE DEFAULT CURRENT_DATE,
  clock_in TIMESTAMPTZ,
  clock_out TIMESTAMPTZ
);

-- Bank of Hours Table
CREATE TABLE bank_of_hours (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  employee_id BIGINT REFERENCES employees(id),
  balance_minutes INTEGER DEFAULT 0,
  last_update DATE DEFAULT CURRENT_DATE
);

-- Interviews Table
CREATE TABLE interviews (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  candidate_id BIGINT REFERENCES candidates(id),
  job_id BIGINT REFERENCES job_openings(id),
  scheduled_at TIMESTAMPTZ NOT NULL,
  location TEXT,
  notes TEXT,
  status TEXT DEFAULT 'scheduled' -- scheduled, completed, cancelled
);

-- Enable Row Level Security (RLS)
-- For a simple integration, we can disable RLS or create policies.
-- For now, let's keep it simple and allow all operations for testing.
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_openings ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_of_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE interviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for testing" ON employees FOR ALL USING (true);
CREATE POLICY "Allow all for testing" ON job_openings FOR ALL USING (true);
CREATE POLICY "Allow all for testing" ON candidates FOR ALL USING (true);
CREATE POLICY "Allow all for testing" ON shifts FOR ALL USING (true);
CREATE POLICY "Allow all for testing" ON time_logs FOR ALL USING (true);
CREATE POLICY "Allow all for testing" ON bank_of_hours FOR ALL USING (true);
CREATE POLICY "Allow all for testing" ON interviews FOR ALL USING (true);

-- Storage Bucket for Resumes
-- You need to create a bucket named 'resumes' manually in Supabase dashboard.
