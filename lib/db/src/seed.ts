import { and, eq, sql } from "drizzle-orm";
import { randomBytes, scrypt as nodeScrypt } from "node:crypto";
import { db, pool } from "./index";
import { applications, companies, jobs, supportTickets, users } from "./schema";

const demoPassword = "Demo@123";
const demoId = (value: number) => `00000000-0000-4000-8000-${String(value).padStart(12, "0")}`;

const hashPassword = async (password: string) => {
  const salt = randomBytes(16);
  const derived = await new Promise<Buffer>((resolve, reject) => nodeScrypt(password, salt, 64, { N: 16_384, r: 8, p: 1 }, (error, key) => error ? reject(error) : resolve(key as Buffer)));
  return `scrypt:${salt.toString("hex")}:${derived.toString("hex")}`;
};

const ids = {
  seeker: "11111111-1111-4111-8111-111111111111",
  recruiter: "22222222-2222-4222-8222-222222222222",
  support: "33333333-3333-4333-8333-333333333333",
  admin: "44444444-4444-4444-8444-444444444444",
  company: "55555555-5555-4555-8555-555555555555",
  figma: "66666666-6666-4666-8666-666666666666",
  linear: "77777777-7777-4777-8777-777777777777",
};

const candidateProfiles = [
  { name: "Arjun Mehta", email: "arjun.mehta@careerly.demo", city: "Bengaluru", state: "Karnataka", role: "Product Designer", department: "Product & Design", industry: "Technology", degree: "B.Des Communication Design", school: "National Institute of Design", strengths: ["Product design", "Design systems", "User research"] },
  { name: "Priya Sharma", email: "priya.sharma@careerly.demo", city: "Mumbai", state: "Maharashtra", role: "Frontend Developer", department: "Engineering", industry: "Software", degree: "B.Tech Computer Science", school: "Mumbai University", strengths: ["React", "TypeScript", "Accessibility"] },
  { name: "Kabir Verma", email: "kabir.verma@careerly.demo", city: "Delhi", state: "Delhi", role: "Data Analyst", department: "Analytics", industry: "Fintech", degree: "M.Sc Statistics", school: "University of Delhi", strengths: ["SQL", "Python", "Data visualization"] },
  { name: "Ananya Iyer", email: "ananya.iyer@careerly.demo", city: "Chennai", state: "Tamil Nadu", role: "Digital Marketing Specialist", department: "Marketing", industry: "Consumer goods", degree: "MBA Marketing", school: "Anna University", strengths: ["SEO", "Campaign analytics", "Content strategy"] },
  { name: "Rohan Patel", email: "rohan.patel@careerly.demo", city: "Ahmedabad", state: "Gujarat", role: "Backend Developer", department: "Engineering", industry: "Software", degree: "B.Tech Information Technology", school: "Nirma University", strengths: ["Node.js", "PostgreSQL", "API design"] },
  { name: "Sara Khan", email: "sara.khan@careerly.demo", city: "Hyderabad", state: "Telangana", role: "Talent Acquisition Partner", department: "Human Resources", industry: "Technology", degree: "M.A. Human Resources", school: "Osmania University", strengths: ["Technical hiring", "Interviewing", "Employer branding"] },
  { name: "Dev Malhotra", email: "dev.malhotra@careerly.demo", city: "Pune", state: "Maharashtra", role: "Product Manager", department: "Product", industry: "SaaS", degree: "MBA Product Management", school: "Symbiosis International University", strengths: ["Roadmapping", "Product analytics", "Agile delivery"] },
  { name: "Meera Nair", email: "meera.nair@careerly.demo", city: "Kochi", state: "Kerala", role: "UX Researcher", department: "Product & Design", industry: "Healthcare", degree: "M.Des Human-Centered Design", school: "IIT Hyderabad", strengths: ["Usability testing", "Qualitative research", "Research operations"] },
  { name: "Aditya Rao", email: "aditya.rao@careerly.demo", city: "Bengaluru", state: "Karnataka", role: "Cloud Engineer", department: "Cloud & Infrastructure", industry: "Cloud computing", degree: "B.Tech Computer Science", school: "PES University", strengths: ["AWS", "Kubernetes", "Infrastructure as code"] },
  { name: "Ishita Bose", email: "ishita.bose@careerly.demo", city: "Kolkata", state: "West Bengal", role: "Financial Analyst", department: "Finance", industry: "Banking", degree: "CA", school: "Institute of Chartered Accountants of India", strengths: ["Financial modelling", "Forecasting", "Excel"] },
  { name: "Vikram Singh", email: "vikram.singh@careerly.demo", city: "Jaipur", state: "Rajasthan", role: "QA Automation Engineer", department: "Quality Engineering", industry: "Software", degree: "B.Tech Electronics", school: "Rajasthan Technical University", strengths: ["Playwright", "Test automation", "CI/CD"] },
  { name: "Nisha Reddy", email: "nisha.reddy@careerly.demo", city: "Hyderabad", state: "Telangana", role: "Content Strategist", department: "Content", industry: "Media", degree: "M.A. English", school: "University of Hyderabad", strengths: ["Editorial planning", "Copywriting", "Content design"] },
  { name: "Rahul Das", email: "rahul.das@careerly.demo", city: "Bhubaneswar", state: "Odisha", role: "Sales Development Representative", department: "Sales", industry: "SaaS", degree: "BBA", school: "Utkal University", strengths: ["Lead generation", "CRM", "Customer communication"] },
  { name: "Tanya Kapoor", email: "tanya.kapoor@careerly.demo", city: "Gurugram", state: "Haryana", role: "Business Analyst", department: "Business Operations", industry: "Consulting", degree: "MBA Business Analytics", school: "Gurugram University", strengths: ["Requirements analysis", "Process mapping", "Power BI"] },
  { name: "Karan Joshi", email: "karan.joshi@careerly.demo", city: "Indore", state: "Madhya Pradesh", role: "Mobile App Developer", department: "Engineering", industry: "Mobile technology", degree: "B.Tech Computer Science", school: "Devi Ahilya Vishwavidyalaya", strengths: ["Flutter", "Dart", "Mobile UX"] },
  { name: "Pooja Menon", email: "pooja.menon@careerly.demo", city: "Thiruvananthapuram", state: "Kerala", role: "Customer Success Manager", department: "Customer Success", industry: "SaaS", degree: "MBA Customer Relations", school: "University of Kerala", strengths: ["Account management", "Onboarding", "Customer retention"] },
  { name: "Siddharth Jain", email: "siddharth.jain@careerly.demo", city: "Noida", state: "Uttar Pradesh", role: "Cybersecurity Analyst", department: "Security", industry: "Cybersecurity", degree: "B.Tech Cybersecurity", school: "Amity University", strengths: ["Threat monitoring", "SIEM", "Incident response"] },
  { name: "Aditi Kulkarni", email: "aditi.kulkarni@careerly.demo", city: "Pune", state: "Maharashtra", role: "Graphic Designer", department: "Creative", industry: "Advertising", degree: "BFA Applied Arts", school: "Abhinav Kala Mahavidyalaya", strengths: ["Brand identity", "Illustration", "Adobe Creative Suite"] },
  { name: "Manav Gupta", email: "manav.gupta@careerly.demo", city: "Chandigarh", state: "Chandigarh", role: "Operations Associate", department: "Operations", industry: "Logistics", degree: "B.Com", school: "Panjab University", strengths: ["Process improvement", "Vendor coordination", "Reporting"] },
  { name: "Zoya Fernandes", email: "zoya.fernandes@careerly.demo", city: "Goa", state: "Goa", role: "People Operations Specialist", department: "Human Resources", industry: "Hospitality", degree: "B.A. Psychology", school: "Goa University", strengths: ["Employee engagement", "HR operations", "Onboarding"] },
] as const;

const companyProfiles = [
  { name: "Figma", industry: "Design software", city: "Bengaluru", state: "Karnataka", website: "https://figma.com", size: "1,001-5,000", founded: "2012", recruiterName: "Maya Chen", recruiterEmail: "maya.chen@careerly.demo", description: "Collaborative product design tools that help teams explore ideas, build prototypes, and deliver polished digital experiences.", jobs: [
    { title: "Senior Product Designer", category: "Design", experience: "5–8 years", salaryMin: 1800000, salaryMax: 2800000, skills: ["Figma", "Product strategy", "Design systems"] },
    { title: "Product Designer, Growth", category: "Design", experience: "3–5 years", salaryMin: 1500000, salaryMax: 2200000, skills: ["Growth", "Research", "Prototyping"] },
    { title: "UX Researcher", category: "Research", experience: "2–4 years", salaryMin: 1200000, salaryMax: 1800000, skills: ["User interviews", "Usability testing", "Research synthesis"] },
  ] },
  { name: "Northstar Fintech", industry: "Financial technology", city: "Mumbai", state: "Maharashtra", website: "https://northstarfintech.example", size: "201-500", founded: "2018", recruiterName: "Priya Nair", recruiterEmail: "priya.nair@careerly.demo", description: "A digital finance company building accessible payments, lending, and money management products for growing businesses.", jobs: [
    { title: "Backend Engineer, Payments", category: "Engineering", experience: "3–6 years", salaryMin: 1600000, salaryMax: 2600000, skills: ["Java", "Spring Boot", "Payments"] },
    { title: "Risk Data Analyst", category: "Data & Analytics", experience: "2–5 years", salaryMin: 900000, salaryMax: 1500000, skills: ["SQL", "Python", "Credit risk"] },
    { title: "Compliance Operations Associate", category: "Operations", experience: "1–3 years", salaryMin: 500000, salaryMax: 800000, skills: ["KYC", "AML", "Documentation"] },
  ] },
  { name: "MangoTree Health", industry: "Healthcare technology", city: "Hyderabad", state: "Telangana", website: "https://mangotreehealth.example", size: "51-200", founded: "2020", recruiterName: "Rahul Varma", recruiterEmail: "rahul.varma@careerly.demo", description: "A healthcare technology team improving access to trusted care through patient-first digital services and clinician tools.", jobs: [
    { title: "Clinical Product Manager", category: "Product", experience: "4–7 years", salaryMin: 1800000, salaryMax: 2800000, skills: ["Product management", "Healthcare", "Roadmaps"] },
    { title: "Frontend Engineer, Patient App", category: "Engineering", experience: "2–5 years", salaryMin: 1200000, salaryMax: 2000000, skills: ["React", "TypeScript", "Accessibility"] },
    { title: "Healthcare Content Editor", category: "Content", experience: "1–4 years", salaryMin: 600000, salaryMax: 1000000, skills: ["Medical writing", "Editing", "Health communication"] },
  ] },
  { name: "Bluejay Commerce", industry: "E-commerce", city: "Delhi", state: "Delhi", website: "https://bluejaycommerce.example", size: "501-1,000", founded: "2016", recruiterName: "Sana Kapoor", recruiterEmail: "sana.kapoor@careerly.demo", description: "A multi-category commerce platform helping customers discover quality products and helping independent brands grow online.", jobs: [
    { title: "Marketplace Growth Manager", category: "Marketing", experience: "4–7 years", salaryMin: 1400000, salaryMax: 2200000, skills: ["Marketplace", "Growth marketing", "Analytics"] },
    { title: "Supply Chain Planner", category: "Operations", experience: "2–5 years", salaryMin: 800000, salaryMax: 1300000, skills: ["Inventory", "Forecasting", "Excel"] },
    { title: "Customer Experience Associate", category: "Customer Support", experience: "0–2 years", salaryMin: 360000, salaryMax: 600000, skills: ["Customer service", "Written communication", "CRM"] },
  ] },
  { name: "Cedar Cloud Systems", industry: "Cloud computing", city: "Pune", state: "Maharashtra", website: "https://cedarcloud.example", size: "201-500", founded: "2015", recruiterName: "Aarav Desai", recruiterEmail: "aarav.desai@careerly.demo", description: "A cloud engineering company helping product teams deploy reliable, secure infrastructure and modernize their developer platforms.", jobs: [
    { title: "Cloud Platform Engineer", category: "Engineering", experience: "3–6 years", salaryMin: 1500000, salaryMax: 2500000, skills: ["AWS", "Kubernetes", "Terraform"] },
    { title: "Site Reliability Engineer", category: "Engineering", experience: "4–8 years", salaryMin: 1800000, salaryMax: 3000000, skills: ["Linux", "Observability", "Incident management"] },
    { title: "Technical Documentation Writer", category: "Content", experience: "2–5 years", salaryMin: 800000, salaryMax: 1400000, skills: ["Technical writing", "APIs", "Developer documentation"] },
  ] },
  { name: "Juniper Learning", industry: "Education technology", city: "Chennai", state: "Tamil Nadu", website: "https://juniperlearning.example", size: "51-200", founded: "2019", recruiterName: "Kavya Raman", recruiterEmail: "kavya.raman@careerly.demo", description: "An education technology startup creating engaging learning experiences, assessment tools, and resources for students and teachers.", jobs: [
    { title: "Learning Experience Designer", category: "Education", experience: "2–5 years", salaryMin: 800000, salaryMax: 1400000, skills: ["Instructional design", "Storyboarding", "LMS"] },
    { title: "Full-Stack Developer", category: "Engineering", experience: "2–5 years", salaryMin: 1200000, salaryMax: 2000000, skills: ["Node.js", "React", "PostgreSQL"] },
    { title: "Student Success Coordinator", category: "Customer Support", experience: "0–3 years", salaryMin: 400000, salaryMax: 700000, skills: ["Student support", "Coordination", "Communication"] },
  ] },
  { name: "Saffron Creative Studio", industry: "Media and advertising", city: "Jaipur", state: "Rajasthan", website: "https://saffroncreative.example", size: "11-50", founded: "2021", recruiterName: "Neha Rathore", recruiterEmail: "neha.rathore@careerly.demo", description: "An independent creative studio partnering with ambitious brands on thoughtful identity, campaigns, and digital storytelling.", jobs: [
    { title: "Brand Designer", category: "Design", experience: "2–5 years", salaryMin: 700000, salaryMax: 1200000, skills: ["Brand identity", "Typography", "Adobe Illustrator"] },
    { title: "Social Media Strategist", category: "Marketing", experience: "1–4 years", salaryMin: 500000, salaryMax: 900000, skills: ["Social media", "Content calendars", "Analytics"] },
    { title: "Video Editor", category: "Design", experience: "1–4 years", salaryMin: 500000, salaryMax: 900000, skills: ["Premiere Pro", "Storytelling", "Motion graphics"] },
  ] },
  { name: "Riverstone Logistics", industry: "Logistics", city: "Ahmedabad", state: "Gujarat", website: "https://riverstonelogistics.example", size: "201-500", founded: "2017", recruiterName: "Irfan Shaikh", recruiterEmail: "irfan.shaikh@careerly.demo", description: "A logistics and supply chain business coordinating dependable transportation and fulfillment for growing regional brands.", jobs: [
    { title: "Logistics Operations Manager", category: "Operations", experience: "4–7 years", salaryMin: 1000000, salaryMax: 1700000, skills: ["Fleet operations", "Process improvement", "Team leadership"] },
    { title: "Business Intelligence Analyst", category: "Data & Analytics", experience: "2–5 years", salaryMin: 900000, salaryMax: 1500000, skills: ["Power BI", "SQL", "Business reporting"] },
    { title: "B2B Sales Executive", category: "Sales", experience: "1–4 years", salaryMin: 500000, salaryMax: 1000000, skills: ["B2B sales", "Negotiation", "CRM"] },
  ] },
  { name: "Orbit Mobility", industry: "Electric mobility", city: "Bengaluru", state: "Karnataka", website: "https://orbitmobility.example", size: "51-200", founded: "2022", recruiterName: "Deepak Shetty", recruiterEmail: "deepak.shetty@careerly.demo", description: "An electric mobility venture developing dependable vehicle software and services for cleaner urban transportation.", jobs: [
    { title: "Embedded Software Engineer", category: "Engineering", experience: "2–5 years", salaryMin: 1400000, salaryMax: 2300000, skills: ["C++", "Embedded Linux", "CAN"] },
    { title: "EV Service Network Lead", category: "Operations", experience: "3–6 years", salaryMin: 900000, salaryMax: 1500000, skills: ["Service operations", "Partner management", "Electric vehicles"] },
    { title: "Product Marketing Associate", category: "Marketing", experience: "1–3 years", salaryMin: 600000, salaryMax: 1000000, skills: ["Product marketing", "Research", "Campaigns"] },
  ] },
  { name: "Kite Cybersecurity", industry: "Cybersecurity", city: "Noida", state: "Uttar Pradesh", website: "https://kitecyber.example", size: "51-200", founded: "2020", recruiterName: "Simran Gill", recruiterEmail: "simran.gill@careerly.demo", description: "A security company building practical threat detection and response tools to help organizations protect their digital services.", jobs: [
    { title: "Security Operations Analyst", category: "Security", experience: "1–4 years", salaryMin: 800000, salaryMax: 1500000, skills: ["SIEM", "Threat analysis", "Incident response"] },
    { title: "Application Security Engineer", category: "Security", experience: "3–6 years", salaryMin: 1600000, salaryMax: 2700000, skills: ["OWASP", "Penetration testing", "Secure SDLC"] },
    { title: "Technical Account Manager", category: "Customer Success", experience: "2–5 years", salaryMin: 1000000, salaryMax: 1800000, skills: ["Customer success", "Security products", "Communication"] },
  ] },
] as const;

const locations = ["Bengaluru", "Mumbai", "Delhi", "Hyderabad", "Pune", "Chennai", "Remote"];
const workModes = ["Hybrid", "On-site", "Remote"] as const;
const employmentTypes = ["Full-time", "Full-time", "Part-time", "Internship", "Contract"] as const;
const benefitSets = [
  ["Health insurance", "Paid time off", "Learning budget"],
  ["Flexible hours", "Wellness allowance", "Remote-work support"],
  ["Performance bonus", "Commuter benefits", "Career development"],
] as const;

const candidateUser = (candidate: typeof candidateProfiles[number], index: number, passwordHash: string) => {
  const id = index === 0 ? ids.seeker : demoId(1000 + index);
  const phone = String(9100001000 + index);
  const seniority = index % 4;
  const yearsExperience = seniority === 0 ? "0–2 years" : seniority === 1 ? "2–4 years" : seniority === 2 ? "4–6 years" : "6+ years";
  const profile = {
    headline: `${candidate.role} · ${yearsExperience}`,
    location: `${candidate.city}, ${candidate.state}`,
    city: candidate.city,
    state: candidate.state,
    pincode: String(560001 + index * 137),
    phone,
    contactVisibility: index % 4 === 0 ? "private" as const : "recruiters" as const,
    strengths: [...candidate.strengths],
    summary: `${candidate.role} with ${yearsExperience} of experience in ${candidate.industry.toLowerCase()}. Enjoys solving practical problems, collaborating across teams, and delivering thoughtful outcomes.`,
    careerProfile: {
      industry: candidate.industry,
      department: candidate.department,
      roleCategory: candidate.department,
      jobRole: candidate.role,
      jobType: index % 5 === 0 ? "Remote" : index % 5 === 1 ? "Hybrid" : "On-site",
      employmentType: index % 6 === 0 ? "Part-time" : "Full-time",
      preferredRoles: [candidate.role, `${candidate.role} II`],
      workLocations: [candidate.city, "Remote"],
      expectedSalary: `${6 + index * 2}-${10 + index * 3} LPA`,
      shift: index % 3 === 0 ? "Flexible" : index % 3 === 1 ? "Day shift" : "Any shift",
      noticePeriod: index % 4 === 0 ? "Immediate" : index % 4 === 1 ? "15 days" : index % 4 === 2 ? "30 days" : "60 days",
    },
    educations: [{ degree: candidate.degree, school: candidate.school, period: `${2015 + index % 7}-${2019 + index % 7}` }],
    experiences: seniority === 0 ? [] : [{
      role: candidate.role,
      company: `${["Bright", "Nimble", "Pioneer", "Evergreen"][index % 4]} ${["Labs", "Works", "Digital", "Solutions"][index % 4]}`,
      period: `${2025 - seniority}-${2026}`,
      description: `Delivered team projects in ${candidate.strengths.slice(0, 2).join(" and ")}.`,
    }],
    certificates: [{ name: `${candidate.strengths[0]} Foundations`, issuer: "Careerly Demo Academy", year: String(2023 + index % 4) }],
    languages: [
      { language: "English", proficiency: index % 3 === 0 ? "Native" : "Professional", read: true, write: true, speak: true },
      { language: index % 2 === 0 ? "Hindi" : candidate.state === "Karnataka" ? "Kannada" : candidate.state === "Tamil Nadu" ? "Tamil" : "Marathi", proficiency: "Fluent", read: true, write: true, speak: true },
    ],
    projects: [{ name: `${candidate.role} Portfolio Project`, role: candidate.role, period: "2025", description: `A sample project showcasing ${candidate.strengths.slice(0, 2).join(" and ")}.` }],
    portfolioLinks: index % 2 === 0 ? [{ title: "Portfolio", type: "Portfolio", url: `https://portfolio.example/candidate-${index + 1}`, description: "Sample demo portfolio." }] : [],
    resumeName: `${candidate.name.replace(/\s+/g, "-")}-Resume.pdf`,
    selectedResumeId: (["template-modern", "template-classic", "template-minimal"] as const)[index % 3],
  };
  return {
    id,
    name: candidate.name,
    email: candidate.email,
    passwordHash,
    role: "job_seeker" as const,
    city: candidate.city,
    phoneNumber: phone,
    profileData: profile,
  };
};

async function seed() {
  const demoPasswordHash = await hashPassword(demoPassword);
  const candidates = candidateProfiles.map((candidate, index) => candidateUser(candidate, index, demoPasswordHash));
  const recruiters = companyProfiles.map((company, index) => ({
    id: index === 0 ? ids.recruiter : demoId(2000 + index),
    name: company.recruiterName,
    email: company.recruiterEmail,
    passwordHash: demoPasswordHash,
    role: "recruiter" as const,
    city: company.city,
    phoneNumber: String(9100002000 + index),
  }));
  await db.insert(users).values([
    { id: ids.support, name: "Aisha Khan", email: "support@careerly.demo", passwordHash: demoPasswordHash, role: "support", city: "Mumbai" },
    { id: ids.admin, name: "Jordan Lee", email: "admin@careerly.demo", passwordHash: demoPasswordHash, role: "admin", city: "Bengaluru" },
    ...candidates,
    ...recruiters,
  ]).onConflictDoUpdate({
    target: users.id,
    set: {
      name: sql`excluded.name`,
      email: sql`excluded.email`,
      passwordHash: demoPasswordHash,
      role: sql`excluded.role`,
      city: sql`excluded.city`,
      phoneNumber: sql`excluded.phone_number`,
      profileData: sql`excluded.profile_data`,
    },
  });
  const companyRows = companyProfiles.map((company, index) => ({
    id: index === 0 ? ids.company : demoId(4000 + index),
    name: company.name,
    industry: company.industry,
    city: company.city,
    address: `${100 + index} ${["Market Road", "Innovation Avenue", "Lake View Street"][index % 3]}, ${company.city}, ${company.state}`,
    website: company.website,
    description: company.description,
    size: company.size,
    founded: company.founded,
    contactEmail: company.recruiterEmail,
    phone: `+91 80${String(10000000 + index).slice(-8)}`,
    recruiterContactName: company.recruiterName,
    verificationStatus: "verified",
    recruiterId: recruiters[index].id,
  }));
  await db.insert(companies).values(companyRows).onConflictDoUpdate({
    target: companies.id,
    set: {
      name: sql`excluded.name`,
      industry: sql`excluded.industry`,
      city: sql`excluded.city`,
      address: sql`excluded.address`,
      website: sql`excluded.website`,
      description: sql`excluded.description`,
      size: sql`excluded.size`,
      founded: sql`excluded.founded`,
      contactEmail: sql`excluded.contact_email`,
      phone: sql`excluded.phone`,
      recruiterContactName: sql`excluded.recruiter_contact_name`,
      verificationStatus: sql`excluded.verification_status`,
      recruiterId: sql`excluded.recruiter_id`,
    },
  });
  const jobRows = companyProfiles.flatMap((company, companyIndex) => company.jobs.map((job, jobIndex) => ({
    id: companyIndex === 0 && jobIndex === 0 ? ids.figma
      : companyIndex === 0 && jobIndex === 1 ? ids.linear
        : demoId(3000 + companyIndex * 10 + jobIndex),
    companyId: companyRows[companyIndex].id,
    title: job.title,
    category: job.category,
    location: locations[(companyIndex + jobIndex) % locations.length],
    workMode: workModes[(companyIndex + jobIndex) % workModes.length],
    employmentType: employmentTypes[(companyIndex + jobIndex) % employmentTypes.length],
    experience: job.experience,
    salaryMin: job.salaryMin,
    salaryMax: job.salaryMax,
    description: `${company.name} is hiring a ${job.title} to help build and improve ${company.industry.toLowerCase()} products and services. You will collaborate with a supportive, cross-functional team, own meaningful work, and contribute your expertise in ${job.skills.join(", ")}. Applicants should bring relevant experience, clear communication, and a thoughtful approach to solving problems.`,
    details: {
      vacancies: 1 + ((companyIndex + jobIndex) % 5),
      salaryMin: job.salaryMin / 12,
      salaryMax: job.salaryMax / 12,
      timings: jobIndex % 2 === 0 ? "10:00 AM – 6:00 PM" : "Flexible working hours",
      workingDays: jobIndex % 2 === 0 ? "Monday to Friday" : "5 days per week",
      qualification: jobIndex % 2 === 0 ? "Bachelor’s degree or equivalent experience" : "Relevant degree or demonstrated skills",
      experienceRange: job.experience,
      benefits: [...benefitSets[(companyIndex + jobIndex) % benefitSets.length]],
      interviewMode: jobIndex % 2 === 0 ? "Telephonic" : "Walk-in or video interview",
      showRecruiterContact: true,
    },
    skills: [...job.skills],
    status: jobIndex === 0 ? "active" as const : "pending" as const,
  })));
  await db.insert(jobs).values(jobRows).onConflictDoUpdate({
    target: jobs.id,
    set: {
      companyId: sql`excluded.company_id`,
      title: sql`excluded.title`,
      category: sql`excluded.category`,
      location: sql`excluded.location`,
      workMode: sql`excluded.work_mode`,
      employmentType: sql`excluded.employment_type`,
      experience: sql`excluded.experience`,
      salaryMin: sql`excluded.salary_min`,
      salaryMax: sql`excluded.salary_max`,
      description: sql`excluded.description`,
      details: sql`excluded.details`,
      skills: sql`excluded.skills`,
      status: sql`excluded.status`,
    },
  });
  await db.insert(applications).values([
    { jobId: ids.figma, seekerId: ids.seeker, status: "interview", coverNote: "I would love to bring my systems experience to Figma." },
    { jobId: ids.linear, seekerId: ids.seeker, status: "applied", coverNote: "My growth design work is a strong fit for this role." },
  ]).onConflictDoNothing({ target: [applications.jobId, applications.seekerId] });
  const [existingTicket] = await db.select({ id: supportTickets.id }).from(supportTickets).where(and(eq(supportTickets.openedById, ids.seeker), eq(supportTickets.subject, "Resume upload question"))).limit(1);
  if (!existingTicket) await db.insert(supportTickets).values({ openedById: ids.seeker, assignedToId: ids.support, subject: "Resume upload question", category: "Account issue", priority: "medium", status: "in_progress" });
  console.log(`Demo data seeded: ${candidateProfiles.length} job seekers, ${companyProfiles.length} recruiter/company accounts, ${jobRows.length} jobs (one active per company; remaining jobs pending).`);
  console.log(`All seeded accounts use password: ${demoPassword}`);
  console.log("Recruiter logins:");
  for (const recruiter of recruiters) console.log(`  ${recruiter.name} — ${recruiter.email}`);
  console.log("Job seeker logins:");
  for (const candidate of candidateProfiles) console.log(`  ${candidate.name} — ${candidate.email}`);
}

seed().catch((error: unknown) => { console.error(error); process.exitCode = 1; }).finally(async () => { await pool.end(); });
