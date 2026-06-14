// CDM Dance CRM mock data - frontend only
// All data will eventually sync with Google Sheets + Google Calendar

export const STYLES = [
  'Salsa', 'Bachata', 'Cha-Cha', 'Waltz', 'Foxtrot', 'Tango', 'Quickstep', 'Wedding First Dance', 'Rumba', 'Merengue'
];

export const PACKAGES = [
  { id: 'pkg-4', name: '4 Lessons Package', lessons: 4, price: 320, perLesson: 80 },
  { id: 'pkg-8', name: '8 Lessons Package', lessons: 8, price: 600, perLesson: 75 },
  { id: 'pkg-12', name: '12 Lessons Package', lessons: 12, price: 840, perLesson: 70 },
  { id: 'pkg-wed', name: 'Wedding Package (6 Lessons)', lessons: 6, price: 540, perLesson: 90 },
  { id: 'pkg-single', name: 'Single Lesson', lessons: 1, price: 95, perLesson: 95 },
];

export const STUDENTS = [
  {
    id: 's1', name: 'Sarah Thompson', email: 'sarah.t@email.com', phone: '(727) 555-0142',
    level: 'Intermediate', primaryStyle: 'Wedding First Dance', joinDate: '2025-04-15',
    lessonsRemaining: 3, lessonsCompleted: 5, balance: 0, status: 'Active',
    notes: 'Wedding 8/22. Prefers evening lessons.', package: 'Wedding Package (6 Lessons)'
  },
  {
    id: 's2', name: 'Mike Henderson', email: 'mike.h@email.com', phone: '(813) 555-0198',
    level: 'Beginner', primaryStyle: 'Salsa', joinDate: '2025-06-02',
    lessonsRemaining: 6, lessonsCompleted: 2, balance: 0, status: 'Active',
    notes: 'Wants to learn for vacation in October.', package: '8 Lessons Package'
  },
  {
    id: 's3', name: 'Jennifer Lopez', email: 'jenn.l@email.com', phone: '(727) 555-0177',
    level: 'Advanced', primaryStyle: 'Bachata', joinDate: '2024-09-12',
    lessonsRemaining: 2, lessonsCompleted: 22, balance: 75, status: 'Active',
    notes: 'Long-term student. Likes weekends.', package: '4 Lessons Package'
  },
  {
    id: 's4', name: 'David Rodriguez', email: 'd.rodriguez@email.com', phone: '(813) 555-0203',
    level: 'Beginner', primaryStyle: 'Waltz', joinDate: '2025-05-20',
    lessonsRemaining: 0, lessonsCompleted: 4, balance: 0, status: 'Inactive',
    notes: 'Completed first package. Considering renewal.', package: '4 Lessons Package'
  },
  {
    id: 's5', name: 'Amanda & Chris Walker', email: 'walkers@email.com', phone: '(727) 555-0119',
    level: 'Beginner', primaryStyle: 'Wedding First Dance', joinDate: '2025-07-01',
    lessonsRemaining: 6, lessonsCompleted: 0, balance: 0, status: 'Active',
    notes: 'Wedding 9/14. Song: Perfect by Ed Sheeran.', package: 'Wedding Package (6 Lessons)'
  },
  {
    id: 's6', name: 'Robert Chen', email: 'r.chen@email.com', phone: '(813) 555-0265',
    level: 'Intermediate', primaryStyle: 'Tango', joinDate: '2025-03-08',
    lessonsRemaining: 4, lessonsCompleted: 10, balance: 0, status: 'Active',
    notes: 'Travels often. Schedule 2 weeks ahead.', package: '8 Lessons Package'
  },
  {
    id: 's7', name: 'Nicole Patel', email: 'n.patel@email.com', phone: '(727) 555-0134',
    level: 'Advanced', primaryStyle: 'Cha-Cha', joinDate: '2024-11-22',
    lessonsRemaining: 8, lessonsCompleted: 18, balance: 0, status: 'Active',
    notes: 'Competition prep for fall showcase.', package: '12 Lessons Package'
  },
  {
    id: 's8', name: 'James Wilson', email: 'james.w@email.com', phone: '(813) 555-0287',
    level: 'Beginner', primaryStyle: 'Foxtrot', joinDate: '2025-06-28',
    lessonsRemaining: 5, lessonsCompleted: 3, balance: 50, status: 'Active',
    notes: 'Anniversary surprise for wife.', package: '8 Lessons Package'
  },
];

// Helper to make a date offset from today
const todayISO = () => new Date().toISOString().slice(0, 10);
const dateOffset = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

export const LESSONS = [
  // Past completed
  { id: 'l1', studentId: 's1', studentName: 'Sarah Thompson', date: dateOffset(-3), time: '18:00', style: 'Wedding First Dance', location: 'Client Home - Tampa', status: 'Completed', notes: 'Practiced spin sequence', price: 90, gcalEventId: 'gc_evt_001' },
  { id: 'l2', studentId: 's2', studentName: 'Mike Henderson', date: dateOffset(-5), time: '19:30', style: 'Salsa', location: 'Studio - St Pete', status: 'Completed', notes: 'Basic step + cross body', price: 75, gcalEventId: 'gc_evt_002' },
  { id: 'l3', studentId: 's3', studentName: 'Jennifer Lopez', date: dateOffset(-7), time: '11:00', style: 'Bachata', location: 'Studio - St Pete', status: 'Completed', notes: 'Sensual variations', price: 80, gcalEventId: 'gc_evt_003' },
  // Upcoming
  { id: 'l4', studentId: 's1', studentName: 'Sarah Thompson', date: dateOffset(1), time: '18:00', style: 'Wedding First Dance', location: 'Client Home - Tampa', status: 'Scheduled', notes: 'Final run-through', price: 90, gcalEventId: 'gc_evt_004' },
  { id: 'l5', studentId: 's5', studentName: 'Amanda & Chris Walker', date: dateOffset(2), time: '17:00', style: 'Wedding First Dance', location: 'Client Home - Clearwater', status: 'Scheduled', notes: 'First lesson - intro', price: 90, gcalEventId: 'gc_evt_005' },
  { id: 'l6', studentId: 's2', studentName: 'Mike Henderson', date: dateOffset(3), time: '19:30', style: 'Salsa', location: 'Studio - St Pete', status: 'Scheduled', notes: '', price: 75 },
  { id: 'l7', studentId: 's7', studentName: 'Nicole Patel', date: dateOffset(4), time: '15:00', style: 'Cha-Cha', location: 'Studio - Tampa', status: 'Scheduled', notes: 'Routine choreography', price: 70 },
  { id: 'l8', studentId: 's1', studentName: 'Sarah Thompson', date: dateOffset(5), time: '18:00', style: 'Wedding First Dance', location: 'Client Home - Tampa', status: 'Scheduled', notes: '', price: 90 },
  { id: 'l9', studentId: 's6', studentName: 'Robert Chen', date: dateOffset(6), time: '20:00', style: 'Tango', location: 'Studio - Tampa', status: 'Scheduled', notes: '', price: 75 },
  { id: 'l10', studentId: 's5', studentName: 'Amanda & Chris Walker', date: dateOffset(8), time: '17:00', style: 'Wedding First Dance', location: 'Client Home - Clearwater', status: 'Scheduled', notes: '', price: 90 },
  { id: 'l11', studentId: 's8', studentName: 'James Wilson', date: dateOffset(9), time: '18:30', style: 'Foxtrot', location: 'Studio - St Pete', status: 'Scheduled', notes: '', price: 75 },
  { id: 'l12', studentId: 's2', studentName: 'Mike Henderson', date: dateOffset(10), time: '19:30', style: 'Salsa', location: 'Studio - St Pete', status: 'Scheduled', notes: '', price: 75 },
  { id: 'l13', studentId: 's7', studentName: 'Nicole Patel', date: dateOffset(11), time: '15:00', style: 'Cha-Cha', location: 'Studio - Tampa', status: 'Scheduled', notes: '', price: 70 },
  { id: 'l14', studentId: 's3', studentName: 'Jennifer Lopez', date: dateOffset(12), time: '11:00', style: 'Bachata', location: 'Studio - St Pete', status: 'Scheduled', notes: '', price: 80 },
  { id: 'l15', studentId: 's1', studentName: 'Sarah Thompson', date: dateOffset(14), time: '18:00', style: 'Wedding First Dance', location: 'Client Home - Tampa', status: 'Scheduled', notes: '', price: 90 },
  { id: 'l16', studentId: 's6', studentName: 'Robert Chen', date: dateOffset(16), time: '20:00', style: 'Tango', location: 'Studio - Tampa', status: 'Scheduled', notes: '', price: 75 },
  { id: 'l17', studentId: 's5', studentName: 'Amanda & Chris Walker', date: dateOffset(17), time: '17:00', style: 'Wedding First Dance', location: 'Client Home - Clearwater', status: 'Scheduled', notes: '', price: 90 },
  { id: 'l18', studentId: 's7', studentName: 'Nicole Patel', date: dateOffset(20), time: '15:00', style: 'Cha-Cha', location: 'Studio - Tampa', status: 'Scheduled', notes: '', price: 70 },
  { id: 'l19', studentId: 's8', studentName: 'James Wilson', date: dateOffset(22), time: '18:30', style: 'Foxtrot', location: 'Studio - St Pete', status: 'Scheduled', notes: '', price: 75 },
  { id: 'l20', studentId: 's2', studentName: 'Mike Henderson', date: dateOffset(24), time: '19:30', style: 'Salsa', location: 'Studio - St Pete', status: 'Scheduled', notes: '', price: 75 },
  { id: 'l21', studentId: 's1', studentName: 'Sarah Thompson', date: dateOffset(28), time: '18:00', style: 'Wedding First Dance', location: 'Client Home - Tampa', status: 'Scheduled', notes: '', price: 90 },
  { id: 'l22', studentId: 's7', studentName: 'Nicole Patel', date: dateOffset(33), time: '15:00', style: 'Cha-Cha', location: 'Studio - Tampa', status: 'Scheduled', notes: '', price: 70 },
];

export const HOSTINGS = [
  { id: 'h1', date: dateOffset(-12), location: 'Centro Asturiano - Tampa', names: 'Mandy, Nair, Arleen', income: 240, notes: 'Latin night', gcalEventId: 'gc_evt_h01' },
  { id: 'h2', date: dateOffset(-5), location: 'The Cuban Club - Ybor', names: 'Sarah, Mike, Jenn', income: 320, notes: 'Wedding showcase', gcalEventId: 'gc_evt_h02' },
  { id: 'h3', date: dateOffset(7), location: 'Centro Asturiano - Tampa', names: 'Nicole, Robert, Amanda', income: 280, notes: 'Bachata social', gcalEventId: 'gc_evt_h03' },
  { id: 'h4', date: dateOffset(15), location: 'The Cuban Club - Ybor', names: 'Sarah, James, Mike', income: 350, notes: 'Anniversary event', gcalEventId: 'gc_evt_h04' },
  { id: 'h5', date: dateOffset(21), location: 'Hilton Tampa - Downtown', names: 'Walker Wedding Party', income: 600, notes: 'Wedding reception', gcalEventId: 'gc_evt_h05' },
  { id: 'h6', date: dateOffset(30), location: 'Centro Asturiano - Tampa', names: 'Jenn, Nicole, Robert', income: 280, notes: 'Salsa social', gcalEventId: 'gc_evt_h06' },
  { id: 'h7', date: dateOffset(38), location: 'St Pete Pier', names: 'Summer showcase team', income: 450, notes: 'Outdoor event', gcalEventId: 'gc_evt_h07' },
  { id: 'h8', date: dateOffset(45), location: 'Hilton Clearwater', names: 'Patel Anniversary', income: 500, notes: '25th anniversary', gcalEventId: 'gc_evt_h08' },
];

// External Google Calendar events (not lessons / not hostings) for sync demo
export const GCAL_EXTERNAL = [
  { id: 'gc1', summary: 'Studio Maintenance', date: dateOffset(2), time: '10:00', source: 'gcal' },
  { id: 'gc2', summary: 'Personal: Doctor', date: dateOffset(13), time: '09:30', source: 'gcal' },
  { id: 'gc3', summary: 'Dance Convention', date: dateOffset(19), time: '08:00', source: 'gcal' },
];
