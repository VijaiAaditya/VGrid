// Mock data generator — creates realistic employee dataset
// Uses no external dependency — all deterministic based on index

const FIRST_NAMES = ['Alice', 'Bob', 'Carlos', 'Diana', 'Ethan', 'Fiona', 'George', 'Hannah', 'Ivan', 'Julia',
  'Kevin', 'Laura', 'Mike', 'Nina', 'Oscar', 'Paula', 'Quinn', 'Rachel', 'Steve', 'Tina',
  'Uma', 'Victor', 'Wendy', 'Xavier', 'Yvonne', 'Zack', 'Amy', 'Brian', 'Cathy', 'Derek']

const LAST_NAMES = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Wilson',
  'Taylor', 'Anderson', 'Thomas', 'Jackson', 'White', 'Harris', 'Martin', 'Thompson', 'Moore',
  'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores', 'Green',
  'Adams', 'Nelson']

const DEPARTMENTS = ['Engineering', 'Product', 'Design', 'Marketing', 'Sales', 'Finance', 'HR', 'Legal', 'Operations', 'Support']
const ROLES = ['Junior', 'Mid', 'Senior', 'Lead', 'Principal', 'Director', 'VP', 'Manager', 'Analyst', 'Specialist']
const COUNTRIES = ['United States', 'Canada', 'United Kingdom', 'Germany', 'France', 'Japan', 'Australia', 'India', 'Brazil', 'Netherlands']
const CITIES: Record<string, string[]> = {
  'United States': ['New York', 'San Francisco', 'Austin', 'Seattle', 'Chicago'],
  'Canada': ['Toronto', 'Vancouver', 'Montreal', 'Calgary', 'Ottawa'],
  'United Kingdom': ['London', 'Manchester', 'Edinburgh', 'Birmingham', 'Bristol'],
  'Germany': ['Berlin', 'Munich', 'Hamburg', 'Frankfurt', 'Cologne'],
  'France': ['Paris', 'Lyon', 'Marseille', 'Bordeaux', 'Toulouse'],
  'Japan': ['Tokyo', 'Osaka', 'Kyoto', 'Yokohama', 'Sapporo'],
  'Australia': ['Sydney', 'Melbourne', 'Brisbane', 'Perth', 'Adelaide'],
  'India': ['Mumbai', 'Bangalore', 'Delhi', 'Hyderabad', 'Chennai'],
  'Brazil': ['São Paulo', 'Rio de Janeiro', 'Brasília', 'Fortaleza', 'Salvador'],
  'Netherlands': ['Amsterdam', 'Rotterdam', 'The Hague', 'Utrecht', 'Eindhoven'],
}
const STATUSES = ['Active', 'On Leave', 'Remote', 'Contract', 'Probation']

function seeded(index: number, max: number, offset = 0): number {
  return ((index * 1301 + offset * 7919) % max + max) % max
}

function seededFloat(index: number, min: number, max: number, offset = 0): number {
  const x = Math.sin(index * 0.618 + offset) * 10000
  const frac = x - Math.floor(x)
  return min + frac * (max - min)
}

export interface Employee {
  id: number
  firstName: string
  lastName: string
  email: string
  department: string
  role: string
  salary: number
  country: string
  city: string
  startDate: string
  yearsExperience: number
  performanceScore: number
  isActive: boolean
  status: string
  projects: number
  _highlight?: boolean
}

export function generateEmployees(count: number): Employee[] {
  const rows: Employee[] = []
  const startYear = 2010

  for (let i = 0; i < count; i++) {
    const firstName = FIRST_NAMES[seeded(i, FIRST_NAMES.length)]
    const lastName = LAST_NAMES[seeded(i, LAST_NAMES.length, 1)]
    const department = DEPARTMENTS[seeded(i, DEPARTMENTS.length, 2)]
    const role = ROLES[seeded(i, ROLES.length, 3)]
    const country = COUNTRIES[seeded(i, COUNTRIES.length, 4)]
    const city = CITIES[country][seeded(i, CITIES[country].length, 5)]
    const salary = Math.round(seededFloat(i, 45000, 220000) / 1000) * 1000
    const year = startYear + seeded(i, 14, 6)
    const month = 1 + seeded(i, 12, 7)
    const day = 1 + seeded(i, 28, 8)
    const startDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const yearsExperience = seeded(i, 25, 9)
    const performanceScore = Math.round(seededFloat(i, 1, 5, 10) * 10) / 10
    const status = STATUSES[seeded(i, STATUSES.length, 11)]
    const projects = seeded(i, 12, 12) + 1

    rows.push({
      id: i + 1,
      firstName,
      lastName,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@company.io`,
      department,
      role,
      salary,
      country,
      city,
      startDate,
      yearsExperience,
      performanceScore,
      isActive: status === 'Active',
      status,
      projects,
    })
  }
  return rows
}
