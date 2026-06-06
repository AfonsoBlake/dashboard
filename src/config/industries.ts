export const industryCategories = [
  {
    id: "health_fitness",
    name: "Health & Fitness",
    icon: "💪",
    niches: ["gym", "personal_trainer", "yoga", "physio", "chiropractor"]
  },
  {
    id: "beauty",
    name: "Beauty & Personal Care",
    icon: "💅",
    niches: ["hair_salon", "nail_salon", "lash_tech", "tattoo", "barbershop", "esthetician", "medspa"]
  },
  {
    id: "real_estate",
    name: "Real Estate & Property",
    icon: "🏠",
    niches: ["realtor", "property_manager", "mortgage_broker", "interior_designer"]
  },
  {
    id: "education",
    name: "Education & Coaching",
    icon: "🎓",
    niches: ["business_coach", "life_coach", "tutor", "language_school", "driving_school"]
  },
  {
    id: "professional",
    name: "Professional Services",
    icon: "⚖️",
    niches: ["lawyer", "accountant", "marketing_agency", "consultant", "it_support"]
  },
  {
    id: "home_services",
    name: "Home Services",
    icon: "🔧",
    niches: ["plumber", "electrician", "cleaning", "solar", "landscaper"]
  },
  {
    id: "automotive",
    name: "Automotive",
    icon: "🚗",
    niches: ["car_dealership", "auto_repair", "detailing"]
  },
  {
    id: "finance",
    name: "Finance",
    icon: "💰",
    niches: ["financial_advisor", "insurance_agent", "tax_consultant"]
  },
  {
    id: "ecommerce",
    name: "E-Commerce & Retail",
    icon: "🛒",
    niches: ["fashion", "furniture", "jewelry", "custom_apparel", "subscription_box"]
  },
  {
    id: "appointments",
    name: "Appointments & Bookings",
    icon: "📅",
    niches: ["dentist", "counselor", "pet_services", "photography"]
  },
  {
    id: "hospitality",
    name: "Hospitality & Events",
    icon: "🎉",
    niches: ["wedding_venue", "event_planner", "catering"]
  },
  {
    id: "other",
    name: "Other — describe your business",
    icon: "✏️",
    niches: [],
    custom: true
  }
];

export const industries = [
  // HEALTH & WELLNESS
  { id: "gym", categoryId: "health_fitness", name: "Gym / Fitness Studio", lead: "Member", trial: "Free Trial Pass", booking: "Session", converted: "Enrolled", goal: "Book a free trial session" },
  { id: "personal_trainer", categoryId: "health_fitness", name: "Personal Trainer", lead: "Client", trial: "Free Consultation", booking: "Session", converted: "Signed Up", goal: "Book a free consultation" },
  { id: "yoga", categoryId: "health_fitness", name: "Yoga Studio", lead: "Student", trial: "First Class Free", booking: "Session", converted: "Enrolled", goal: "Book a free trial class" },
  { id: "physio", categoryId: "health_fitness", name: "Physiotherapist", lead: "Patient", trial: "Free Assessment", booking: "Appointment", converted: "Retained", goal: "Book an assessment appointment" },
  { id: "chiropractor", categoryId: "health_fitness", name: "Chiropractor", lead: "Patient", trial: "Free Consultation", booking: "Appointment", converted: "Retained", goal: "Book a consultation" },

  // BEAUTY & PERSONAL CARE
  { id: "hair_salon", categoryId: "beauty", name: "Hair Salon", lead: "Client", trial: "Consultation", booking: "Appointment", converted: "Serviced", goal: "Book a service appointment" },
  { id: "nail_salon", categoryId: "beauty", name: "Nail Salon", lead: "Client", trial: "Consultation", booking: "Appointment", converted: "Serviced", goal: "Book a service appointment" },
  { id: "lash_tech", categoryId: "beauty", name: "Lash Technician", lead: "Client", trial: "Patch Test", booking: "Appointment", converted: "Serviced", goal: "Book a patch test or appointment" },
  { id: "tattoo", categoryId: "beauty", name: "Tattoo Artist", lead: "Client", trial: "Portfolio Review", booking: "Appointment", converted: "Booked", goal: "Book a consultation or tattoo session" },
  { id: "barbershop", categoryId: "beauty", name: "Barbershop", lead: "Client", trial: "Consultation", booking: "Appointment", converted: "Serviced", goal: "Book a service appointment" },
  { id: "esthetician", categoryId: "beauty", name: "Esthetician", lead: "Client", trial: "Consultation", booking: "Appointment", converted: "Serviced", goal: "Book a consultation or treatment" },
  { id: "medspa", categoryId: "beauty", name: "Med Spa", lead: "Client", trial: "Free Consultation", booking: "Appointment", converted: "Retained", goal: "Book a consultation" },

  // REAL ESTATE
  { id: "realtor", categoryId: "real_estate", name: "Real Estate Agent", lead: "Client", trial: "Home Valuation", booking: "Viewing", converted: "Closed", goal: "Book a home viewing or valuation" },
  { id: "property_manager", categoryId: "real_estate", name: "Property Manager", lead: "Tenant", trial: "Consultation", booking: "Viewing", converted: "Leased", goal: "Book a property viewing" },
  { id: "mortgage_broker", categoryId: "real_estate", name: "Mortgage Broker", lead: "Applicant", trial: "Free Consultation", booking: "Consultation", converted: "Approved", goal: "Book a mortgage consultation" },
  { id: "interior_designer", categoryId: "real_estate", name: "Interior Designer", lead: "Client", trial: "Initial Consultation", booking: "Consultation", converted: "Contracted", goal: "Book an initial design consultation" },

  // EDUCATION & COACHING
  { id: "business_coach", categoryId: "education", name: "Business Coach", lead: "Client", trial: "Discovery Call", booking: "Session", converted: "Enrolled", goal: "Book a discovery call or strategy session" },
  { id: "life_coach", categoryId: "education", name: "Life Coach", lead: "Client", trial: "Discovery Call", booking: "Session", converted: "Enrolled", goal: "Book a discovery call" },
  { id: "tutor", categoryId: "education", name: "Tutor", lead: "Student", trial: "Free Lesson", booking: "Session", converted: "Enrolled", goal: "Book a free trial lesson" },
  { id: "language_school", categoryId: "education", name: "Language School", lead: "Student", trial: "Free Trial Class", booking: "Session", converted: "Enrolled", goal: "Book a free trial class" },
  { id: "driving_school", categoryId: "education", name: "Driving School", lead: "Student", trial: "Introductory Lesson", booking: "Lesson", converted: "Enrolled", goal: "Book an introductory lesson" },

  // PROFESSIONAL SERVICES
  { id: "lawyer", categoryId: "professional", name: "Law Firm / Lawyer", lead: "Client", trial: "Free Consultation", booking: "Consultation", converted: "Retained", goal: "Schedule a discovery call or consultation" },
  { id: "accountant", categoryId: "professional", name: "Accountant", lead: "Client", trial: "Free Consultation", booking: "Meeting", converted: "Onboarded", goal: "Schedule a consultation or review" },
  { id: "marketing_agency", categoryId: "professional", name: "Marketing Agency", lead: "Prospect", trial: "Strategy Session", booking: "Discovery Call", converted: "Signed", goal: "Schedule a discovery call or strategy session" },
  { id: "consultant", categoryId: "professional", name: "Business Consultant", lead: "Prospect", trial: "Free Audit", booking: "Meeting", converted: "Retained", goal: "Schedule a discovery call" },
  { id: "it_support", categoryId: "professional", name: "IT Support", lead: "Client", trial: "Free Assessment", booking: "Consultation", converted: "Onboarded", goal: "Schedule an assessment or consultation" },

  // HOME SERVICES
  { id: "plumber", categoryId: "home_services", name: "Plumber", lead: "Customer", trial: "Free Estimate", booking: "Service Call", converted: "Booked", goal: "Book an estimate or service call" },
  { id: "electrician", categoryId: "home_services", name: "Electrician", lead: "Customer", trial: "Free Estimate", booking: "Service Call", converted: "Booked", goal: "Book an estimate or service call" },
  { id: "cleaning", categoryId: "home_services", name: "Cleaning Service", lead: "Customer", trial: "Free Quote", booking: "Appointment", converted: "Booked", goal: "Book a cleaning appointment" },
  { id: "solar", categoryId: "home_services", name: "Solar Installer", lead: "Homeowner", trial: "Free Consultation", booking: "Site Visit", converted: "Contracted", goal: "Book a consultation or site visit" },
  { id: "landscaper", categoryId: "home_services", name: "Landscaper", lead: "Homeowner", trial: "Free Estimate", booking: "Consultation", converted: "Contracted", goal: "Book an estimate or consultation" },

  // AUTOMOTIVE
  { id: "car_dealership", categoryId: "automotive", name: "Car Dealership", lead: "Prospect", trial: "Test Drive", booking: "Test Drive", converted: "Sold", goal: "Book a test drive" },
  { id: "auto_repair", categoryId: "automotive", name: "Auto Repair Shop", lead: "Customer", trial: "Free Inspection", booking: "Service Appointment", converted: "Serviced", goal: "Book a service appointment" },
  { id: "detailing", categoryId: "automotive", name: "Car Detailing", lead: "Customer", trial: "Free Quote", booking: "Appointment", converted: "Booked", goal: "Book a detailing appointment" },

  // FINANCE
  { id: "financial_advisor", categoryId: "finance", name: "Financial Advisor", lead: "Client", trial: "Free Review", booking: "Appointment", converted: "Retained", goal: "Book a financial review" },
  { id: "insurance_agent", categoryId: "finance", name: "Insurance Agent", lead: "Prospect", trial: "Free Quote", booking: "Appointment", converted: "Policy Issued", goal: "Book a quote consultation" },
  { id: "tax_consultant", categoryId: "finance", name: "Tax Consultant", lead: "Client", trial: "Free Consultation", booking: "Appointment", converted: "Retained", goal: "Book a tax consultation" },

  // E-COMMERCE
  { id: "fashion", categoryId: "ecommerce", name: "Fashion", lead: "Customer", trial: "Discount Code / Sample", booking: "Order", converted: "Purchased", goal: "Drive a purchase or recover abandoned cart" },
  { id: "furniture", categoryId: "ecommerce", name: "Furniture", lead: "Customer", trial: "Discount Code / Sample", booking: "Order", converted: "Purchased", goal: "Drive a purchase or recover abandoned cart" },
  { id: "jewelry", categoryId: "ecommerce", name: "Jewelry", lead: "Customer", trial: "Discount Code / Sample", booking: "Order", converted: "Purchased", goal: "Drive a purchase or recover abandoned cart" },
  { id: "custom_apparel", categoryId: "ecommerce", name: "Custom Apparel", lead: "Customer", trial: "Discount Code / Sample", booking: "Order", converted: "Purchased", goal: "Drive a purchase or recover abandoned cart" },
  { id: "subscription_box", categoryId: "ecommerce", name: "Subscription Box", lead: "Customer", trial: "Discount Code / Sample", booking: "Order", converted: "Purchased", goal: "Drive a purchase or recover abandoned cart" },

  // APPOINTMENTS
  { id: "dentist", categoryId: "appointments", name: "Dentist / Dental Clinic", lead: "Patient", trial: "Free Consultation", booking: "Appointment", converted: "Retained", goal: "Book a consultation or first appointment" },
  { id: "counselor", categoryId: "appointments", name: "Mental Health Counselor", lead: "Client", trial: "Discovery Call", booking: "Session", converted: "Retained", goal: "Book a discovery call or first session" },
  { id: "pet_services", categoryId: "appointments", name: "Pet Grooming / Training", lead: "Client", trial: "Free Consultation", booking: "Appointment", converted: "Booked", goal: "Book a consultation or service" },
  { id: "photography", categoryId: "appointments", name: "Photography Studio", lead: "Client", trial: "Portfolio Review", booking: "Session", converted: "Booked", goal: "Book a consultation or photo session" },

  // HOSPITALITY
  { id: "wedding_venue", categoryId: "hospitality", name: "Wedding Venue", lead: "Couple", trial: "Venue Tour", booking: "Site Visit", converted: "Booked", goal: "Book a venue tour" },
  { id: "event_planner", categoryId: "hospitality", name: "Event Planner", lead: "Client", trial: "Consultation", booking: "Consultation", converted: "Contracted", goal: "Book an initial consultation" },
  { id: "catering", categoryId: "hospitality", name: "Catering Service", lead: "Client", trial: "Tasting", booking: "Tasting Session", converted: "Booked", goal: "Book a tasting session" },

  // OTHER (default generic terms)
  { id: "other", categoryId: "other", name: "Other", lead: "Client", trial: "Free Consultation", booking: "Appointment", converted: "Converted", goal: "Book an appointment or consultation" }
];

export type Industry = typeof industries[0];

export const getIndustryById = (id: string | null | undefined): Industry => 
  industries.find(i => i.id === id) || industries.find(i => i.id === "gym")!;
