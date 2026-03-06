import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Calendar, 
  Clock, 
  Briefcase, 
  DollarSign, 
  BarChart3, 
  LayoutDashboard,
  Menu,
  X,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  Filter,
  MoreVertical,
  CheckCircle2,
  Clock3,
  History,
  Link as LinkIcon,
  ExternalLink,
  Copy,
  Check,
  Eye,
  Download
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  LineChart,
  Line
} from 'recharts';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from './lib/utils';
import { supabase } from './lib/supabase';

// --- Types ---
type View = 'dashboard' | 'recruitment' | 'employees' | 'schedules' | 'time' | 'payroll' | 'reports' | 'bank';

interface Company {
  id: string;
  name: string;
  cnpj?: string;
}

interface Employee {
  id: number;
  company_id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  salary: number;
  hiring_date: string;
  status: 'active' | 'inactive';
  cpf?: string;
  phone?: string;
  birth_date?: string;
  gender?: string;
  address?: string;
  bank_name?: string;
  bank_agency?: string;
  bank_account?: string;
  education_level?: string;
  hiring_type?: string;
}

interface Job {
  id: number;
  company_id: string;
  title: string;
  department: string;
  description: string;
  status: 'open' | 'closed';
}

interface TimeLog {
  id: number;
  employee_id: number;
  employee_name: string;
  date: string;
  clock_in: string | null;
  clock_out: string | null;
}

interface Shift {
  id: number;
  employee_id: number;
  employee_name: string;
  date: string;
  start_time: string;
  end_time: string;
}

interface BankRecord {
  id: number;
  employee_id: number;
  employee_name: string;
  employee_role: string;
  balance_minutes: number;
  last_update: string;
}

interface Candidate {
  id: number;
  company_id: string;
  job_id: number;
  job_title: string;
  name: string;
  email: string;
  resume_path: string | null;
  status: string;
}

interface Interview {
  id: number;
  company_id: string;
  candidate_id: number;
  candidate_name: string;
  job_id: number;
  job_title: string;
  scheduled_at: string;
  location: string;
  notes: string;
  status: 'scheduled' | 'completed' | 'cancelled';
}

// --- Components ---

const SidebarItem = ({ icon: Icon, label, active, onClick }: { icon: any, label: string, active: boolean, onClick: () => void }) => (
  <button
    onClick={onClick}
    className={cn(
      "flex items-center gap-3 w-full px-4 py-3 rounded-lg transition-all duration-200",
      active 
        ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200" 
        : "text-slate-600 hover:bg-indigo-50 hover:text-indigo-600"
    )}
  >
    <Icon size={20} />
    <span className="font-medium">{label}</span>
  </button>
);

const Card = ({ children, className, title }: { children: React.ReactNode, className?: string, title?: string, key?: React.Key }) => (
  <div className={cn("bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden", className)}>
    {title && (
      <div className="px-6 py-4 border-bottom border-slate-100 bg-slate-50/50">
        <h3 className="font-semibold text-slate-800">{title}</h3>
      </div>
    )}
    <div className="p-6">
      {children}
    </div>
  </div>
);

const StatCard = ({ title, value, subValue, trend, icon: Icon, color }: { title: string, value: string, subValue?: string, trend?: number, icon: any, color: string }) => (
  <Card className="relative overflow-hidden">
    <div className={cn("absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 rounded-full opacity-10", color)} />
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
        <h3 className="text-2xl font-bold text-slate-900">{value}</h3>
        {subValue && <p className="text-xs text-slate-400 mt-1">{subValue}</p>}
        {trend !== undefined && (
          <div className={cn("flex items-center gap-1 mt-2 text-xs font-medium", trend >= 0 ? "text-emerald-600" : "text-rose-600")}>
            {trend >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
            {Math.abs(trend)}% vs mês anterior
          </div>
        )}
      </div>
      <div className={cn("p-3 rounded-xl", color.replace('bg-', 'bg-opacity-20 text-'))}>
        <Icon size={24} />
      </div>
    </div>
  </Card>
);

// --- Main App ---

export default function App() {
  const [activeView, setActiveView] = useState<View>('dashboard');
  const [currentCompany, setCurrentCompany] = useState<Company | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [recruitmentTab, setRecruitmentTab] = useState<'jobs' | 'pipeline'>('jobs');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [timeLogs, setTimeLogs] = useState<TimeLog[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [bankOfHours, setBankOfHours] = useState<BankRecord[]>([]);
  const [payrollData, setPayrollData] = useState<{ total: number, byDepartment: any[] }>({ total: 0, byDepartment: [] });
  const [loading, setLoading] = useState(true);
  const [employeeSearch, setEmployeeSearch] = useState('');
  
  // Modal states
  const [adjustModal, setAdjustModal] = useState<{ isOpen: boolean, employeeId: number, employeeName: string }>({ isOpen: false, employeeId: 0, employeeName: '' });
  const [adjustValue, setAdjustValue] = useState<string>('');

  // Bank filters
  const [bankFilterBalance, setBankFilterBalance] = useState<'all' | 'positive' | 'negative' | 'zero'>('all');
  const [bankFilterDate, setBankFilterDate] = useState<string>('');

  // New Employee Modal
  const [isNewEmployeeModalOpen, setIsNewEmployeeModalOpen] = useState(false);
  const [isNewJobModalOpen, setIsNewJobModalOpen] = useState(false);
  const [isInterviewModalOpen, setIsInterviewModalOpen] = useState(false);
  const [selectedCandidateForInterview, setSelectedCandidateForInterview] = useState<Candidate | null>(null);
  const [newInterviewData, setNewInterviewData] = useState({ scheduled_at: '', location: '', notes: '' });
  const [newJobData, setNewJobData] = useState({ title: '', department: '', description: '' });
  const [selectedJobForCandidates, setSelectedJobForCandidates] = useState<Job | null>(null);
  const [copiedJobId, setCopiedJobId] = useState<number | null>(null);
  const [publicJobId, setPublicJobId] = useState<number | null>(null);
  const [publicJob, setPublicJob] = useState<Job | null>(null);
  const [applicationData, setApplicationData] = useState<{ name: string, email: string, resume: File | null }>({ name: '', email: '', resume: null });
  const [applicationStatus, setApplicationStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [previewResumeUrl, setPreviewResumeUrl] = useState<string | null>(null);
  const [newEmployeeData, setNewEmployeeData] = useState({
    name: '',
    email: '',
    role: '',
    department: '',
    salary: '',
    hiring_type: 'CLT',
    cpf: '',
    phone: '',
    birth_date: '',
    gender: '',
    address: '',
    bank_name: '',
    bank_agency: '',
    bank_account: '',
    education_level: ''
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const jobId = params.get('jobId');
    if (jobId) {
      setPublicJobId(parseInt(jobId));
      supabase.from('job_openings')
        .select('*')
        .eq('id', jobId)
        .single()
        .then(({ data }) => setPublicJob(data));
    }
  }, []);

  useEffect(() => {
    fetchCompanies();
  }, []);

  useEffect(() => {
    if (currentCompany) {
      fetchData();
    }
  }, [currentCompany]);

  const fetchCompanies = async () => {
    const { data, error } = await supabase.from('companies').select('*');
    if (data && data.length > 0) {
      setCompanies(data);
      // Auto-select first company for demo purposes
      if (!currentCompany) setCurrentCompany(data[0]);
    } else {
      setIsCompanyModalOpen(true);
    }
  };

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompanyName.trim()) return;

    const { data, error } = await supabase.from('companies').insert({
      name: newCompanyName
    }).select().single();

    if (error) {
      alert("Erro ao criar empresa: " + error.message);
      return;
    }

    if (data) {
      setCompanies([...companies, data]);
      setCurrentCompany(data);
      setIsCompanyModalOpen(false);
      setNewCompanyName('');
    }
  };

  const fetchData = async () => {
    if (!currentCompany) return;
    setLoading(true);
    try {
      const [
        { data: empData },
        { data: jobData },
        { data: logData },
        { data: shiftData },
        { data: bankData },
        { data: candidateData },
        { data: interviewData }
      ] = await Promise.all([
        supabase.from('employees').select('*').eq('company_id', currentCompany.id),
        supabase.from('job_openings').select('*').eq('company_id', currentCompany.id),
        supabase.from('time_logs').select('*, employees(name, company_id)').order('date', { ascending: false }),
        supabase.from('shifts').select('*, employees(name, company_id)'),
        supabase.from('bank_of_hours').select('*, employees(name, role, company_id)'),
        supabase.from('candidates').select('*, job_openings(title, company_id)'),
        supabase.from('interviews').select('*, candidates(name, company_id), job_openings(title, company_id)')
      ]);

      // Filter data that might not be directly filterable by company_id in the query due to joins
      // (Supabase can filter joined tables, but let's keep it simple for now or use proper filtering)
      
      if (empData) setEmployees(empData);
      if (jobData) setJobs(jobData);
      
      if (logData) {
        setTimeLogs(logData
          .filter(log => (log as any).employees?.company_id === currentCompany.id)
          .map(log => ({
            ...log,
            employee_name: (log as any).employees?.name || 'Desconhecido'
          })));
      }

      if (shiftData) {
        setShifts(shiftData
          .filter(shift => (shift as any).employees?.company_id === currentCompany.id)
          .map(shift => ({
            ...shift,
            employee_name: (shift as any).employees?.name || 'Desconhecido'
          })));
      }

      if (bankData) {
        setBankOfHours(bankData
          .filter(bank => (bank as any).employees?.company_id === currentCompany.id)
          .map(bank => ({
            ...bank,
            employee_name: (bank as any).employees?.name || 'Desconhecido',
            employee_role: (bank as any).employees?.role || 'Desconhecido'
          })));
      }

      if (candidateData) {
        setCandidates(candidateData
          .filter(candidate => (candidate as any).job_openings?.company_id === currentCompany.id)
          .map(candidate => ({
            ...candidate,
            job_title: (candidate as any).job_openings?.title || 'Desconhecido'
          })));
      }

      if (interviewData) {
        setInterviews((interviewData as any[])
          .filter(interview => interview.job_openings?.company_id === currentCompany.id)
          .map(interview => ({
            ...interview,
            candidate_name: interview.candidates?.name || 'Desconhecido',
            job_title: interview.job_openings?.title || 'Desconhecido'
          })));
      }

      // Calculate payroll forecast
      if (empData) {
        const activeEmployees = empData.filter(e => e.status === 'active');
        const total = activeEmployees.reduce((acc, e) => acc + e.salary, 0);
        const byDept = activeEmployees.reduce((acc: any[], e) => {
          const existing = acc.find(a => a.department === e.department);
          if (existing) {
            existing.total += e.salary;
          } else {
            acc.push({ department: e.department, total: e.salary });
          }
          return acc;
        }, []);
        setPayrollData({ total, byDepartment: byDept });
      }

    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePunch = async (employeeId: number, type: 'in' | 'out') => {
    if (!currentCompany) return;
    const now = new Date().toISOString();
    const today = now.split('T')[0];

    if (type === 'in') {
      await supabase.from('time_logs').insert({
        company_id: currentCompany.id,
        employee_id: employeeId,
        date: today,
        clock_in: now
      });
    } else {
      await supabase.from('time_logs')
        .update({ clock_out: now })
        .match({ employee_id: employeeId, date: today, company_id: currentCompany.id })
        .is('clock_out', null);
    }
    fetchData();
  };

  const handleAdjustBank = async (employeeId: number, minutes: number) => {
    const { data: currentBank } = await supabase
      .from('bank_of_hours')
      .select('balance_minutes')
      .eq('employee_id', employeeId)
      .single();

    if (currentBank) {
      await supabase
        .from('bank_of_hours')
        .update({ 
          balance_minutes: currentBank.balance_minutes + minutes,
          last_update: new Date().toISOString().split('T')[0]
        })
        .eq('employee_id', employeeId);
      fetchData();
    }
  };

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCompany) return;
    const { error } = await supabase.from('job_openings').insert({
      company_id: currentCompany.id,
      title: newJobData.title,
      department: newJobData.department,
      description: newJobData.description
    });

    if (error) {
      alert("Erro ao criar vaga: " + error.message);
      return;
    }

    setIsNewJobModalOpen(false);
    setNewJobData({ title: '', department: '', description: '' });
    fetchData();
  };

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!publicJobId) return;
    
    setApplicationStatus('loading');
    try {
      let resume_path = null;
      if (applicationData.resume) {
        const fileExt = applicationData.resume.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('resumes')
          .upload(filePath, applicationData.resume);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('resumes')
          .getPublicUrl(filePath);
        
        resume_path = publicUrl;
      }

      const { error: insertError } = await supabase.from('candidates').insert({
        company_id: publicJob.company_id,
        job_id: publicJobId,
        name: applicationData.name,
        email: applicationData.email,
        resume_path
      });

      if (insertError) throw insertError;

      setApplicationStatus('success');
    } catch (error) {
      console.error(error);
      setApplicationStatus('error');
    }
  };

  const handleUpdateCandidateStatus = async (candidateId: number, status: string) => {
    const { error } = await supabase
      .from('candidates')
      .update({ status })
      .eq('id', candidateId);

    if (error) {
      alert("Erro ao atualizar status: " + error.message);
      return;
    }
    fetchData();
  };

  const handleScheduleInterview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCandidateForInterview || !currentCompany) return;

    const { error } = await supabase.from('interviews').insert({
      company_id: currentCompany.id,
      candidate_id: selectedCandidateForInterview.id,
      job_id: selectedCandidateForInterview.job_id,
      scheduled_at: newInterviewData.scheduled_at,
      location: newInterviewData.location,
      notes: newInterviewData.notes
    });

    if (error) {
      alert("Erro ao agendar entrevista: " + error.message);
      return;
    }

    // Update candidate status to 'Entrevista Agendada'
    await supabase.from('candidates').update({ status: 'Entrevista Agendada' }).eq('id', selectedCandidateForInterview.id);

    setIsInterviewModalOpen(false);
    setSelectedCandidateForInterview(null);
    setNewInterviewData({ scheduled_at: '', location: '', notes: '' });
    fetchData();
  };

  const handleUpdateInterviewStatus = async (interviewId: number, status: 'completed' | 'cancelled', candidateId: number) => {
    const { error } = await supabase
      .from('interviews')
      .update({ status })
      .eq('id', interviewId);

    if (error) {
      alert("Erro ao atualizar entrevista: " + error.message);
      return;
    }

    if (status === 'completed') {
      await supabase.from('candidates').update({ status: 'Entrevistado' }).eq('id', candidateId);
    }

    fetchData();
  };

  const copyJobLink = (jobId: number) => {
    const url = `${window.location.origin}${window.location.pathname}?jobId=${jobId}`;
    navigator.clipboard.writeText(url);
    setCopiedJobId(jobId);
    setTimeout(() => setCopiedJobId(null), 2000);
  };

  const renderPublicForm = () => {
    if (!publicJob) return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent"></div>
      </div>
    );

    if (applicationStatus === 'success') {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
          <Card className="max-w-md w-full text-center py-12">
            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 size={40} />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Candidatura Enviada!</h2>
            <p className="text-slate-500 mb-8">Obrigado pelo interesse. Nossa equipe de RH entrará em contato em breve.</p>
            <button 
              onClick={() => window.location.href = window.location.pathname}
              className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all"
            >
              Voltar ao Início
            </button>
          </Card>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-slate-50 py-12 px-6">
        <div className="max-w-2xl mx-auto space-y-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white mx-auto mb-6 shadow-xl shadow-indigo-200">
              <Briefcase size={32} />
            </div>
            <h1 className="text-3xl font-black text-slate-900 mb-2">{publicJob.title}</h1>
            <p className="text-indigo-600 font-bold uppercase tracking-widest text-sm">{publicJob.department}</p>
          </div>

          <Card className="p-8">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Sobre a Vaga</h3>
            <p className="text-slate-600 leading-relaxed mb-8">{publicJob.description}</p>
            
            <div className="border-t border-slate-100 pt-8">
              <h3 className="text-lg font-bold text-slate-900 mb-6">Candidate-se Agora</h3>
              <form onSubmit={handleApply} className="space-y-6">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nome Completo</label>
                  <input 
                    required
                    type="text" 
                    value={applicationData.name}
                    onChange={(e) => setApplicationData({ ...applicationData, name: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    placeholder="Seu nome completo"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">E-mail para Contato</label>
                  <input 
                    required
                    type="email" 
                    value={applicationData.email}
                    onChange={(e) => setApplicationData({ ...applicationData, email: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    placeholder="seu.email@exemplo.com"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Currículo (PDF)</label>
                  <input 
                    required
                    type="file" 
                    accept=".pdf"
                    onChange={(e) => setApplicationData({ ...applicationData, resume: e.target.files?.[0] || null })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                  />
                  <p className="text-[10px] text-slate-400">Apenas arquivos PDF são aceitos (máx. 5MB).</p>
                </div>
                <button 
                  type="submit"
                  disabled={applicationStatus === 'loading'}
                  className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-50"
                >
                  {applicationStatus === 'loading' ? 'Enviando...' : 'Enviar Candidatura'}
                </button>
                {applicationStatus === 'error' && (
                  <p className="text-center text-rose-600 text-sm font-medium">Ocorreu um erro ao enviar sua candidatura. Tente novamente.</p>
                )}
              </form>
            </div>
          </Card>
          
          <p className="text-center text-slate-400 text-xs">
            Powered by RH Master System
          </p>
        </div>
      </div>
    );
  };

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const salaryValue = parseFloat(newEmployeeData.salary);
    if (isNaN(salaryValue)) {
      alert("Por favor, insira um valor de salário válido.");
      return;
    }

    if (!currentCompany) return;

    const { data, error } = await supabase.from('employees').insert({
      company_id: currentCompany.id,
      name: newEmployeeData.name,
      email: newEmployeeData.email,
      role: newEmployeeData.role,
      department: newEmployeeData.department,
      salary: salaryValue,
      hiring_type: newEmployeeData.hiring_type,
      cpf: newEmployeeData.cpf,
      phone: newEmployeeData.phone,
      birth_date: newEmployeeData.birth_date || null,
      gender: newEmployeeData.gender,
      address: newEmployeeData.address,
      bank_name: newEmployeeData.bank_name,
      bank_agency: newEmployeeData.bank_agency,
      bank_account: newEmployeeData.bank_account,
      education_level: newEmployeeData.education_level
    }).select().single();

    if (error) {
      console.error("Erro detalhado do Supabase:", error);
      alert(`Erro ao cadastrar funcionário: ${error.message}\n\nVerifique se as novas colunas foram criadas no banco de dados.`);
      return;
    }

    if (data) {
      await supabase.from('bank_of_hours').insert({
        company_id: currentCompany.id,
        employee_id: data.id,
        balance_minutes: 0
      });
    }

    setIsNewEmployeeModalOpen(false);
    setNewEmployeeData({ 
      name: '', email: '', role: '', department: '', salary: '', hiring_type: 'CLT',
      cpf: '', phone: '', birth_date: '', gender: '', address: '',
      bank_name: '', bank_agency: '', bank_account: '', education_level: ''
    });
    fetchData();
  };

  const renderDashboard = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Colaboradores" 
          value={employees.length.toString()} 
          trend={12} 
          icon={Users} 
          color="bg-indigo-600" 
        />
        <StatCard 
          title="Vagas Abertas" 
          value={jobs.length.toString()} 
          subValue="3 novos candidatos hoje" 
          icon={Briefcase} 
          color="bg-amber-500" 
        />
        <StatCard 
          title="Custo Folha (Previsto)" 
          value={`R$ ${payrollData.total.toLocaleString('pt-BR')}`} 
          trend={-2} 
          icon={DollarSign} 
          color="bg-emerald-500" 
        />
        <StatCard 
          title="Ponto Hoje" 
          value={`${timeLogs.filter(l => l.date === new Date().toISOString().split('T')[0]).length}/${employees.length}`} 
          subValue="Presença em tempo real" 
          icon={Clock} 
          color="bg-rose-500" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Distribuição de Custo por Departamento">
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={payrollData.byDepartment}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="department" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  cursor={{ fill: '#f8fafc' }}
                />
                <Bar dataKey="total" fill="#4f46e5" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Últimos Registros de Ponto">
          <div className="space-y-4">
            {timeLogs.slice(0, 5).map((log) => (
              <div key={log.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                    {log.employee_name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{log.employee_name}</p>
                    <p className="text-xs text-slate-500">{format(new Date(log.date), "dd 'de' MMMM", { locale: ptBR })}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-2 text-xs font-medium">
                    <span className="text-emerald-600">Entrada: {log.clock_in ? format(new Date(log.clock_in), 'HH:mm') : '--:--'}</span>
                    <span className="text-slate-300">|</span>
                    <span className="text-rose-600">Saída: {log.clock_out ? format(new Date(log.clock_out), 'HH:mm') : '--:--'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );

  const renderEmployees = () => {
    const filteredEmployees = employees.filter(emp => {
      const search = employeeSearch.toLowerCase();
      return (
        emp.name.toLowerCase().includes(search) ||
        emp.email.toLowerCase().includes(search) ||
        emp.role.toLowerCase().includes(search) ||
        emp.department.toLowerCase().includes(search)
      );
    });

    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h2 className="text-2xl font-bold text-slate-900">Gestão de Colaboradores</h2>
          <button 
            onClick={() => setIsNewEmployeeModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
          >
            <Plus size={20} />
            Novo Colaborador
          </button>
        </div>

        <Card className="p-0">
          <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Buscar por nome, e-mail, cargo ou departamento..." 
                value={employeeSearch}
                onChange={(e) => setEmployeeSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
            </div>
            <div className="flex gap-2">
              <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors">
                <Filter size={18} />
                Filtros
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Colaborador</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Cargo / Depto</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Contratação</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Salário</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEmployees.length > 0 ? filteredEmployees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                          {emp.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{emp.name}</p>
                          <p className="text-xs text-slate-500">{emp.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-slate-700 font-medium">{emp.role}</p>
                      <p className="text-xs text-slate-500">{emp.department}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-800">
                        {emp.hiring_type || 'CLT'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-slate-700 font-semibold">R$ {emp.salary.toLocaleString('pt-BR')}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium",
                        emp.status === 'active' ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700"
                      )}>
                        {emp.status === 'active' ? <CheckCircle2 size={12} /> : <Clock3 size={12} />}
                        {emp.status === 'active' ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-all">
                        <MoreVertical size={18} />
                      </button>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                      Nenhum colaborador encontrado para "{employeeSearch}".
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    );
  };

  const renderTimeTracking = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">Controle de Ponto</h2>
        <div className="text-right">
          <p className="text-sm font-medium text-slate-500">Hoje é</p>
          <p className="text-lg font-bold text-indigo-600">{format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1 bg-indigo-600 text-white border-none">
          <div className="space-y-6">
            <div className="text-center py-8">
              <p className="text-indigo-100 text-sm font-medium mb-2">Horário Atual</p>
              <h3 className="text-5xl font-black tracking-tighter">{format(new Date(), 'HH:mm:ss')}</h3>
            </div>
            
            <div className="space-y-3">
              <label className="text-xs font-semibold text-indigo-200 uppercase tracking-wider">Selecione o Colaborador</label>
              <select className="w-full bg-indigo-500/50 border border-indigo-400/30 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-white/20 transition-all">
                {employees.map(e => <option key={e.id} value={e.id} className="text-slate-900">{e.name}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => handlePunch(employees[0]?.id, 'in')}
                className="flex flex-col items-center gap-2 p-4 bg-white/10 hover:bg-white/20 rounded-2xl transition-all border border-white/10"
              >
                <ArrowUpRight size={24} />
                <span className="font-bold">Entrada</span>
              </button>
              <button 
                onClick={() => handlePunch(employees[0]?.id, 'out')}
                className="flex flex-col items-center gap-2 p-4 bg-white/10 hover:bg-white/20 rounded-2xl transition-all border border-white/10"
              >
                <ArrowDownRight size={24} />
                <span className="font-bold">Saída</span>
              </button>
            </div>
          </div>
        </Card>

        <Card title="Histórico Recente" className="lg:col-span-2">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="pb-4 text-xs font-semibold text-slate-500 uppercase">Colaborador</th>
                  <th className="pb-4 text-xs font-semibold text-slate-500 uppercase">Data</th>
                  <th className="pb-4 text-xs font-semibold text-slate-500 uppercase">Entrada</th>
                  <th className="pb-4 text-xs font-semibold text-slate-500 uppercase">Saída</th>
                  <th className="pb-4 text-xs font-semibold text-slate-500 uppercase">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {timeLogs.map((log) => (
                  <tr key={log.id} className="group">
                    <td className="py-4 text-sm font-medium text-slate-800">{log.employee_name}</td>
                    <td className="py-4 text-sm text-slate-500">{format(new Date(log.date), 'dd/MM/yyyy')}</td>
                    <td className="py-4 text-sm text-emerald-600 font-medium">{log.clock_in ? format(new Date(log.clock_in), 'HH:mm') : '--:--'}</td>
                    <td className="py-4 text-sm text-rose-600 font-medium">{log.clock_out ? format(new Date(log.clock_out), 'HH:mm') : '--:--'}</td>
                    <td className="py-4 text-sm text-slate-600">8h 00m</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );

  const renderBankOfHours = () => {
    const filteredBank = bankOfHours.filter(record => {
      const matchesBalance = 
        bankFilterBalance === 'all' ||
        (bankFilterBalance === 'positive' && record.balance_minutes > 0) ||
        (bankFilterBalance === 'negative' && record.balance_minutes < 0) ||
        (bankFilterBalance === 'zero' && record.balance_minutes === 0);
      
      const matchesDate = !bankFilterDate || record.last_update === bankFilterDate;
      
      return matchesBalance && matchesDate;
    });

    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-900">Banco de Horas</h2>
          <div className="flex gap-2">
            <button className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors">Relatório Mensal</button>
          </div>
        </div>

        <Card className="p-0">
          <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row gap-4 bg-slate-50/30">
            <div className="flex flex-col gap-1.5 flex-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">Filtrar por Saldo</label>
              <div className="flex p-1 bg-slate-100 rounded-xl w-fit">
                {(['all', 'positive', 'negative', 'zero'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setBankFilterBalance(type)}
                    className={cn(
                      "px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
                      bankFilterBalance === type 
                        ? "bg-white text-indigo-600 shadow-sm" 
                        : "text-slate-500 hover:text-slate-700"
                    )}
                  >
                    {type === 'all' ? 'Todos' : type === 'positive' ? 'Positivo' : type === 'negative' ? 'Negativo' : 'Zerado'}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">Última Atualização</label>
              <div className="flex gap-2">
                <input 
                  type="date" 
                  value={bankFilterDate}
                  onChange={(e) => setBankFilterDate(e.target.value)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all bg-white"
                />
                {bankFilterDate && (
                  <button 
                    onClick={() => setBankFilterDate('')}
                    className="p-2 text-slate-400 hover:text-rose-600 transition-colors"
                    title="Limpar data"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Colaborador</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Saldo Atual</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Última Atualização</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Ações Rápidas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredBank.length > 0 ? filteredBank.map((record) => {
                  const hours = Math.floor(Math.abs(record.balance_minutes) / 60);
                  const minutes = Math.abs(record.balance_minutes) % 60;
                  const isNegative = record.balance_minutes < 0;
                  const isZero = record.balance_minutes === 0;

                  return (
                    <tr key={record.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                            {record.employee_name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-800">{record.employee_name}</p>
                            <p className="text-xs text-slate-500">{record.employee_role}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className={cn(
                          "inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-sm font-bold",
                          isZero ? "bg-slate-100 text-slate-600" : isNegative ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"
                        )}>
                          {isZero ? '' : isNegative ? '-' : '+'}{hours}h {minutes}m
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-slate-500">{format(new Date(record.last_update), "dd/MM/yyyy")}</p>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => setAdjustModal({ isOpen: true, employeeId: record.employee_id, employeeName: record.employee_name })}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-indigo-100"
                          >
                            <History size={14} />
                            Ajustar
                          </button>
                          <div className="w-px h-4 bg-slate-100 mx-1" />
                          <button 
                            onClick={() => handleAdjustBank(record.employee_id, -60)}
                            className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Remover 1 hora"
                          >
                            <Plus className="rotate-45" size={18} />
                          </button>
                          <button 
                            onClick={() => handleAdjustBank(record.employee_id, 60)}
                            className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Adicionar 1 hora"
                          >
                            <Plus size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                      Nenhum registro encontrado com os filtros selecionados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card title="Resumo do Banco">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-500">Total de Horas Positivas</span>
                <span className="text-sm font-bold text-emerald-600">
                  {Math.floor(bankOfHours.reduce((acc, r) => acc + (r.balance_minutes > 0 ? r.balance_minutes : 0), 0) / 60)}h
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-500">Total de Horas Negativas</span>
                <span className="text-sm font-bold text-rose-600">
                  {Math.floor(Math.abs(bankOfHours.reduce((acc, r) => acc + (r.balance_minutes < 0 ? r.balance_minutes : 0), 0)) / 60)}h
                </span>
              </div>
            </div>
          </Card>
          <Card className="bg-indigo-50 border-indigo-100">
            <h4 className="text-sm font-bold text-indigo-900 mb-2">Política de Banco de Horas</h4>
            <p className="text-xs text-indigo-700 leading-relaxed">
              As horas excedentes devem ser compensadas em até 6 meses conforme acordo coletivo. Horas negativas acima de 20h devem ser justificadas ao gestor.
            </p>
          </Card>
        </div>
      </div>
    );
  };

  const renderRecruitment = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Recrutamento e Seleção</h2>
          <div className="flex p-1 bg-slate-100 rounded-xl w-fit mt-2">
            <button
              onClick={() => setRecruitmentTab('jobs')}
              className={cn(
                "px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
                recruitmentTab === 'jobs' 
                  ? "bg-white text-indigo-600 shadow-sm" 
                  : "text-slate-500 hover:text-slate-700"
              )}
            >
              Vagas Abertas
            </button>
            <button
              onClick={() => setRecruitmentTab('pipeline')}
              className={cn(
                "px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
                recruitmentTab === 'pipeline' 
                  ? "bg-white text-indigo-600 shadow-sm" 
                  : "text-slate-500 hover:text-slate-700"
              )}
            >
              Pipeline de Candidatos
            </button>
          </div>
        </div>
        <button 
          onClick={() => setIsNewJobModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
        >
          <Plus size={20} />
          Nova Vaga
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {recruitmentTab === 'jobs' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {jobs.map((job) => (
                <Card key={job.id} className="hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-4">
                    <span className="px-2 py-1 bg-indigo-50 text-indigo-600 text-xs font-bold rounded-lg uppercase tracking-wider">{job.department}</span>
                    <span className={cn(
                      "px-2 py-1 text-xs font-bold rounded-lg uppercase tracking-wider",
                      job.status === 'open' ? "bg-emerald-50 text-emerald-600" : "bg-slate-50 text-slate-600"
                    )}>{job.status === 'open' ? 'Aberta' : 'Fechada'}</span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">{job.title}</h3>
                  <p className="text-sm text-slate-500 line-clamp-2 mb-6">{job.description}</p>
                  <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                    <div className="flex gap-2">
                      <button 
                        onClick={() => copyJobLink(job.id)}
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                          copiedJobId === job.id 
                            ? "bg-emerald-50 text-emerald-600 border border-emerald-100" 
                            : "bg-slate-50 text-slate-600 border border-slate-100 hover:bg-slate-100"
                        )}
                      >
                        {copiedJobId === job.id ? <Check size={14} /> : <LinkIcon size={14} />}
                        {copiedJobId === job.id ? 'Copiado!' : 'Divulgar'}
                      </button>
                    </div>
                    <button 
                      onClick={() => setSelectedJobForCandidates(job)}
                      className="text-indigo-600 text-sm font-bold hover:underline"
                    >
                      Ver Candidatos ({candidates.filter(c => c.job_id === job.id).length})
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50/50">
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Candidato</th>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Vaga</th>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {candidates.map((candidate) => (
                      <tr key={candidate.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold">
                              {candidate.name.charAt(0)}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-800">{candidate.name}</p>
                              <p className="text-[10px] text-slate-500">{candidate.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-xs font-medium text-slate-700">{candidate.job_title}</p>
                        </td>
                        <td className="px-6 py-4">
                          <select 
                            value={candidate.status} 
                            onChange={(e) => handleUpdateCandidateStatus(candidate.id, e.target.value)}
                            className={cn(
                              "text-[10px] font-bold rounded uppercase tracking-wider px-2 py-1 border border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer transition-all",
                              candidate.status === 'applied' ? "bg-blue-50 text-blue-600" :
                              candidate.status === 'Em análise' ? "bg-amber-50 text-amber-600" :
                              candidate.status === 'Entrevista Agendada' ? "bg-indigo-50 text-indigo-600" :
                              candidate.status === 'Entrevistado' ? "bg-indigo-50 text-indigo-600" :
                              candidate.status === 'Contratado' ? "bg-emerald-50 text-emerald-600" :
                              candidate.status === 'Rejeitado' ? "bg-rose-50 text-rose-600" : "bg-slate-50 text-slate-600"
                            )}
                          >
                            <option value="applied">Novo</option>
                            <option value="Em análise">Em análise</option>
                            <option value="Entrevista Agendada">Entrevista Agendada</option>
                            <option value="Entrevistado">Entrevistado</option>
                            <option value="Contratado">Contratado</option>
                            <option value="Rejeitado">Rejeitado</option>
                          </select>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {candidate.resume_path && (
                              <button 
                                onClick={() => setPreviewResumeUrl(candidate.resume_path)}
                                className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                title="Ver Currículo"
                              >
                                <Eye size={16} />
                              </button>
                            )}
                            <button 
                              onClick={() => {
                                setSelectedCandidateForInterview(candidate);
                                setIsInterviewModalOpen(true);
                              }}
                              className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                              title="Agendar Entrevista"
                            >
                              <Calendar size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card title="Entrevistas Agendadas">
            <div className="space-y-4">
              {interviews.filter(i => i.status === 'scheduled').length > 0 ? interviews.filter(i => i.status === 'scheduled').map((interview) => (
                <div key={interview.id} className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-bold text-slate-900">{interview.candidate_name}</p>
                      <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">{interview.job_title}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-indigo-600">{format(new Date(interview.scheduled_at), 'HH:mm')}</p>
                      <p className="text-[10px] text-slate-400">{format(new Date(interview.scheduled_at), 'dd/MM/yyyy')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-slate-500">
                    <LinkIcon size={10} />
                    <span className="truncate">{interview.location}</span>
                  </div>
                  {interview.notes && (
                    <div className="p-2 bg-indigo-50/50 rounded-lg text-[10px] text-indigo-700 italic border border-indigo-100/50">
                      "{interview.notes}"
                    </div>
                  )}
                  <div className="flex gap-2 pt-1">
                    <button 
                      onClick={() => handleUpdateInterviewStatus(interview.id, 'completed', interview.candidate_id)}
                      className="flex-1 py-1.5 bg-emerald-50 text-emerald-600 text-[10px] font-bold rounded-lg hover:bg-emerald-100 transition-all border border-emerald-100"
                    >
                      Concluir
                    </button>
                    <button 
                      onClick={() => handleUpdateInterviewStatus(interview.id, 'cancelled', interview.candidate_id)}
                      className="flex-1 py-1.5 bg-rose-50 text-rose-600 text-[10px] font-bold rounded-lg hover:bg-rose-100 transition-all border border-rose-100"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )) : (
                <p className="text-center text-slate-400 text-sm py-4">Nenhuma entrevista agendada.</p>
              )}
            </div>
          </Card>

          <Card title="Funil de Recrutamento">
            <div className="space-y-4">
              {[
                { label: 'Novos', count: candidates.filter(c => c.status === 'applied').length, color: 'bg-blue-500' },
                { label: 'Em Análise', count: candidates.filter(c => c.status === 'Em análise').length, color: 'bg-amber-500' },
                { label: 'Entrevistas', count: candidates.filter(c => c.status === 'Entrevista Agendada' || c.status === 'Entrevistado').length, color: 'bg-indigo-500' },
                { label: 'Contratados', count: candidates.filter(c => c.status === 'Contratado').length, color: 'bg-emerald-500' },
              ].map((step) => (
                <div key={step.label} className="space-y-1">
                  <div className="flex justify-between text-xs font-bold uppercase tracking-wider">
                    <span className="text-slate-500">{step.label}</span>
                    <span className="text-slate-900">{step.count}</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className={cn("h-full rounded-full transition-all duration-500", step.color)}
                      style={{ width: `${candidates.length > 0 ? (step.count / candidates.length) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );

  const renderPayroll = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">Folha de Pagamento</h2>
        <div className="flex gap-2">
          <button className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors">Exportar PDF</button>
          <button className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200">Fechar Mês</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <h3 className="text-lg font-bold text-slate-900 mb-6">Previsão de Custos Mensais</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={[
                { month: 'Jan', cost: 22000 },
                { month: 'Fev', cost: 23500 },
                { month: 'Mar', cost: 23200 },
                { month: 'Abr', cost: 25000 },
                { month: 'Mai', cost: 24800 },
                { month: 'Jun', cost: 26000 },
              ]}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Line type="monotone" dataKey="cost" stroke="#4f46e5" strokeWidth={3} dot={{ r: 4, fill: '#4f46e5' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <div className="space-y-6">
          <Card title="Resumo Geral">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-500">Salários Brutos</span>
                <span className="text-sm font-bold text-slate-900">R$ {payrollData.total.toLocaleString('pt-BR')}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-500">Encargos (FGTS/INSS)</span>
                <span className="text-sm font-bold text-slate-900">R$ {(payrollData.total * 0.28).toLocaleString('pt-BR')}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-500">Benefícios</span>
                <span className="text-sm font-bold text-slate-900">R$ {(employees.length * 850).toLocaleString('pt-BR')}</span>
              </div>
              <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                <span className="text-base font-bold text-slate-900">Total Estimado</span>
                <span className="text-xl font-black text-indigo-600">R$ {(payrollData.total * 1.28 + employees.length * 850).toLocaleString('pt-BR')}</span>
              </div>
            </div>
          </Card>
          
          <Card className="bg-slate-900 text-white border-none">
            <h4 className="text-sm font-bold text-indigo-400 uppercase tracking-wider mb-2">Dica de Gestão</h4>
            <p className="text-sm text-slate-300 leading-relaxed">
              O custo da folha aumentou 8% este trimestre devido a novas contratações no setor de TI. Considere revisar o banco de horas para reduzir horas extras.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );

  if (publicJobId) {
    return renderPublicForm();
  }

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* Sidebar */}
      <aside className="w-72 bg-white border-r border-slate-200 p-6 flex flex-col gap-8 hidden lg:flex">
        <div className="flex items-center gap-3 px-2">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
            <Users size={24} />
          </div>
          <h1 className="text-xl font-black tracking-tight text-slate-900">RH<span className="text-indigo-600">MASTER</span></h1>
        </div>

        <div className="px-2 space-y-1.5">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2">Empresa Ativa</label>
          <div className="relative group">
            <select 
              value={currentCompany?.id || ''} 
              onChange={(e) => {
                const company = companies.find(c => c.id === e.target.value);
                if (company) setCurrentCompany(company);
              }}
              className="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer"
            >
              {companies.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
              <Plus size={16} className="rotate-45" />
            </div>
          </div>
          <button 
            onClick={() => setIsCompanyModalOpen(true)}
            className="flex items-center gap-2 px-2 py-1 text-[10px] font-bold text-indigo-600 hover:text-indigo-700 transition-colors"
          >
            <Plus size={12} />
            Nova Empresa
          </button>
        </div>

        <nav className="flex-1 space-y-2">
          <SidebarItem icon={LayoutDashboard} label="Dashboard" active={activeView === 'dashboard'} onClick={() => setActiveView('dashboard')} />
          <SidebarItem icon={Users} label="Colaboradores" active={activeView === 'employees'} onClick={() => setActiveView('employees')} />
          <SidebarItem icon={Briefcase} label="Recrutamento" active={activeView === 'recruitment'} onClick={() => setActiveView('recruitment')} />
          <SidebarItem icon={Calendar} label="Escalas" active={activeView === 'schedules'} onClick={() => setActiveView('schedules')} />
          <SidebarItem icon={Clock} label="Controle de Ponto" active={activeView === 'time'} onClick={() => setActiveView('time')} />
          <SidebarItem icon={History} label="Banco de Horas" active={activeView === 'bank'} onClick={() => setActiveView('bank')} />
          <SidebarItem icon={DollarSign} label="Folha de Pagamento" active={activeView === 'payroll'} onClick={() => setActiveView('payroll')} />
          <SidebarItem icon={BarChart3} label="Relatórios" active={activeView === 'reports'} onClick={() => setActiveView('reports')} />
        </nav>

        <div className="mt-auto p-4 bg-slate-50 rounded-2xl border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">A</div>
            <div>
              <p className="text-sm font-bold text-slate-800">Admin User</p>
              <p className="text-xs text-slate-500">Diretor de RH</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 lg:p-12 overflow-y-auto max-w-7xl mx-auto w-full">
        <header className="flex items-center justify-between mb-8 lg:hidden">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
              <Users size={18} />
            </div>
            <h1 className="text-lg font-black tracking-tight">RH MASTER</h1>
          </div>
          <button className="p-2 text-slate-600">
            <Menu size={24} />
          </button>
        </header>

        {loading ? (
          <div className="flex items-center justify-center h-[60vh]">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent"></div>
          </div>
        ) : (
          <>
            {activeView === 'dashboard' && renderDashboard()}
            {activeView === 'employees' && renderEmployees()}
            {activeView === 'recruitment' && renderRecruitment()}
            {activeView === 'time' && renderTimeTracking()}
            {activeView === 'bank' && renderBankOfHours()}
            {activeView === 'payroll' && renderPayroll()}
            {['schedules', 'reports'].includes(activeView) && (
              <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
                <div className="p-6 bg-indigo-50 rounded-full text-indigo-600">
                  <LayoutDashboard size={48} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Módulo em Desenvolvimento</h3>
                  <p className="text-slate-500">Esta funcionalidade está sendo preparada para você.</p>
                </div>
                <button onClick={() => setActiveView('dashboard')} className="text-indigo-600 font-semibold hover:underline">Voltar ao Dashboard</button>
              </div>
            )}
          </>
        )}
      </main>

      {/* Interview Modal */}
      {isInterviewModalOpen && selectedCandidateForInterview && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-bold text-slate-800">Agendar Entrevista</h3>
              <button 
                onClick={() => setIsInterviewModalOpen(false)}
                className="p-1 hover:bg-slate-200 rounded-lg transition-colors text-slate-400"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleScheduleInterview} className="p-6 space-y-4">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Candidato</p>
                <p className="text-sm font-bold text-slate-900">{selectedCandidateForInterview.name}</p>
                <p className="text-xs text-slate-500">{selectedCandidateForInterview.job_title}</p>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Data e Hora</label>
                <input 
                  required
                  type="datetime-local" 
                  value={newInterviewData.scheduled_at}
                  onChange={(e) => setNewInterviewData({ ...newInterviewData, scheduled_at: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Local / Link</label>
                <input 
                  required
                  type="text" 
                  value={newInterviewData.location}
                  onChange={(e) => setNewInterviewData({ ...newInterviewData, location: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  placeholder="Ex: Google Meet ou Sala 2"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Observações</label>
                <textarea 
                  value={newInterviewData.notes}
                  onChange={(e) => setNewInterviewData({ ...newInterviewData, notes: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all min-h-[80px]"
                  placeholder="Instruções adicionais..."
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button 
                  type="button"
                  onClick={() => setIsInterviewModalOpen(false)}
                  className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
                >
                  Confirmar Agendamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Job Modal */}
      {isNewJobModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-bold text-slate-800">Criar Nova Vaga</h3>
              <button 
                onClick={() => setIsNewJobModalOpen(false)}
                className="p-1 hover:bg-slate-200 rounded-lg transition-colors text-slate-400"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateJob} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Título da Vaga</label>
                <input 
                  required
                  type="text" 
                  value={newJobData.title}
                  onChange={(e) => setNewJobData({ ...newJobData, title: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  placeholder="Ex: Desenvolvedor Frontend"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Departamento</label>
                <select 
                  required
                  value={newJobData.department}
                  onChange={(e) => setNewJobData({ ...newJobData, department: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                >
                  <option value="">Selecione um departamento</option>
                  <option value="Tecnologia">Tecnologia</option>
                  <option value="RH">RH</option>
                  <option value="Financeiro">Financeiro</option>
                  <option value="Vendas">Vendas</option>
                  <option value="Marketing">Marketing</option>
                  <option value="Operações">Operações</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Descrição</label>
                <textarea 
                  required
                  value={newJobData.description}
                  onChange={(e) => setNewJobData({ ...newJobData, description: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all min-h-[100px]"
                  placeholder="Descreva as responsabilidades e requisitos..."
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button 
                  type="button"
                  onClick={() => setIsNewJobModalOpen(false)}
                  className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
                >
                  Criar Vaga
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Candidates Modal */}
      {selectedJobForCandidates && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Candidatos: {selectedJobForCandidates.title}</h3>
                <p className="text-xs text-slate-500 uppercase tracking-wider font-bold">{selectedJobForCandidates.department}</p>
              </div>
              <button 
                onClick={() => setSelectedJobForCandidates(null)}
                className="p-2 hover:bg-slate-200 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              {candidates.filter(c => c.job_id === selectedJobForCandidates.id).length > 0 ? (
                <div className="space-y-4">
                  {candidates
                    .filter(c => c.job_id === selectedJobForCandidates.id)
                    .map((candidate) => (
                      <div key={candidate.id} className="flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:border-indigo-100 hover:bg-indigo-50/30 transition-all group">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
                            {candidate.name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-800">{candidate.name}</p>
                            <p className="text-xs text-slate-500">{candidate.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <select 
                            value={candidate.status} 
                            onChange={(e) => handleUpdateCandidateStatus(candidate.id, e.target.value)}
                            className={cn(
                              "text-[10px] font-bold rounded uppercase tracking-wider px-2 py-1 border border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer transition-all",
                              candidate.status === 'applied' ? "bg-blue-50 text-blue-600" :
                              candidate.status === 'Em análise' ? "bg-amber-50 text-amber-600" :
                              candidate.status === 'Entrevista Agendada' ? "bg-indigo-50 text-indigo-600" :
                              candidate.status === 'Entrevistado' ? "bg-indigo-50 text-indigo-600" :
                              candidate.status === 'Contratado' ? "bg-emerald-50 text-emerald-600" :
                              candidate.status === 'Rejeitado' ? "bg-rose-50 text-rose-600" : "bg-slate-50 text-slate-600"
                            )}
                          >
                            <option value="applied">Novo</option>
                            <option value="Em análise">Em análise</option>
                            <option value="Entrevista Agendada">Entrevista Agendada</option>
                            <option value="Entrevistado">Entrevistado</option>
                            <option value="Contratado">Contratado</option>
                            <option value="Rejeitado">Rejeitado</option>
                          </select>
                          <div className="flex items-center gap-2">
                            {candidate.status !== 'Contratado' && candidate.status !== 'Rejeitado' && (
                              <button 
                                onClick={() => {
                                  setSelectedCandidateForInterview(candidate);
                                  setIsInterviewModalOpen(true);
                                }}
                                className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                title="Agendar Entrevista"
                              >
                                <Calendar size={18} />
                              </button>
                            )}
                            {candidate.resume_path && (
                              <>
                                <button 
                                  onClick={() => setPreviewResumeUrl(candidate.resume_path)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold hover:bg-indigo-100 transition-all"
                                >
                                  <Eye size={14} />
                                  Visualizar
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                    <Users size={32} />
                  </div>
                  <p className="text-slate-500 font-medium">Nenhum candidato inscrito ainda.</p>
                  <p className="text-xs text-slate-400 mt-1">Divulgue o link da vaga para receber currículos.</p>
                </div>
              )}
            </div>
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button 
                onClick={() => setSelectedJobForCandidates(null)}
                className="px-6 py-2 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Resume Preview Modal */}
      {previewResumeUrl && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-bold text-slate-800">Visualização de Currículo</h3>
              <div className="flex items-center gap-2">
                <a 
                  href={previewResumeUrl} 
                  download
                  className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-colors text-sm font-bold"
                >
                  <Download size={16} />
                  Baixar
                </a>
                <button 
                  onClick={() => setPreviewResumeUrl(null)}
                  className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className="flex-1 bg-slate-100 p-4">
              <iframe 
                src={`${previewResumeUrl}#toolbar=0`} 
                className="w-full h-full rounded-lg border border-slate-200 shadow-inner bg-white"
                title="Resume Preview"
              />
            </div>
          </div>
        </div>
      )}

      {/* Adjustment Modal */}
      {adjustModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-bold text-slate-800">Ajustar Banco de Horas</h3>
              <button 
                onClick={() => setAdjustModal({ ...adjustModal, isOpen: false })}
                className="p-1 hover:bg-slate-200 rounded-lg transition-colors text-slate-400"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <p className="text-sm text-slate-500 mb-1">Colaborador</p>
                <p className="font-bold text-slate-900">{adjustModal.employeeName}</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Minutos para ajustar</label>
                <input 
                  type="number" 
                  value={adjustValue}
                  onChange={(e) => setAdjustValue(e.target.value)}
                  placeholder="Ex: 60 para +1h ou -30 para -30min"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-mono"
                  autoFocus
                />
                <p className="text-[10px] text-slate-400">Use valores positivos para adicionar e negativos para remover minutos.</p>
              </div>
            </div>
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
              <button 
                onClick={() => setAdjustModal({ ...adjustModal, isOpen: false })}
                className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-slate-600 font-bold hover:bg-white transition-all"
              >
                Cancelar
              </button>
              <button 
                onClick={() => {
                  const mins = parseInt(adjustValue);
                  if (!isNaN(mins)) {
                    handleAdjustBank(adjustModal.employeeId, mins);
                    setAdjustModal({ ...adjustModal, isOpen: false });
                    setAdjustValue('');
                  }
                }}
                className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Employee Modal */}
      {isNewEmployeeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-bold text-slate-800 text-lg">Cadastrar Novo Colaborador</h3>
              <button 
                onClick={() => setIsNewEmployeeModalOpen(false)}
                className="p-1 hover:bg-slate-200 rounded-lg transition-colors text-slate-400"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateEmployee}>
              <div className="p-6 space-y-8 max-h-[70vh] overflow-y-auto">
                {/* Seção: Informações Pessoais */}
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-indigo-600 uppercase tracking-widest border-b border-indigo-100 pb-1">Informações Pessoais</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nome Completo</label>
                      <input 
                        required
                        type="text" 
                        value={newEmployeeData.name}
                        onChange={(e) => setNewEmployeeData({ ...newEmployeeData, name: e.target.value })}
                        placeholder="Ex: João Silva"
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">CPF</label>
                      <input 
                        type="text" 
                        value={newEmployeeData.cpf}
                        onChange={(e) => setNewEmployeeData({ ...newEmployeeData, cpf: e.target.value })}
                        placeholder="000.000.000-00"
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Telefone</label>
                      <input 
                        type="text" 
                        value={newEmployeeData.phone}
                        onChange={(e) => setNewEmployeeData({ ...newEmployeeData, phone: e.target.value })}
                        placeholder="(00) 00000-0000"
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Data de Nascimento</label>
                      <input 
                        type="date" 
                        value={newEmployeeData.birth_date}
                        onChange={(e) => setNewEmployeeData({ ...newEmployeeData, birth_date: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all bg-white"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Gênero</label>
                      <select 
                        value={newEmployeeData.gender}
                        onChange={(e) => setNewEmployeeData({ ...newEmployeeData, gender: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all bg-white"
                      >
                        <option value="">Selecione...</option>
                        <option value="Masculino">Masculino</option>
                        <option value="Feminino">Feminino</option>
                        <option value="Outro">Outro</option>
                        <option value="Prefiro não dizer">Prefiro não dizer</option>
                      </select>
                    </div>
                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Endereço Completo</label>
                      <input 
                        type="text" 
                        value={newEmployeeData.address}
                        onChange={(e) => setNewEmployeeData({ ...newEmployeeData, address: e.target.value })}
                        placeholder="Rua, Número, Bairro, Cidade - UF"
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                      />
                    </div>
                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Escolaridade</label>
                      <select 
                        value={newEmployeeData.education_level}
                        onChange={(e) => setNewEmployeeData({ ...newEmployeeData, education_level: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all bg-white"
                      >
                        <option value="">Selecione...</option>
                        <option value="Ensino Médio Incompleto">Ensino Médio Incompleto</option>
                        <option value="Ensino Médio Completo">Ensino Médio Completo</option>
                        <option value="Ensino Superior Incompleto">Ensino Superior Incompleto</option>
                        <option value="Ensino Superior Completo">Ensino Superior Completo</option>
                        <option value="Pós-graduação / Mestrado / Doutorado">Pós-graduação / Mestrado / Doutorado</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Seção: Informações Profissionais */}
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-indigo-600 uppercase tracking-widest border-b border-indigo-100 pb-1">Informações Profissionais</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">E-mail Corporativo</label>
                      <input 
                        required
                        type="email" 
                        value={newEmployeeData.email}
                        onChange={(e) => setNewEmployeeData({ ...newEmployeeData, email: e.target.value })}
                        placeholder="joao@empresa.com"
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cargo</label>
                      <input 
                        required
                        type="text" 
                        value={newEmployeeData.role}
                        onChange={(e) => setNewEmployeeData({ ...newEmployeeData, role: e.target.value })}
                        placeholder="Ex: Desenvolvedor Senior"
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Departamento</label>
                      <select 
                        required
                        value={newEmployeeData.department}
                        onChange={(e) => setNewEmployeeData({ ...newEmployeeData, department: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all bg-white"
                      >
                        <option value="">Selecione...</option>
                        <option value="Tecnologia">Tecnologia</option>
                        <option value="RH">RH</option>
                        <option value="Financeiro">Financeiro</option>
                        <option value="Vendas">Vendas</option>
                        <option value="Marketing">Marketing</option>
                        <option value="Operações">Operações</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tipo de Contratação</label>
                      <select 
                        required
                        value={newEmployeeData.hiring_type}
                        onChange={(e) => setNewEmployeeData({ ...newEmployeeData, hiring_type: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all bg-white"
                      >
                        <option value="CLT">CLT</option>
                        <option value="INTERMITENTE">INTERMITENTE</option>
                        <option value="DIARISTA">DIARISTA</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Salário Base (R$)</label>
                      <input 
                        required
                        type="number" 
                        step="0.01"
                        value={newEmployeeData.salary}
                        onChange={(e) => setNewEmployeeData({ ...newEmployeeData, salary: e.target.value })}
                        placeholder="Ex: 5000.00"
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Seção: Dados Bancários */}
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-indigo-600 uppercase tracking-widest border-b border-indigo-100 pb-1">Dados Bancários</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Banco</label>
                      <input 
                        type="text" 
                        value={newEmployeeData.bank_name}
                        onChange={(e) => setNewEmployeeData({ ...newEmployeeData, bank_name: e.target.value })}
                        placeholder="Ex: Itaú, Bradesco, Nubank..."
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Agência</label>
                      <input 
                        type="text" 
                        value={newEmployeeData.bank_agency}
                        onChange={(e) => setNewEmployeeData({ ...newEmployeeData, bank_agency: e.target.value })}
                        placeholder="0000"
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Conta Corrente</label>
                      <input 
                        type="text" 
                        value={newEmployeeData.bank_account}
                        onChange={(e) => setNewEmployeeData({ ...newEmployeeData, bank_account: e.target.value })}
                        placeholder="00000-0"
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setIsNewEmployeeModalOpen(false)}
                  className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-slate-600 font-bold hover:bg-white transition-all"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
                >
                  Salvar Colaborador
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Company Modal */}
      {isCompanyModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-bold text-slate-800">Configurar Empresa</h3>
              {companies.length > 0 && (
                <button 
                  onClick={() => setIsCompanyModalOpen(false)}
                  className="p-1 hover:bg-slate-200 rounded-lg transition-colors text-slate-400"
                >
                  <X size={20} />
                </button>
              )}
            </div>
            <form onSubmit={handleCreateCompany} className="p-6 space-y-4">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Briefcase size={32} />
                </div>
                <h4 className="text-lg font-bold text-slate-900">Bem-vindo ao RH Master</h4>
                <p className="text-sm text-slate-500">Para começar, cadastre sua empresa ou selecione uma existente.</p>
              </div>
              
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nome da Empresa</label>
                <input 
                  required
                  type="text" 
                  value={newCompanyName}
                  onChange={(e) => setNewCompanyName(e.target.value)}
                  placeholder="Ex: Minha Empresa LTDA"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  autoFocus
                />
              </div>

              <button 
                type="submit"
                className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
              >
                Criar e Começar
              </button>

              {companies.length > 0 && (
                <div className="pt-4 border-t border-slate-100">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Ou selecione uma existente</p>
                  <div className="space-y-2 max-h-[150px] overflow-y-auto pr-1">
                    {companies.map(c => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setCurrentCompany(c);
                          setIsCompanyModalOpen(false);
                        }}
                        className="w-full text-left px-4 py-2 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all text-sm font-medium text-slate-700 flex items-center justify-between group"
                      >
                        {c.name}
                        <ArrowUpRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
